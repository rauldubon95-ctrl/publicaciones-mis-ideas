import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { getSupabaseAdmin, BUCKET_LIBROS } from "@/lib/supabase-admin";
import { firmaValida, LIMITES_LIBRO, type TipoArchivoLibro } from "@/lib/archivosLibro";
import { fetchConTimeout } from "@/lib/timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Paso 3 de la subida: el navegador ya subió el archivo directo a Supabase.
// Aquí verificamos que el contenido real coincide con lo declarado (magic
// bytes + tamaño) leyendo solo los primeros bytes. Si no es válido, se borra
// del bucket y se rechaza. Si lo es, devolvemos la URL pública.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = (await req.json().catch(() => null)) as { tipo?: string; ruta?: string } | null;
  const tipo = body?.tipo;
  const ruta = body?.ruta;
  if ((tipo !== "pdf" && tipo !== "portada") || !ruta) {
    return NextResponse.json({ error: "Faltan campos: tipo, ruta" }, { status: 400 });
  }
  const t = tipo as TipoArchivoLibro;
  const carpeta = t === "pdf" ? "pdfs" : "portadas";
  // La ruta la generó /upload: solo aceptamos ese formato exacto.
  if (!new RegExp(`^${carpeta}/\\d+-[a-zA-Z0-9.\\-_]{1,120}$`).test(ruta)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: { publicUrl } } = sb.storage.from(BUCKET_LIBROS).getPublicUrl(ruta);

  const rechazar = async (msg: string) => {
    await sb.storage.from(BUCKET_LIBROS).remove([ruta]).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 422 });
  };

  let cabecera: Uint8Array;
  let tamanoTotal: number | null = null;
  try {
    const res = await fetchConTimeout(publicUrl, { headers: { Range: "bytes=0-15" }, cache: "no-store" }, 10_000);
    if (!res.ok) {
      return NextResponse.json({ error: "No se encontró el archivo subido" }, { status: 404 });
    }
    cabecera = new Uint8Array(await res.arrayBuffer()).slice(0, 16);
    // Content-Range: bytes 0-15/123456  → tamaño real del archivo
    const total = res.headers.get("content-range")?.split("/")[1];
    if (total && /^\d+$/.test(total)) tamanoTotal = Number(total);
  } catch {
    return NextResponse.json({ error: "No se pudo verificar el archivo subido" }, { status: 502 });
  }

  if (!firmaValida(t, cabecera)) {
    return rechazar(t === "pdf" ? "El archivo no es un PDF válido." : "La portada no es una imagen JPG, PNG o WebP válida.");
  }
  if (tamanoTotal !== null && tamanoTotal > LIMITES_LIBRO[t].bytes) {
    return rechazar(`El archivo no puede superar ${LIMITES_LIBRO[t].etiqueta}`);
  }

  return NextResponse.json({ url: publicUrl });
}
