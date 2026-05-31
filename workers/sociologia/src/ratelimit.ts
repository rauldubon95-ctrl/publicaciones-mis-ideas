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

// Validar token premium — acepta dos métodos (orden de prioridad):
// 1. HMAC(ADMIN_SECRET, "premium-bypass-v1") — preferido, sin dependencia de KV
// 2. KV key "premium_master_token" — fallback para compat con instalaciones previas
export async function validarTokenPremium(
  token: string | null,
  env: Env
): Promise<boolean> {
  if (!token) return false;

  // Método 1: HMAC (requiere ADMIN_SECRET como Worker secret)
  if (env.ADMIN_SECRET) {
    try {
      const esperado = await computarHmacPremium(env.ADMIN_SECRET);
      if (token.length === esperado.length) {
        let diff = 0;
        for (let i = 0; i < token.length; i++) {
          diff |= token.charCodeAt(i) ^ esperado.charCodeAt(i);
        }
        if (diff === 0) return true;
      }
    } catch {
      // Continúa al fallback KV
    }
  }

  // Método 2: KV — backward compat con el Worker v1 y PREMIUM_TOKEN
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

async function computarHmacPremium(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("premium-bypass-v1")
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Límite global de solicitudes por minuto en todo el Worker.
// Protege contra ataques coordinados con muchas IPs distintas.
// La clave expira a los 70s para evitar contadores huérfanos.
const LIMITE_GLOBAL_RPM = 200;

export async function checkGlobalRateLimit(env: Env): Promise<boolean> {
  const minuto = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  const clave = `global:rpm:${minuto}`;
  try {
    const raw = await env.RATE_LIMIT.get(clave);
    const contador = raw ? parseInt(raw, 10) : 0;
    if (contador >= LIMITE_GLOBAL_RPM) return false;
    await env.RATE_LIMIT.put(clave, String(contador + 1), { expirationTtl: 70 });
    return true;
  } catch {
    return true; // fail-open: si KV cae, no bloquear globalmente
  }
}

// Contar tokens aproximados (~4 chars/token para español)
export function contarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}
