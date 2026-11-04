import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { getSupabaseAdmin, BUCKET_LIBROS } from "@/lib/supabase-admin";
import { LIMITES_LIBRO, TIPOS_PORTADA, type TipoArchivoLibro } from "@/lib/archivosLibro";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Paso 1 de la subida de archivos de libro (PDF o portada).
//
// Antes el archivo viajaba entero dentro de esta petición (multipart). Vercel
// corta el cuerpo de una función a 4,5 MB y responde con texto plano
// "Request Entity Too Large" → el formulario fallaba al hacer res.json()
// ("Unexpected token 'R'..."). Ahora esta ruta solo recibe metadatos (JSON
// pequeño) y devuelve una URL firmada para que el navegador suba el archivo
// DIRECTO a Supabase Storage, igual que los cómics. El archivo nunca pasa por
// Vercel. La verificación del contenido real (magic bytes) se hace después en
// /api/admin/libros/upload/confirmar.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const body = (await req.json().catch(() => null)) as
    | { tipo?: string; nombre?: string; contentType?: string; tamano?: number }
    | null;
  if (!body) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const { tipo, nombre, contentType, tamano } = body;
  if (!tipo || !nombre || !contentType || typeof tamano !== "number") {
    return NextResponse.json({ error: "Faltan campos: tipo, nombre, contentType, tamano" }, { status: 400 });
  }
  if (tipo !== "pdf" && tipo !== "portada") {
    return NextResponse.json({ error: "tipo inválido — usa 'pdf' o 'portada'" }, { status: 400 });
  }
  const t = tipo as TipoArchivoLibro;

  if (t === "pdf" && contentType !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 422 });
  }
  if (t === "portada" && !TIPOS_PORTADA.includes(contentType)) {
    return NextResponse.json({ error: "La portada debe ser una imagen (JPG, PNG, WebP)" }, { status: 422 });
  }
  if (tamano <= 0 || tamano > LIMITES_LIBRO[t].bytes) {
    return NextResponse.json(
      { error: `El archivo no puede superar ${LIMITES_LIBRO[t].etiqueta}` },
      { status: 413 },
    );
  }

  const sb = getSupabaseAdmin();
  const carpeta = t === "pdf" ? "pdfs" : "portadas";
  const nombreSeguro = nombre.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-120);
  const ruta = `${carpeta}/${Date.now()}-${nombreSeguro}`;

  const { data, error } = await sb.storage.from(BUCKET_LIBROS).createSignedUploadUrl(ruta);
  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo crear la URL de subida: " + (error?.message ?? "error desconocido") },
      { status: 500 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl, ruta });
}
