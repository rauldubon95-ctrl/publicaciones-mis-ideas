// ─────────────────────────────────────────────────────────────
// Retrieval: FTS5 + metadata filter, con fallback a LIKE
// ─────────────────────────────────────────────────────────────
import type { ChunkRecuperado, Env } from "./types";

const MAX_CHUNKS = 6;
const MAX_CONTENIDO_POR_CHUNK = 1800; // chars, ~450 tokens

// Normalizar query: quitar tildes opcionales, trim, lowercase
function normalizarQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita diacríticos para mejor match FTS
}

// Construir términos de búsqueda para FTS5
function termsFTS(query: string): string {
  const norm = normalizarQuery(query);
  // Tokenizar: palabras >= 3 chars, sin stopwords comunes
  const STOPWORDS = new Set([
    "que", "con", "para", "por", "los", "las", "del", "una", "uno",
    "sus", "sobre", "como", "pero", "sin", "más", "esta", "este",
    "son", "hay", "fue", "ser", "han", "the", "and", "for", "with",
    "from", "this", "that", "are", "has", "not", "can",
  ]);
  const tokens = norm
    .replace(/[^a-z0-9áéíóúüñ\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  if (tokens.length === 0) return `"${norm}"`;

  // FTS5 query: términos con OR, priorizar matches completos
  return tokens.map((t) => `"${t}"*`).join(" OR ");
}

// Retrieval principal: FTS5 primero, fallback a LIKE si FTS falla
export async function recuperarChunks(
  query: string,
  env: Env
): Promise<ChunkRecuperado[]> {
  // Intentar FTS5 primero (más rápido y relevante)
  try {
    const chunks = await recuperarConFTS(query, env);
    if (chunks.length > 0) return chunks;
  } catch {
    // FTS puede fallar si la tabla FTS no existe aún — fallback a LIKE
  }

  // Fallback: LIKE query en content (para compatibilidad con schema antiguo)
  try {
    return await recuperarConLIKE(query, env);
  } catch {
    return [];
  }
}

// Retrieval con FTS5 (D1 SQLite virtual table)
async function recuperarConFTS(
  query: string,
  env: Env
): Promise<ChunkRecuperado[]> {
  const terminos = termsFTS(query);

  const resultado = await env.DB.prepare(`
    SELECT
      dc.id,
      dc.doc_id,
      dc.content              AS contenido,
      dc.page_start           AS pagina_inicio,
      dc.section              AS seccion,
      d.title                 AS titulo_doc,
      d.author                AS autor_doc,
      d.publication_year      AS año_doc,
      bm25(doc_chunks_fts)    AS score_fts
    FROM doc_chunks_fts
    JOIN doc_chunks dc ON doc_chunks_fts.rowid = dc.rowid
    JOIN documents d ON dc.doc_id = d.id
    WHERE doc_chunks_fts MATCH ?
      AND d.status = 'indexed'
    ORDER BY bm25(doc_chunks_fts)
    LIMIT ?
  `)
    .bind(terminos, MAX_CHUNKS)
    .all<{
      id: string;
      doc_id: string;
      contenido: string;
      pagina_inicio: number | null;
      seccion: string | null;
      titulo_doc: string;
      autor_doc: string | null;
      año_doc: number | null;
      score_fts: number;
    }>();

  return (resultado.results ?? []).map((r) => ({
    id: r.id,
    doc_id: r.doc_id,
    contenido: truncarContenido(r.contenido),
    titulo_doc: r.titulo_doc,
    autor_doc: r.autor_doc ?? undefined,
    año_doc: r.año_doc ?? undefined,
    pagina_inicio: r.pagina_inicio ?? undefined,
    seccion: r.seccion ?? undefined,
    score_fts: Math.abs(r.score_fts), // bm25 devuelve negativo en SQLite
    score_final: Math.abs(r.score_fts),
  }));
}

// Retrieval con LIKE (compatibilidad con schema anterior o si FTS no existe)
async function recuperarConLIKE(
  query: string,
  env: Env
): Promise<ChunkRecuperado[]> {
  // Extraer palabras clave significativas (>= 4 chars)
  const palabras = query
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 4)
    .slice(0, 5); // máximo 5 palabras para no construir query gigante

  if (palabras.length === 0) return [];

  // Construir condiciones LIKE (una por palabra clave)
  const condiciones = palabras.map(() => "content LIKE ?").join(" OR ");
  const params = palabras.map((p) => `%${p}%`);

  // Intentar con la tabla doc_chunks nueva primero
  try {
    const resultado = await env.DB.prepare(`
      SELECT
        dc.id,
        dc.doc_id,
        dc.content        AS contenido,
        dc.page_start     AS pagina_inicio,
        dc.section        AS seccion,
        d.title           AS titulo_doc,
        d.author          AS autor_doc,
        d.publication_year AS año_doc
      FROM doc_chunks dc
      JOIN documents d ON dc.doc_id = d.id
      WHERE (${condiciones})
        AND d.status = 'indexed'
      LIMIT ?
    `)
      .bind(...params, MAX_CHUNKS)
      .all<{
        id: string;
        doc_id: string;
        contenido: string;
        pagina_inicio: number | null;
        seccion: string | null;
        titulo_doc: string;
        autor_doc: string | null;
        año_doc: number | null;
      }>();

    return (resultado.results ?? []).map((r, i) => ({
      id: r.id,
      doc_id: r.doc_id,
      contenido: truncarContenido(r.contenido),
      titulo_doc: r.titulo_doc,
      autor_doc: r.autor_doc ?? undefined,
      año_doc: r.año_doc ?? undefined,
      pagina_inicio: r.pagina_inicio ?? undefined,
      seccion: r.seccion ?? undefined,
      score_fts: 1 / (i + 1), // puntuación posicional simple
      score_final: 1 / (i + 1),
    }));
  } catch {
    // Intentar con nombre de tabla viejo como último recurso
    return recuperarSchemaLegacy(palabras, env);
  }
}

// Compatibilidad con schema antiguo (antes del refactor)
// Busca en tablas con nombres que podrían existir en la D1 actual
async function recuperarSchemaLegacy(
  palabras: string[],
  env: Env
): Promise<ChunkRecuperado[]> {
  try {
    // Detectar qué tablas existen
    const tablas = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all<{ name: string }>();
    const nombreTablas = (tablas.results ?? []).map((t) => t.name);

    // Buscar tabla de chunks con nombre variado
    const tablaChunks = nombreTablas.find(
      (n) =>
        n.includes("chunk") ||
        n.includes("documento") ||
        n.includes("pdf") ||
        n.includes("publicacion")
    );
    if (!tablaChunks) return [];

    // Detectar columna de contenido
    const columnas = await env.DB.prepare(
      `PRAGMA table_info(${tablaChunks})`
    ).all<{ name: string }>();
    const nombresColumnas = (columnas.results ?? []).map((c) => c.name);

    const colContenido = nombresColumnas.find(
      (c) => c === "content" || c === "contenido" || c === "texto" || c === "text"
    );
    const colTitulo = nombresColumnas.find(
      (c) =>
        c === "title" || c === "titulo" || c === "nombre" || c === "name"
    );

    if (!colContenido) return [];

    const condiciones = palabras
      .map(() => `${colContenido} LIKE ?`)
      .join(" OR ");
    const params = palabras.map((p) => `%${p}%`);

    const resultado = await env.DB.prepare(
      `SELECT * FROM ${tablaChunks} WHERE (${condiciones}) LIMIT ?`
    )
      .bind(...params, MAX_CHUNKS)
      .all<Record<string, unknown>>();

    return (resultado.results ?? []).map((r, i) => ({
      id: String(r.id ?? `legacy_${i}`),
      doc_id: String(r.doc_id ?? r.documento_id ?? `doc_${i}`),
      contenido: truncarContenido(String(r[colContenido] ?? "")),
      titulo_doc: colTitulo ? String(r[colTitulo] ?? "Documento") : "Documento",
      score_fts: 1 / (i + 1),
      score_final: 1 / (i + 1),
    }));
  } catch {
    return [];
  }
}

function truncarContenido(texto: string): string {
  if (texto.length <= MAX_CONTENIDO_POR_CHUNK) return texto;
  // Cortar en la última oración completa dentro del límite
  const cortado = texto.slice(0, MAX_CONTENIDO_POR_CHUNK);
  const ultimoPunto = Math.max(
    cortado.lastIndexOf(". "),
    cortado.lastIndexOf(".\n")
  );
  return ultimoPunto > MAX_CONTENIDO_POR_CHUNK * 0.7
    ? cortado.slice(0, ultimoPunto + 1)
    : cortado + "…";
}

// Calcular ratio de grounding: qué porcentaje de la respuesta está en los chunks
export function calcularGroundingRatio(
  respuesta: string,
  chunks: ChunkRecuperado[]
): number {
  if (chunks.length === 0) return 0;

  const textoDocumentos = chunks
    .map((c) => c.contenido)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const oraciones = respuesta
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  if (oraciones.length === 0) return 0.5;

  let ancladas = 0;
  for (const oracion of oraciones) {
    const palabras = oracion
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/\s+/)
      .filter((p) => p.length >= 5);
    if (palabras.length === 0) continue;

    const encontradas = palabras.filter((p) => textoDocumentos.includes(p));
    const cobertura = encontradas.length / palabras.length;
    if (cobertura >= 0.4) ancladas++;
  }

  return ancladas / oraciones.length;
}
