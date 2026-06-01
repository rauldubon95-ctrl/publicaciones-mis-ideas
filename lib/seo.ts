export const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org"
).replace(/\/$/, "");

export const SITE_NAME = "Raúl Dubón";
export const DEFAULT_DESCRIPTION =
  "Espacio de divulgación académica, proyectos e ideas de Raúl Dubón";

export function canonicalUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${clean}`;
}

export function canonicalWithPage(path: string, pagina: number): string {
  const base = canonicalUrl(path);
  return pagina > 1 ? `${base}?pagina=${pagina}` : base;
}

export function recortarDescripcion(
  texto: string | null | undefined,
  max = 160
): string {
  if (!texto) return DEFAULT_DESCRIPTION;
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max - 1).trimEnd() + "…";
}
