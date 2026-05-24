// ─────────────────────────────────────────────────────────────
// Worker de embeddings — se invoca UNA vez para poblar Vectorize
// URL: POST /embed  (requiere header X-Admin-Key)
//
// Procesa documentos en batches de 10, guarda progreso en KV
// para ser reanudable si se interrumpe
// ─────────────────────────────────────────────────────────────
import type { Env } from "./types";

const BATCH = 10;              // documentos por batch
const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";

interface EmbedProgress {
  lastId: number;
  procesados: number;
  errores: number;
  iniciadoAt: string;
}

export async function handleEmbedRequest(
  request: Request,
  env: Env
): Promise<Response> {
  if (!env.VECTORIZE) {
    return new Response(
      JSON.stringify({ error: "Vectorize no configurado. Descomentar binding en wrangler.toml" }),
      { status: 503 }
    );
  }

  // Verificar que es admin (usando el mismo token premium como admin key)
  const adminKey = request.headers.get("X-Admin-Key");
  const esperado = await env.RATE_LIMIT.get("premium_master_token").catch(() => null);
  if (!adminKey || !esperado || adminKey !== esperado) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  // Leer progreso anterior (para reanudar si se interrumpe)
  const progressRaw = await env.RATE_LIMIT.get("embed_progress").catch(() => null);
  const progress: EmbedProgress = progressRaw
    ? JSON.parse(progressRaw)
    : { lastId: 0, procesados: 0, errores: 0, iniciadoAt: new Date().toISOString() };

  // Obtener siguiente batch desde D1
  const res = await env.DB.prepare(
    "SELECT id, titulo, texto, palabras FROM documentos WHERE id > ? ORDER BY id LIMIT ?"
  )
    .bind(progress.lastId, BATCH)
    .all<{ id: number; titulo: string; texto: string; palabras: string }>();

  const docs = res.results ?? [];

  if (docs.length === 0) {
    await env.RATE_LIMIT.delete("embed_progress").catch(() => {});
    return new Response(
      JSON.stringify({
        status: "completo",
        procesados: progress.procesados,
        errores: progress.errores,
        mensaje: "Todos los documentos han sido embebidos en Vectorize",
      }),
      { status: 200 }
    );
  }

  // Generar texto para embedding: título + primeras 500 chars de palabras + texto truncado
  const textos = docs.map((d) => {
    const base = `${d.titulo}. ${d.palabras.slice(0, 300)}. ${d.texto.slice(0, 500)}`;
    return base.slice(0, 1200); // límite del modelo
  });

  let embeddingsBatch: number[][] = [];
  let erroresBatch = 0;

  try {
    const aiRes = await env.AI.run(
      EMBEDDING_MODEL as Parameters<typeof env.AI.run>[0],
      { text: textos } as Parameters<typeof env.AI.run>[1]
    ) as { data: number[][] };
    embeddingsBatch = aiRes.data;
  } catch {
    erroresBatch = docs.length;
  }

  // Insertar en Vectorize
  if (embeddingsBatch.length > 0) {
    const vectores = docs
      .map((d, i) => ({
        id: String(d.id),
        values: embeddingsBatch[i],
        metadata: { titulo: d.titulo.slice(0, 100) },
      }))
      .filter((v) => v.values && v.values.length > 0);

    try {
      await env.VECTORIZE.upsert(vectores);
    } catch {
      erroresBatch += vectores.length;
    }
  }

  // Guardar progreso
  const newProgress: EmbedProgress = {
    lastId: docs[docs.length - 1].id,
    procesados: progress.procesados + (embeddingsBatch.length - erroresBatch),
    errores: progress.errores + erroresBatch,
    iniciadoAt: progress.iniciadoAt,
  };

  await env.RATE_LIMIT.put("embed_progress", JSON.stringify(newProgress), {
    expirationTtl: 7 * 24 * 3600,
  });

  return new Response(
    JSON.stringify({
      status: "en_progreso",
      procesados: newProgress.procesados,
      errores: newProgress.errores,
      ultimoId: newProgress.lastId,
      mensaje: `Batch completado. Llama de nuevo para continuar (${docs.length} procesados este batch).`,
    }),
    { status: 200 }
  );
}
