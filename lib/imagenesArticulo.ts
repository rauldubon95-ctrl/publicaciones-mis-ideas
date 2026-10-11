import { randomUUID } from "crypto";
import { getSupabaseAdmin, BUCKET_COMICS } from "@/lib/supabase-admin";

// ─── Imágenes incrustadas en artículos importados desde Word ────────────────
// Solo formatos raster que el navegador muestra sin ejecutar nada. SVG queda
// fuera a propósito: servido desde el bucket público podría llevar <script>.
// EMF/WMF (típicos de diagramas viejos de Office) no los muestra ningún navegador.
const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
type TipoImagen = (typeof TIPOS_PERMITIDOS)[number];

const EXTENSION: Record<TipoImagen, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
export const MAX_IMAGENES_DOCX = 30;

// Detecta el tipo real por magic bytes (no se confía en el content-type del docx).
export function detectarTipoImagen(buf: Buffer): TipoImagen | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 6 && buf.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// Sube la imagen al bucket público `comics` bajo `articulos/` y devuelve su URL.
// El host de Supabase ya está permitido en `img-src` del CSP (proxy.ts).
export async function subirImagenArticulo(buf: Buffer, tipo: TipoImagen): Promise<string> {
  const sb = getSupabaseAdmin();
  const ruta = `articulos/${Date.now()}-${randomUUID()}.${EXTENSION[tipo]}`;
  const { error } = await sb.storage
    .from(BUCKET_COMICS)
    .upload(ruta, buf, { contentType: tipo, upsert: false });
  if (error) throw new Error(`Error al subir imagen: ${error.message}`);
  return sb.storage.from(BUCKET_COMICS).getPublicUrl(ruta).data.publicUrl;
}
