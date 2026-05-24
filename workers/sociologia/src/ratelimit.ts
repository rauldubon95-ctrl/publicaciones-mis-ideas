// ─────────────────────────────────────────────────────────────
// Rate limiting via Cloudflare KV (RATE_LIMIT namespace)
// Compatible con el formato de clave del Worker v1
// ─────────────────────────────────────────────────────────────
import type { Env, RateLimitResult } from "./types";

const LIMITE_GRATIS = 5;
const VENTANA_HORAS = 24;

export async function checkRateLimit(
  ip: string,
  env: Env
): Promise<RateLimitResult> {
  // Misma clave que usaba el Worker v1: rl:{ip}:{fecha}
  const fecha = new Date().toISOString().slice(0, 10);
  const clave = `rl:${ip}:${fecha}`;
  const ahora = Date.now();
  const resetAt = ahora + VENTANA_HORAS * 3600 * 1000;

  try {
    const raw = await env.RATE_LIMIT.get(clave);
    const contador = raw ? parseInt(raw, 10) : 0;

    if (contador >= LIMITE_GRATIS) {
      return { permitido: false, restantes: 0, resetAt };
    }

    await env.RATE_LIMIT.put(clave, String(contador + 1), {
      expirationTtl: VENTANA_HORAS * 3600,
    });

    return {
      permitido: true,
      restantes: LIMITE_GRATIS - contador - 1,
      resetAt,
    };
  } catch {
    // KV caído: fail-close para el asistente AI
    return { permitido: false, restantes: 0, resetAt, dbError: true };
  }
}

// Validar token premium leyendo desde KV (igual que el Worker v1)
export async function validarTokenPremium(
  token: string | null,
  env: Env
): Promise<boolean> {
  if (!token) return false;

  try {
    const esperado = await env.RATE_LIMIT.get("premium_master_token");
    if (!esperado) return false;

    if (token.length !== esperado.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ esperado.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// Contar tokens aproximados (~4 chars/token para español)
export function contarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}
