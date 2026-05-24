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
