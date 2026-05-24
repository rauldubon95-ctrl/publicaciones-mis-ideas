// ─────────────────────────────────────────────────────────────
// Rate limiting via Cloudflare KV (sin DB, ultra-rápido en edge)
// ─────────────────────────────────────────────────────────────
import type { Env, RateLimitResult } from "./types";

const LIMITE_GRATIS = 5;           // consultas por día para usuarios free
const VENTANA_MS = 24 * 60 * 60 * 1000; // 24 horas

interface KVRateLimitData {
  contador: number;
  resetAt: number; // unix ms
}

// Hash de IP para no guardar IPs reales en KV
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "rl-salt-2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkRateLimit(
  ip: string,
  env: Env
): Promise<RateLimitResult> {
  const ipHash = await hashIp(ip);
  const key = `rl:${ipHash}`;
  const ahora = Date.now();

  try {
    const raw = await env.KV.get(key);
    let datos: KVRateLimitData;

    if (raw) {
      datos = JSON.parse(raw) as KVRateLimitData;
      // Si la ventana expiró, reiniciar
      if (datos.resetAt <= ahora) {
        datos = { contador: 0, resetAt: ahora + VENTANA_MS };
      }
    } else {
      datos = { contador: 0, resetAt: ahora + VENTANA_MS };
    }

    const nuevoContador = datos.contador + 1;
    const permitido = nuevoContador <= LIMITE_GRATIS;
    const restantes = Math.max(0, LIMITE_GRATIS - nuevoContador);

    // Actualizar KV (TTL = tiempo hasta reset + 60s de margen)
    const ttlSeg = Math.ceil((datos.resetAt - ahora) / 1000) + 60;
    await env.KV.put(
      key,
      JSON.stringify({ contador: nuevoContador, resetAt: datos.resetAt }),
      { expirationTtl: ttlSeg }
    );

    return { permitido, restantes, resetAt: datos.resetAt };
  } catch {
    // KV failure: fail-close para el asistente AI (no servir sin contabilizar)
    return { permitido: false, restantes: 0, resetAt: ahora + VENTANA_MS, dbError: true };
  }
}

// Validar token premium contra el hash almacenado en env
export async function validarTokenPremium(
  token: string | null,
  env: Env
): Promise<boolean> {
  if (!token) return false;
  const esperado = env.PREMIUM_TOKEN_HASH;
  if (!esperado) return false;

  // Comparación de tiempo constante para evitar timing attacks
  if (token.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}

// Contar tokens aproximados (para presupuesto y telemetría)
export function contarTokens(texto: string): number {
  // Aproximación: ~4 chars por token para español/inglés
  // Más preciso que simplemente dividir palabras
  return Math.ceil(texto.length / 4);
}
