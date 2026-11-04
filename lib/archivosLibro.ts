// Reglas compartidas para los archivos de un libro (PDF + portada).
// Las usan las rutas /api/admin/libros/upload y /upload/confirmar.

export type TipoArchivoLibro = "pdf" | "portada";

export const LIMITES_LIBRO: Record<TipoArchivoLibro, { bytes: number; etiqueta: string }> = {
  pdf:     { bytes: 50 * 1024 * 1024, etiqueta: "50 MB" },
  portada: { bytes:  5 * 1024 * 1024, etiqueta: "5 MB" },
};

export const TIPOS_PORTADA = ["image/jpeg", "image/png", "image/webp"];

/** Comprueba la firma binaria real del archivo (el MIME del navegador es manipulable). */
export function firmaValida(tipo: TipoArchivoLibro, b: Uint8Array): boolean {
  if (tipo === "pdf") {
    // %PDF
    return b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
  }
  if (b.length < 12) return false;
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp =
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;  // WEBP
  return jpeg || png || webp;
}
