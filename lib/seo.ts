export const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://rauldubon.org"
).replace(/\/$/, "");

export const SITE_NAME = "Raúl Dubón";
export const DEFAULT_DESCRIPTION =
  "Espacio de divulgación académica, proyectos e ideas de Raúl Dubón";

export const OG_IMAGE_FALLBACK = "/og-image-rauldubon.png";

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

/**
 * Devuelve el arreglo `images` para openGraph/twitter. Si la entidad tiene su
 * propia portada la usa; si no, cae al og:image del sitio. Garantiza que TODA
 * página dinámica emita una imagen de preview en redes sociales (antes los
 * artículos/recursos/cómics sin portada no generaban ninguna).
 */
export function ogImagenes(portadaUrl?: string | null) {
  const url = portadaUrl || OG_IMAGE_FALLBACK;
  return [{ url, width: 1200, height: 630, alt: SITE_NAME }];
}

/**
 * JSON-LD BreadcrumbList a partir de una ruta de migas {name, path}. Coincide
 * con el breadcrumb visible de cada página. Ayuda a Google a entender la
 * jerarquía y puede mostrar migas en los resultados.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: canonicalUrl(it.path),
    })),
  };
}
