import { createClient } from "@supabase/supabase-js";

export const BUCKET_COMICS = "comics";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function subirImagen(
  buffer: Buffer,
  nombreArchivo: string,
  tipo: string
): Promise<string> {
  const sb = getSupabaseAdmin();
  const ruta = `${Date.now()}-${nombreArchivo.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

  const { error } = await sb.storage
    .from(BUCKET_COMICS)
    .upload(ruta, buffer, { contentType: tipo, upsert: false });

  if (error) throw new Error(`Error al subir imagen: ${error.message}`);

  const { data } = sb.storage.from(BUCKET_COMICS).getPublicUrl(ruta);
  return data.publicUrl;
}

export async function eliminarImagen(url: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const base = sb.storage.from(BUCKET_COMICS).getPublicUrl("").data.publicUrl;
  const ruta = url.replace(base, "");
  if (!ruta) return;
  await sb.storage.from(BUCKET_COMICS).remove([ruta]);
}

// ─── Descarga server-side (stream gateado) ───────────────────────────────────
// Descarga un objeto del bucket usando el service role, a partir de su URL
// pública (o de su path interno). Permite que los endpoints /descargar reenvíen
// el archivo sin entregar nunca la URL pública del bucket al cliente, de modo
// que un comprador no pueda recompartir un enlace permanente. Ver H1 en
// docs/auditoria-seguridad-2026-06-02.md.
export async function descargarDesdeBucket(
  bucket: string,
  urlOrPath: string
): Promise<Blob | null> {
  const sb = getSupabaseAdmin();
  const base = sb.storage.from(bucket).getPublicUrl("").data.publicUrl;
  let ruta = urlOrPath.startsWith("http") ? urlOrPath.replace(base, "") : urlOrPath;
  ruta = ruta.split("?")[0].replace(/^\/+/, "");
  if (!ruta) return null;
  const { data, error } = await sb.storage.from(bucket).download(ruta);
  if (error || !data) return null;
  return data;
}

// ─── Bucket para libros (PDFs y portadas) ────────────────────────────────────
export const BUCKET_LIBROS = "libros";
export const BUCKET_DATOS = "datos";

export async function subirArchivoLibro(
  buffer: Buffer,
  nombreArchivo: string,
  tipo: string,
  carpeta: "pdfs" | "portadas"
): Promise<string> {
  const sb = getSupabaseAdmin();
  await sb.storage.createBucket(BUCKET_LIBROS, { public: true }).catch(() => {});
  const ruta = `${carpeta}/${Date.now()}-${nombreArchivo.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error } = await sb.storage
    .from(BUCKET_LIBROS)
    .upload(ruta, buffer, { contentType: tipo, upsert: false });
  if (error) throw new Error(`Error al subir archivo: ${error.message}`);
  const { data } = sb.storage.from(BUCKET_LIBROS).getPublicUrl(ruta);
  return data.publicUrl;
}

export async function eliminarArchivoLibro(url: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const base = sb.storage.from(BUCKET_LIBROS).getPublicUrl("").data.publicUrl;
  const ruta = url.replace(base, "");
  if (!ruta) return;
  await sb.storage.from(BUCKET_LIBROS).remove([ruta]);
}
