// ─────────────────────────────────────────────────────────────
// Retrieval: FTS5 (BM25) → vector → LIKE fallback
// Trabaja sobre la tabla real: documentos (D1: llm_sociolog)
// ─────────────────────────────────────────────────────────────
import type { DocumentoRecuperado, Env } from "./types";

const MAX_DOCS = 6;
const MAX_TEXTO = 2200; // chars por documento al LLM (~550 tokens)

// Stop words para construir query FTS sin ruido
const STOP_WORDS = new Set([
  "hola","buenas","saludos","hey","hello","gracias","adios","chau",
  "este","esta","esto","esos","esas","ellos","ellas","pero","para",
  "como","cuando","donde","quien","cuyo","cual","porque","aunque",
  "sino","desde","hasta","sobre","entre","contra","tambien","solo",
  "bien","todo","todos","cada","otro","otra","otros","algún","alguna",
  "mucho","poco","algo","nada","nunca","siempre","veces","según",
  "que","con","del","una","uno","sus","son","hay","fue","ser","han",
  "the","and","for","with","from","this","that","are","has","not",
]);

// ── Punto de entrada principal ────────────────────────────────

export async function recuperarDocumentos(
  query: string,
  env: Env
): Promise<DocumentoRecuperado[]> {
  // 1. Intentar FTS5 (BM25 real)
  const fts = await buscarConFTS(query, env);
  if (fts.length >= 2) return fts;

  // 2. Si FTS devuelve poco, complementar con LIKE en palabras
  const like = await buscarConLIKE(query, env, MAX_DOCS - fts.length);
  const idsFts = new Set(fts.map((d) => d.id));
  const extra = like.filter((d) => !idsFts.has(d.id));

  const combinados = [...fts, ...extra].slice(0, MAX_DOCS);

  // 3. Si hay Vectorize disponible (Phase 3), enriquecer con vector
  if (env.VECTORIZE && combinados.length < 3) {
    try {
      const vectores = await buscarConVector(query, env);
      const idsExist = new Set(combinados.map((d) => d.id));
      const nuevos = vectores.filter((d) => !idsExist.has(d.id));
      combinados.push(...nuevos);
    } catch {
      // Vectorize no disponible aún, no es error
    }
  }

  return combinados.slice(0, MAX_DOCS);
}

// ── FTS5 con BM25 ranking ─────────────────────────────────────

async function buscarConFTS(
  query: string,
  env: Env
): Promise<DocumentoRecuperado[]> {
  const terminos = construirQueryFTS(query);
  if (!terminos) return [];

  try {
    const res = await env.DB.prepare(`
      SELECT
        d.id, d.titulo, d.slug, d.texto, d.tipo, d.palabras, d.fuente,
        bm25(documentos_fts) AS score
      FROM documentos_fts
      JOIN documentos d ON documentos_fts.rowid = d.id
      WHERE documentos_fts MATCH ?
      ORDER BY bm25(documentos_fts)
      LIMIT ?
    `)
      .bind(terminos, MAX_DOCS)
      .all<{
        id: number; titulo: string; slug: string; texto: string;
        tipo: string; palabras: string; fuente: string; score: number;
      }>();

    return (res.results ?? []).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      slug: r.slug,
      texto: truncar(r.texto),
      tipo: r.tipo,
      palabras: r.palabras,
      fuente: r.fuente,
      score: Math.abs(r.score), // BM25 en SQLite es negativo → absoluto
      via: "fts" as const,
    }));
  } catch {
    return []; // FTS puede fallar si la tabla fue recién creada y aún no commitada
  }
}

// ── LIKE fallback (compatible con el sistema anterior) ─────────

async function buscarConLIKE(
  query: string,
  env: Env,
  limite: number
): Promise<DocumentoRecuperado[]> {
  const palabras = extraerPalabras(query);
  if (!palabras.length) return [];

  const condiciones = palabras.map(() => "palabras LIKE ?").join(" OR ");
  const scoreExpr = palabras.map(() => "(CASE WHEN palabras LIKE ? THEN 1 ELSE 0 END)").join("+");
  const params = palabras.map((p) => `%${p}%`);

  try {
    const res = await env.DB.prepare(`
      SELECT id, titulo, slug, texto, tipo, palabras, fuente,
             (${scoreExpr}) AS score
      FROM documentos
      WHERE (${condiciones})
      ORDER BY score DESC
      LIMIT ?
    `)
      .bind(...params, ...params, limite)
      .all<{
        id: number; titulo: string; slug: string; texto: string;
        tipo: string; palabras: string; fuente: string; score: number;
      }>();

    return (res.results ?? [])
      .filter((r) => r.score > 0)
      .map((r) => ({
        id: r.id,
        titulo: r.titulo,
        slug: r.slug,
        texto: truncar(r.texto),
        tipo: r.tipo,
        palabras: r.palabras,
        fuente: r.fuente,
        score: r.score / palabras.length, // normalizar
        via: "like" as const,
      }));
  } catch {
    return [];
  }
}

// ── Vector retrieval (Phase 3 — Cloudflare Vectorize) ─────────

async function buscarConVector(
  query: string,
  env: Env
): Promise<DocumentoRecuperado[]> {
  if (!env.VECTORIZE) return [];

  // Generar embedding de la query
  const embeddingRes = await env.AI.run(
    "@cf/baai/bge-large-en-v1.5" as Parameters<typeof env.AI.run>[0],
    { text: [query] } as Parameters<typeof env.AI.run>[1]
  ) as { data: number[][] };

  const queryVector = embeddingRes.data[0];
  if (!queryVector) return [];

  // Buscar en Vectorize
  const matches = await env.VECTORIZE.query(queryVector, {
    topK: MAX_DOCS,
    returnMetadata: "all",
  });

  if (!matches.matches || matches.matches.length === 0) return [];

  // Obtener documentos de D1 por los IDs encontrados
  const idsValidos = matches.matches
    .map((m) => m.id)
    .filter((id) => /^\d+$/.test(id));
  if (idsValidos.length === 0) return [];
  const ids = idsValidos.join(",");
  const res = await env.DB.prepare(
    `SELECT id, titulo, slug, texto, tipo, palabras, fuente FROM documentos WHERE id IN (${ids})`
  ).all<{
    id: number; titulo: string; slug: string; texto: string;
    tipo: string; palabras: string; fuente: string;
  }>();

  const scoreMap = new Map(matches.matches.map((m) => [m.id, m.score]));

  return (res.results ?? []).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    slug: r.slug,
    texto: truncar(r.texto),
    tipo: r.tipo,
    palabras: r.palabras,
    fuente: r.fuente,
    score: scoreMap.get(String(r.id)) ?? 0,
    via: "vector" as const,
  }));
}

// ── Helpers ───────────────────────────────────────────────────

function construirQueryFTS(query: string): string {
  const palabras = extraerPalabras(query);
  if (!palabras.length) return "";

  // Prefijo + OR para FTS5
  return palabras.map((p) => `"${p}"*`).join(" OR ");
}

function extraerPalabras(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !STOP_WORDS.has(p))
    .slice(0, 8);
}

function truncar(texto: string): string {
  if (texto.length <= MAX_TEXTO) return texto;
  const cortado = texto.slice(0, MAX_TEXTO);
  const ultimoPunto = Math.max(cortado.lastIndexOf(". "), cortado.lastIndexOf(".\n"));
  return ultimoPunto > MAX_TEXTO * 0.7
    ? cortado.slice(0, ultimoPunto + 1)
    : cortado + "…";
}

// ── Grounding ratio ───────────────────────────────────────────

export function calcularGrounding(
  respuesta: string,
  docs: DocumentoRecuperado[]
): number {
  if (docs.length === 0) return 0;

  const corpus = docs
    .map((d) => d.texto + " " + d.palabras)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const oraciones = respuesta
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

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
    const encontradas = palabras.filter((p) => corpus.includes(p)).length;
    if (encontradas / palabras.length >= 0.35) ancladas++;
  }

  return ancladas / oraciones.length;
}
