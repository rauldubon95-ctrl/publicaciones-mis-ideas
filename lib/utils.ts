import slugify from "slugify";

export function toSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, locale: "es" });
}

export function formatFecha(date: Date | string): string {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function truncar(texto: string, max = 160): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max).trimEnd() + "…";
}
