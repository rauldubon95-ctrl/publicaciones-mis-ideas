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

// Validar token premium: computa el mismo HMAC que genera Next.js
// Requiere que ADMIN_SECRET esté configurado como Worker secret
export async function validarTokenPremium(
  token: string | null,
  env: Env
): Promise<boolean> {
  if (!token || !env.ADMIN_SECRET) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.ADMIN_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("premium-bypass-v1"));
    const esperado = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

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
