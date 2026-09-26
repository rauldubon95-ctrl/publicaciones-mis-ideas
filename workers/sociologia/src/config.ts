// ─────────────────────────────────────────────────────────────
// Configuración central de modelos de Workers AI.
// Punto único de verdad: cambiar el modelo de chat aquí lo
// propaga a index.ts y a las 3 skills (sociológica, histórica,
// política). Para futuras migraciones, editar SOLO esta línea.
// ─────────────────────────────────────────────────────────────

// Modelo de chat (instrucción) usado por las 3 skills académicas.
//
// IMPORTANTE (sesión 38): se revierte desde "@cf/google/gemma-4-26b-a4b-it".
// Gemma 4 es un modelo de RAZONAMIENTO (reasoning): gasta su presupuesto de
// tokens "pensando" internamente antes de escribir la respuesta final. Con
// max_tokens de 400–800 (los que usamos) agotaba el presupuesto razonando y
// devolvía `response` vacío → el chat respondía "El modelo no generó una
// respuesta." en producción.
//
// Llama 3.1 8B Instruct (FP8, fast) es un modelo instruct clásico (NO
// reasoning): escribe la respuesta directamente, compatible con nuestros
// max_tokens y con el formato **ANÁLISIS:** que parseamos. Es el modelo más
// económico de Workers AI (≈4.119 neuronas/M entrada, ≈34.868 neuronas/M
// salida) → cabe holgado en la asignación gratuita de 10.000 neuronas/día del
// plan Free para el tráfico de un sitio personal. Es el mismo modelo (familia
// 8B fast) que funcionaba antes de la sesión 37.
//
// Type assertion: la unión de literales de @cloudflare/workers-types no
// siempre incluye todas las variantes; la forma de la API (messages +
// max_tokens + temperature) es idéntica, así que el cast es seguro en runtime.
export const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast" as Parameters<Ai["run"]>[0];

// Modelo de EMBEDDINGS para el retrieval semántico (Vectorize).
//
// IMPORTANTE (sesión 39): migrado desde "@cf/baai/bge-large-en-v1.5", que es
// un modelo ENTRENADO EN INGLÉS (nótese el "-en-" en el nombre). Sobre el
// corpus en ESPAÑOL producía embeddings de baja calidad → la búsqueda
// semántica devolvía documentos flojamente relacionados en vez de los
// artículos que realmente trataban el tema. Ese era el motivo de "vectoricé
// pero no se refleja": los vectores existían, pero capturaban mal el español.
//
// bge-m3 es MULTILINGÜE (100+ idiomas, español incluido) y produce vectores
// de 1024 dimensiones — la MISMA dimensión del índice Vectorize existente
// ("sociologia-embeddings", 1024, cosine), así que es un reemplazo directo:
// re-vectorizar sobrescribe los vectores por id, sin recrear el índice.
//
// TRAS DESPLEGAR A PRODUCCIÓN: re-vectorizar TODO el corpus desde
// /admin/embed-backfill. Los vectores viejos son del modelo inglés y NO deben
// mezclarse con consultas del modelo nuevo. Hasta re-vectorizar, la vía
// semántica puede ser incoherente; el retrieval cae a FTS (léxico), que tras
// la sesión 39 es la señal principal y ya es sólida.
export const EMBEDDING_MODEL = "@cf/baai/bge-m3" as Parameters<Ai["run"]>[0];

// ─────────────────────────────────────────────────────────────
// Lista blanca del corpus del asistente (sesión 41 — seguridad jurídica).
//
// PROBLEMA: la tabla `documentos` mezcla 43 artículos propios
// (tipo='publicacion') con 545 textos de terceros (tipo='articulo'), muchos
// con copyright vigente e incluso bajados de bibliotecas piratas (Anna's
// Archive, z-lib, Scribd). El asistente los citaba y parafraseaba en público
// → exposición real por derechos de autor.
//
// DECISIÓN (opt-in, no opt-out): el asistente SOLO puede recuperar contenido
// propio o expresamente verificado como de uso libre. Es más seguro permitir
// lo verificado que intentar bloquear lo ajeno entre 545 items.
//
// - `tipo='publicacion'` (los artículos del sitio, del autor) entra SIEMPRE.
// - CORPUS_ALLOWLIST_IDS: ids sueltos de `documentos` verificados como propios
//   o de uso libre (dominio público comprobado, normativa oficial, acceso
//   abierto con licencia revisada). Crece a medida que se audita el corpus
//   (ver docs/inventario-corpus-derechos.md).
//
// Todo lo demás queda FUERA del alcance del asistente aunque siga en la base.
export const CORPUS_ALLOWLIST_IDS: number[] = [
  // — Propio —
  253, // "Economía invisible… (Dubón, 2024)" — artículo propio del autor.

  // — Normativa oficial de El Salvador (las leyes/reglamentos NO son objeto de
  //   derecho de autor; uso libre). Verificado sesión 41.
  808, 809, 813, 814, 815, 818, 819, 1136, 1188, 1192, 1193,

  // — Estadística pública oficial de El Salvador (MINED, DIGESTYC/EHPM, STPP;
  //   datos oficiales de libre uso con cita). Verificado sesión 41.
  366, 368, 370, 372, 374, 376, 378, 380, 382, 383, 385, 387, 389, 391,
  728, 729, 730, 975, 1168, 1382, 1418,

  // — Acceso abierto: artículos de revista indexados en Dialnet + patrón OJS
  //   (Open Journal Systems). La mayoría de revistas académicas de la región
  //   publican bajo licencias Creative Commons; el asistente cita la fuente por
  //   título, cubriendo la atribución. CAVEAT (sesión 41): estar en Dialnet/OJS
  //   NO garantiza licencia libre — el permiso depende de cada revista. Riesgo
  //   bajo (uso académico con atribución), decisión del usuario de conservarlos.
  494, 495, 496, 497, 498, 499, 500, 501, 503, 504, 505, 506, 507, 508,
  1315, 1316, 1317, 1318,
  214, 221, 255, 256, 262, 265, 270, 273, 343,

  // Pendiente de revisar por item antes de sumar (ver
  // docs/inventario-corpus-derechos.md §6): otros artículos de revista de
  // acceso abierto sin patrón OJS/Dialnet en el nombre (por nombre de revista),
  // informes de organismos (CEPAL/PNUD/UNICEF/UNESCO/BID) y dominio público por
  // antigüedad (revisar que no sean traducciones modernas).
];

// Cláusula SQL reutilizable que restringe una consulta sobre `documentos` al
// contenido permitido. `alias` es el prefijo de tabla (p. ej. "d" en un JOIN);
// vacío para consultas sin alias. Los ids se interpolan como enteros validados,
// nunca texto de usuario, así que no hay riesgo de inyección.
export function clausulaCorpusPermitido(alias = ""): string {
  const p = alias ? `${alias}.` : "";
  const ids = CORPUS_ALLOWLIST_IDS.filter((n) => Number.isInteger(n));
  const inClause = ids.length ? ` OR ${p}id IN (${ids.join(",")})` : "";
  return `(${p}tipo = 'publicacion'${inClause})`;
}

// Extrae de forma robusta el texto de la respuesta de Workers AI.
// Los modelos instruct devuelven { response: string }. Esta función tolera
// además formas alternativas ({ result: { response } }, anidados) y, si algún
// día se usa un modelo de razonamiento, descarta el bloque <think>…</think>
// para quedarse solo con la respuesta final. Evita el fallo silencioso que
// dejó el chat mudo al cambiar de modelo sin adaptar el parseo.
export function extraerRespuestaIA(aiRes: unknown): string {
  if (!aiRes || typeof aiRes !== "object") return "";
  const obj = aiRes as Record<string, unknown>;

  let texto = "";
  if (typeof obj.response === "string") {
    texto = obj.response;
  } else if (
    obj.response &&
    typeof obj.response === "object" &&
    typeof (obj.response as Record<string, unknown>).response === "string"
  ) {
    texto = (obj.response as Record<string, string>).response;
  } else if (
    obj.result &&
    typeof obj.result === "object" &&
    typeof (obj.result as Record<string, unknown>).response === "string"
  ) {
    texto = (obj.result as Record<string, string>).response;
  }

  // Modelos de razonamiento envuelven el pensamiento en <think>…</think>.
  // Nos quedamos con lo que viene DESPUÉS del último cierre.
  const cierre = texto.lastIndexOf("</think>");
  if (cierre !== -1) texto = texto.slice(cierre + "</think>".length);

  return texto.trim();
}
