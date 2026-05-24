// ─────────────────────────────────────────────────────────────
// Telemetría: escribe a KV de forma async (no bloquea respuesta)
// Usa KV en lugar de D1 para no agregar latencia ni tablas nuevas
// ─────────────────────────────────────────────────────────────
import type { Env, TelemetriaEvento } from "./types";

export function emitirEvento(
  evento: TelemetriaEvento,
  env: Env,
  ctx: ExecutionContext
): void {
  ctx.waitUntil(guardarEvento(evento, env));
}

async function guardarEvento(
  evento: TelemetriaEvento,
  env: Env
): Promise<void> {
  try {
    // Guardar en KV como lista rolling de últimos 500 eventos
    // Clave: telemetry:{fecha} → JSON array
    const fecha = new Date().toISOString().slice(0, 10);
    const clave = `telemetry:${fecha}`;

    const raw = await env.RATE_LIMIT.get(clave);
    const eventos: TelemetriaEvento[] = raw ? JSON.parse(raw) : [];

    eventos.push(evento);

    // Mantener solo los últimos 200 eventos del día
    const ultimos = eventos.slice(-200);

    await env.RATE_LIMIT.put(clave, JSON.stringify(ultimos), {
      expirationTtl: 7 * 24 * 3600, // 7 días
    });
  } catch {
    // Telemetría nunca rompe el flujo
  }
}
