import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { getSupabaseAdmin, BUCKET_COMICS } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tipos permitidos para subida de "página" de cómic. Además de imágenes,
// aceptamos application/pdf: cuando el admin sube un PDF, el frontend detecta
// la extensión .pdf y renderiza el visor PdfReader integrado en vez de la
// galería tradicional. Esto permite publicar cómics/presentaciones/materiales
// completos como un único archivo sin tener que dividirlos en imágenes.
const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// Genera una URL firmada para que el navegador suba directamente a Supabase.
// El archivo nunca pasa por Vercel, por eso no hay límite de tamaño.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();
  const { id } = await params;

  const { nombre, tipo } = await req.json() as { nombre?: string; tipo?: string };

  if (!nombre || !tipo) {
    return NextResponse.json({ error: "Se requiere nombre y tipo de archivo" }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo no permitido — usa JPEG, PNG, WebP o GIF" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const ruta = `${id}/${Date.now()}-${nombre.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

  const { data, error } = await sb.storage
    .from(BUCKET_COMICS)
    .createSignedUploadUrl(ruta);

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo crear la URL de subida: " + (error?.message ?? "error desconocido") }, { status: 500 });
  }

  const { data: { publicUrl } } = sb.storage.from(BUCKET_COMICS).getPublicUrl(ruta);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    ruta,
    publicUrl,
  });
}
