// ─────────────────────────────────────────────────────────────
// Presentación de fuentes (sesión 39)
// - limpiarTitulo: quita basura de los títulos crudos (a menudo el
//   nombre de archivo del PDF de origen: "463972900 ... pdf").
// - etiquetaFuente: etiqueta con la que un documento entra al prompt
//   del modelo. NO incluye el id interno de D1 (antes "[DOC 531: ...]")
//   para que, si el modelo copia la etiqueta, copie un título legible.
// - quitarEtiquetasInternas: saca del texto de salida cualquier etiqueta
//   interna que el modelo haya filtrado igualmente.
// ─────────────────────────────────────────────────────────────

// Conservador a propósito: solo remueve lo claramente basura (IDs numéricos
// largos al inicio, extensión de archivo al final, markdown), nunca reescribe
// ni recorta el contenido real del título.
export function limpiarTitulo(titulo: string): string {
  if (!titulo) return "";
  let t = titulo.trim();
  t = t.replace(/\*+/g, " ");                                 // markdown **negrita**
  t = t.replace(/[\s._-]*\.?\b(pdf|docx?|txt|epub)\b\.?\s*$/i, ""); // extensión al final
  t = t.replace(/^\d{4,}[\s._-]*/, "");                       // ID numérico largo al inicio
  t = t.replace(/\s+/g, " ").trim();
  return t.length >= 3 ? t : titulo.trim();                   // fallback si quedó vacío
}

// Etiqueta de fuente para el prompt del modelo (sin id interno de D1).
export function etiquetaFuente(titulo: string): string {
  return `[Fuente: ${limpiarTitulo(titulo)}]`;
}

// Limpia el texto de salida del modelo de etiquetas internas filtradas:
// "[DOC 531: ...]", "[DOC 12]", "[INICIO_DOCUMENTO ...]", "[FIN_DOCUMENTO]".
export function quitarEtiquetasInternas(texto: string): string {
  return texto
    .replace(/\[DOC\s+\d+\s*:[^\]]*\]/gi, "")
    .replace(/\[DOC\s+\d+\]/gi, "")
    .replace(/\[\/?(?:INICIO|FIN)_DOCUMENTO[^\]]*\]/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
