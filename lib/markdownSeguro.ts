import { defaultUrlTransform } from "react-markdown";

// urlTransform para react-markdown. El de por defecto borra toda URL `data:`,
// por eso las imágenes que el importador incrustaba en base64 no se veían.
// Aquí se permite `data:` SOLO en `src` de <img> y SOLO para raster en base64;
// todo lo demás pasa por el filtro estándar (bloquea javascript:, etc.).
const DATA_IMG_RASTER = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

export function urlTransformArticulo(url: string, key: string, node: { tagName?: string }): string {
  if (key === "src" && node.tagName === "img" && DATA_IMG_RASTER.test(url)) return url;
  return defaultUrlTransform(url);
}

// Quita las imágenes del Markdown dejando solo su texto alternativo. Se usa al
// mandar el artículo al índice del asistente IA, que solo trabaja con texto:
// evita meter URLs o cientos de KB de base64 en el corpus.
export function quitarImagenesMarkdown(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
}
