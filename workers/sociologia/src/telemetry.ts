import type { Env, TelemetriaEvento } from "./types";

export function emitirEvento(
  evento: TelemetriaEvento,
  env: Env,
  ctx: ExecutionContext
): void {
  ctx.waitUntil(guardarEvento(evento, env));
}

async function guardarEvento(evento: TelemetriaEvento, env: Env): Promise<void> {
  try {
    const fecha = new Date().toISOString().slice(0, 10);
    const clave = `telemetry:${fecha}`;
    const raw = await env.RATE_LIMIT.get(clave);
    const eventos: TelemetriaEvento[] = raw ? JSON.parse(raw) : [];
    eventos.push(evento);
    await env.RATE_LIMIT.put(clave, JSON.stringify(eventos.slice(-200)), {
      expirationTtl: 7 * 24 * 3600,
    });
  } catch {
    // Telemetría nunca rompe el flujo
  }
}

// ── Endpoint GET /telemetria (autenticado con X-Sync-Token) ──────

export async function handleTelemetriaRequest(
  request: Request,
  env: Env,
  CORS: Record<string, string>
): Promise<Response> {
  const secret = env.D1_SYNC_SECRET ?? env.ADMIN_SECRET;
  if (!secret) return json({ error: "No configurado" }, 500, CORS);

  const token = request.headers.get("X-Sync-Token");
  const esperado = await hmacHex(secret, "telemetria-v1");
  if (!token || !constantTimeEqual(token, esperado)) {
    return json({ error: "No autorizado" }, 401, CORS);
  }

  // Leer los últimos 7 días de KV
  const ahora = new Date();
  const todosEventos: TelemetriaEvento[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);
    const fecha = d.toISOString().slice(0, 10);
    try {
      const raw = await env.RATE_LIMIT.get(`telemetry:${fecha}`);
      if (raw) todosEventos.push(...(JSON.parse(raw) as TelemetriaEvento[]));
    } catch {
      // KV caído para ese día — continuar
    }
  }

  const queries = todosEventos.filter((e) => e.tipo === "query_complete");
  const errores = todosEventos.filter((e) => e.tipo === "error");
  const bloqueados = todosEventos.filter((e) => e.tipo === "injection_blocked");

  const latenciaPromedio = queries.length
    ? Math.round(queries.reduce((s, e) => s + (e.duracionMs ?? 0), 0) / queries.length)
    : 0;
  const confianzaPromedio = queries.length
    ? Math.round((queries.reduce((s, e) => s + (e.scoreConfianza ?? 0), 0) / queries.length) * 100) / 100
    : 0;

  // Conteo por método de retrieval
  const porRetrieval: Record<string, number> = { fts: 0, like: 0, vector: 0, sin_docs: 0 };
  for (const e of queries) {
    const via = e.viaRetrieval ?? "sin_docs";
    porRetrieval[via] = (porRetrieval[via] ?? 0) + 1;
  }

  // Consultas por día
  const porDia: Record<string, number> = {};
  for (const e of queries) {
    const dia = new Date(e.timestamp).toISOString().slice(0, 10);
    porDia[dia] = (porDia[dia] ?? 0) + 1;
  }

  // Distribución de confianza
  const altaConfianza = queries.filter((e) => (e.scoreConfianza ?? 0) >= 0.7).length;
  const mediaConfianza = queries.filter((e) => {
    const s = e.scoreConfianza ?? 0;
    return s >= 0.4 && s < 0.7;
  }).length;
  const bajaConfianza = queries.filter((e) => (e.scoreConfianza ?? 0) < 0.4).length;

  return json({
    resumen: {
      totalConsultas: queries.length,
      totalErrores: errores.length,
      totalBloqueados: bloqueados.length,
      latenciaPromedio,
      confianzaPromedio,
      confianza: { alta: altaConfianza, media: mediaConfianza, baja: bajaConfianza },
      porRetrieval,
      porDia,
    },
    recientes: todosEventos.slice(-30).reverse(),
    periodo: "7 días",
  }, 200, CORS);
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
