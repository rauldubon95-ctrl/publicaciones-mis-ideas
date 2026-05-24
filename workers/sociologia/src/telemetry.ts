// ─────────────────────────────────────────────────────────────
// Telemetría básica: escribe a D1 de forma asíncrona
// NUNCA bloquea la respuesta al usuario
// ─────────────────────────────────────────────────────────────
import type { Env, TelemetriaEvento } from "./types";

export function emitirEvento(
  evento: TelemetriaEvento,
  env: Env,
  ctx: ExecutionContext
): void {
  // ctx.waitUntil: el Worker puede terminar sin esperar esto
  ctx.waitUntil(escribirEvento(evento, env));
}

async function escribirEvento(
  evento: TelemetriaEvento,
  env: Env
): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO telemetry_events (
        id, trace_id, span_id, type, timestamp, duration_ms,
        input_tokens, output_tokens, confidence_score,
        hallucination_risk, injection_risk_score, grounding_ratio,
        model_id, skill_used, payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        crypto.randomUUID(),
        evento.traceId,
        crypto.randomUUID(),
        evento.tipo,
        evento.timestamp,
        evento.duracionMs ?? null,
        evento.tokensEntrada ?? 0,
        evento.tokensSalida ?? 0,
        evento.scoreConfianza ?? null,
        null, // hallucination_risk: Phase 3
        evento.scoreInyeccion ?? 0,
        evento.groundingRatio ?? null,
        evento.modelId ?? null,
        evento.skillUsada ?? null,
        JSON.stringify({ chunksRecuperados: evento.chunksRecuperados, errorMsg: evento.errorMsg })
      )
      .run();
  } catch {
    // Telemetría nunca rompe el flujo
  }
}

// Limpiar telemetría vieja (llamar desde un scheduled event o manualmente)
export async function limpiarTelemetria(env: Env): Promise<void> {
  const hace30dias = Date.now() - 30 * 24 * 60 * 60 * 1000;
  try {
    await env.DB.prepare(
      "DELETE FROM telemetry_events WHERE timestamp < ?"
    )
      .bind(hace30dias)
      .run();
  } catch {
    // silencioso
  }
}
