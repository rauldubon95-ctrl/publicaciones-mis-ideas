// ─────────────────────────────────────────────────────────────
// Sync endpoint: POST /sync — sincroniza artículos Supabase → D1
// Autenticado con HMAC(ADMIN_SECRET, "d1-sync-v1")
// ─────────────────────────────────────────────────────────────
import type { Env } from "./types";

const SYNC_MESSAGE = "d1-sync-v1";

interface SyncBody {
  action: "upsert" | "delete";
  slug: string;
  titulo?: string;
  contenido?: string;
  etiquetas?: string;
  categoria?: string;
  fuente?: string;
}

export async function handleSyncRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const secret = env.D1_SYNC_SECRET ?? env.ADMIN_SECRET;
  if (!secret) {
    return jsonResp({ error: "No configurado" }, 500);
  }

  const syncToken = request.headers.get("X-Sync-Token");
  const esperado = await computarHmac(secret, SYNC_MESSAGE);

  if (!syncToken || !constantTimeEqual(syncToken, esperado)) {
    return jsonResp({ error: "No autorizado" }, 401);
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return jsonResp({ error: "Solicitud inválida" }, 400);
  }

  const { action, slug, titulo, contenido, etiquetas, categoria, fuente } = body;

  if (!action || !slug) {
    return jsonResp({ error: "action y slug son requeridos" }, 400);
  }

  const texto = contenido
    ? stripHtml(contenido).slice(0, 50000)
    : "";
  const palabras = [etiquetas, categoria].filter(Boolean).join(" ");

  try {
    if (action === "delete") {
      return await eliminarDocumento(slug, env);
    }
    if (action === "upsert") {
      if (!titulo || !texto) {
        return jsonResp({ error: "titulo y contenido requeridos para upsert" }, 400);
      }
      return await upsertDocumento(
        { slug, titulo, texto, palabras, fuente: fuente ?? "" },
        env
      );
    }
    return jsonResp({ error: "action debe ser 'upsert' o 'delete'" }, 400);
  } catch (err) {
    return jsonResp({ error: "Error de base de datos", detail: String(err) }, 500);
  }
}

async function upsertDocumento(
  doc: { slug: string; titulo: string; texto: string; palabras: string; fuente: string },
  env: Env
): Promise<Response> {
  const existing = await env.DB.prepare(
    "SELECT id FROM documentos WHERE slug = ? AND tipo = 'publicacion'"
  )
    .bind(doc.slug)
    .first<{ id: number }>();

  if (existing) {
    await env.DB.prepare(
      "UPDATE documentos SET titulo = ?, texto = ?, palabras = ?, fuente = ? WHERE id = ?"
    )
      .bind(doc.titulo, doc.texto, doc.palabras, doc.fuente, existing.id)
      .run();
    await env.DB.prepare(
      "INSERT INTO documentos_fts(documentos_fts) VALUES('rebuild')"
    ).run();

    return jsonResp({ ok: true, action: "updated", id: existing.id }, 200);
  }

  const result = await env.DB.prepare(
    "INSERT INTO documentos (titulo, slug, texto, tipo, palabras, fuente) VALUES (?, ?, ?, 'publicacion', ?, ?)"
  )
    .bind(doc.titulo, doc.slug, doc.texto, doc.palabras, doc.fuente)
    .run();

  await env.DB.prepare(
    "INSERT INTO documentos_fts(documentos_fts) VALUES('rebuild')"
  ).run();

  return jsonResp({ ok: true, action: "inserted", id: result.meta.last_row_id }, 201);
}

async function eliminarDocumento(slug: string, env: Env): Promise<Response> {
  const existing = await env.DB.prepare(
    "SELECT id FROM documentos WHERE slug = ? AND tipo = 'publicacion'"
  )
    .bind(slug)
    .first<{ id: number }>();

  if (!existing) {
    return jsonResp({ ok: true, action: "not_found" }, 200);
  }

  await env.DB.prepare("DELETE FROM documentos WHERE id = ?")
    .bind(existing.id)
    .run();
  await env.DB.prepare(
    "INSERT INTO documentos_fts(documentos_fts) VALUES('rebuild')"
  ).run();

  return jsonResp({ ok: true, action: "deleted", id: existing.id }, 200);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function computarHmac(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function jsonResp(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
