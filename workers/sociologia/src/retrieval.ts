// ─────────────────────────────────────────────────────────────
// Retrieval: FTS5 (BM25) → vector → LIKE fallback
// Trabaja sobre la tabla real: documentos (D1: llm_sociolog)
// ─────────────────────────────────────────────────────────────
import type { DocumentoRecuperado, Env } from "./types";
import { EMBEDDING_MODEL } from "./config";

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
  // Estrategia (sesión 36): correr Vectorize (semántico) EN PARALELO con
  // FTS (palabra exacta) siempre que Vectorize esté disponible. Antes
  // Vectorize solo entraba si FTS traía <3 docs, perdiendo la ventaja
  // semántica cuando FTS traía basura por palabra suelta (ej. "sentido"
  // en cualquier contexto). Mezclamos por score normalizado.
  const [fts, vectores] = await Promise.all([
    buscarConFTS(query, env),
    env.VECTORIZE ? buscarConVector(query, env).catch(() => []) : Promise.resolve([]),
  ]);

  const idsVector = new Set(vectores.map((d) => d.id));
  const idsFtsSet = new Set(fts.map((d) => d.id));
  const enAmbas = fts.filter((d) => idsVector.has(d.id));
  const soloFts = fts.filter((d) => !idsVector.has(d.id));
  const soloVector = vectores.filter((d) => !idsFtsSet.has(d.id));

  // Mezcla rebalanceada (sesión 39): antes los resultados SOLO-vector
  // llenaban todos los slots primero y expulsaban los léxicos; con el modelo
  // de embeddings previo (inglés) eso enterraba las mejores coincidencias
  // léxicas. Ahora: primero lo que coincide en AMBAS vías (máxima señal),
  // luego intercalamos léxico y semántico EMPEZANDO por el léxico, que es la
  // señal más confiable para el corpus en español.
  let combinados = [...enAmbas, ...intercalar(soloFts, soloVector)].slice(0, MAX_DOCS);

  // Fallback LIKE solo si combinados es débil
  if (combinados.length < 2) {
    const like = await buscarConLIKE(query, env, MAX_DOCS - combinados.length);
    const idsExist = new Set(combinados.map((d) => d.id));
    combinados.push(...like.filter((d) => !idsExist.has(d.id)));
  }

  // Empujón SUAVE a las publicaciones del propio sitio (tipo='publicacion')
  // sobre los PDFs sueltos del corpus (tipo='articulo'): es el contenido que
  // el autor más quiere ver citado y suele ser de mayor calidad. El bonus es
  // acotado — no entierra un documento del corpus muy relevante, solo rompe
  // cuasi-empates de posición.
  combinados = promoverPublicaciones(combinados);

  return combinados.slice(0, MAX_DOCS);
}

// Intercala dos listas empezando por la primera (léxica), sin perder elementos.
function intercalar<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

// Reordena de forma estable dando a las publicaciones del sitio un bonus
// acotado de posición (~1 puesto). Array.prototype.sort es estable en V8.
function promoverPublicaciones(docs: DocumentoRecuperado[]): DocumentoRecuperado[] {
  const BONUS = 1.3;
  return docs
    .map((d, i) => ({ d, clave: i - (d.tipo === "publicacion" ? BONUS : 0) }))
    .sort((x, y) => x.clave - y.clave)
    .map((o) => o.d);
}

// ── FTS5 con BM25 ranking ─────────────────────────────────────

async function buscarConFTS(
  query: string,
  env: Env
): Promise<DocumentoRecuperado[]> {
  const t = construirTerminosFTS(query);
  if (!t) return [];

  // AND-primero (sesión 39): exigir TODAS las palabras (en su raíz singular)
  // da PRECISIÓN — evita que un documento gane solo por repetir una palabra
  // muy común como "social/sociales" aunque no trate el tema. Si AND trae
  // poco (consulta con muchos términos o corpus escaso), se completa con OR
  // para no perder RECALL.
  let docs = await ejecutarFTS(t.and, env);
  if (docs.length < 3) {
    const orDocs = await ejecutarFTS(t.or, env);
    const ids = new Set(docs.map((d) => d.id));
    docs = [...docs, ...orDocs.filter((d) => !ids.has(d.id))].slice(0, MAX_DOCS);
  }
  return docs;
}

async function ejecutarFTS(
  match: string,
  env: Env
): Promise<DocumentoRecuperado[]> {
  if (!match) return [];
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
      .bind(match, MAX_DOCS)
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

  // Search in palabras, titulo, AND texto columns so synced articles
  // (tipo='publicacion') are found even if palabras was sparse.
  const condiciones = palabras
    .map(() => "(palabras LIKE ? OR titulo LIKE ? OR texto LIKE ?)")
    .join(" OR ");
  const scoreExpr = palabras
    .map(() => "(CASE WHEN palabras LIKE ? THEN 1 ELSE 0 END)" +
               "+(CASE WHEN titulo LIKE ? THEN 1 ELSE 0 END)" +
               "+(CASE WHEN texto LIKE ? THEN 0.5 ELSE 0 END)")
    .join("+");
  const params = palabras.flatMap((p) => [`%${p}%`, `%${p}%`, `%${p}%`]);

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

  // Generar embedding de la query (modelo multilingüe central, sesión 39).
  const embeddingRes = await env.AI.run(
    EMBEDDING_MODEL,
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

function construirTerminosFTS(query: string): { and: string; or: string } | null {
  const palabras = extraerPalabras(query);
  if (!palabras.length) return null;

  // Raíz singular + prefijo para FTS5. Un solo objeto con las dos variantes
  // (AND para precisión, OR para recall) que usa buscarConFTS.
  const stems = [...new Set(palabras.map(stemLigero))];
  const prefijos = stems.map((s) => `"${s}"*`);
  return { and: prefijos.join(" AND "), or: prefijos.join(" OR ") };
}

// Reduce el plural español a su raíz para el prefix-match de FTS5:
// "clases"→"clase", "sociales"→"social", "movimientos"→"movimiento".
// Sin esto, el prefijo `"clases"*` NO matchea "clase" en singular (el
// prefijo de FTS5 solo extiende hacia adelante) y se perdían los textos de
// teoría que usan el singular ("clase obrera", "clase dominante").
function stemLigero(p: string): string {
  if (p.length > 4 && p.endsWith("es")) return p.slice(0, -2);
  if (p.length > 3 && p.endsWith("s")) return p.slice(0, -1);
  return p;
}

function extraerPalabras(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length >= 3 && !STOP_WORDS.has(p))
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
