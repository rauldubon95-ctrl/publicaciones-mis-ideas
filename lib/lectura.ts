// Tiempo de lectura calculado con el TEXTO completo, no con el resumen.
// Antes las tarjetas lo estimaban con el resumen: un artículo de ~60 pantallas
// figuraba como "3 min".
import { prisma } from "@/lib/prisma";

// Español académico: ~6 caracteres por palabra (incluye espacios y marcas de
// formato) y ~200 palabras por minuto de lectura atenta.
const CARACTERES_POR_PALABRA = 6;
const PALABRAS_POR_MINUTO = 200;

// Las imágenes incrustadas (![alt](data:image/...;base64,...)) no se leen:
// en un artículo medido ocupaban 410.000 de 532.000 caracteres.
const IMAGEN_MARKDOWN = /!\[[^\]]*\]\([^)]*\)/g;

export function caracteresLegibles(markdown: string): number {
  return markdown.replace(IMAGEN_MARKDOWN, "").length;
}

export function minutosDeTexto(caracteres: number): number {
  return Math.max(1, Math.round(caracteres / CARACTERES_POR_PALABRA / PALABRAS_POR_MINUTO));
}

/** "8 min", "1 h 25 min" */
export function formatoMinutos(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h} h ${resto} min` : `${h} h`;
}

/** Minutos de lectura por slug, con una sola consulta (sin traer el texto). */
export async function minutosPorSlug(slugs: string[]): Promise<Record<string, number>> {
  if (slugs.length === 0) return {};
  const filas = await prisma.$queryRaw<{ slug: string; n: number }[]>`
    SELECT slug, char_length(regexp_replace(contenido, '!\\[[^]]*\\]\\([^)]*\\)', '', 'g'))::int AS n
    FROM "Publicacion"
    WHERE slug = ANY(${slugs})
  `;
  return Object.fromEntries(filas.map((f) => [f.slug, minutosDeTexto(f.n)]));
}
