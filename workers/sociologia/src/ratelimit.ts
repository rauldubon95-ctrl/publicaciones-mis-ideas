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

export async function validarTokenPremium(
  token: string | null,
  env: Env
): Promise<boolean> {
  if (!token) return false;

  // H2: solo SESSION_SIGNING_SECRET — sin fallback a ADMIN_SECRET
  const signingSecret = env.SESSION_SIGNING_SECRET;
  if (signingSecret) {
    try {
      // C1: nuevo formato con expiración "{hmac}.{jti}.{exp}"
      if (token.includes(".")) {
        const parts = token.split(".");
        if (parts.length === 3) {
          const [hmac, jti, expStr] = parts;
          const exp = parseInt(expStr, 10);
          if (!isNaN(exp) && Date.now() <= exp) {
            const expected = await computarHmac(signingSecret, `premium-bypass-v1:${jti}:${exp}`);
            if (hmac.length === expected.length) {
              let diff = 0;
              for (let i = 0; i < hmac.length; i++) {
                diff |= hmac.charCodeAt(i) ^ expected.charCodeAt(i);
              }
              if (diff === 0) return true;
            }
          }
        }
        // Token con puntos pero inválido o expirado
        return false;
      }

      // Formato legado: hex estático — backward-compat durante la transición.
      // AsistenteChat refresca el token en cada cambio de ruta, así que los
      // tokens viejos desaparecen rápido. Eliminar este bloque tras confirmar
      // el despliegue completo.
      const esperado = await computarHmac(signingSecret, "premium-bypass-v1");
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

  // KV backward compat con el Worker v1 y PREMIUM_TOKEN legacy
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

const LIMITE_GLOBAL_RPM = 200;

export async function checkGlobalRateLimit(env: Env): Promise<boolean> {
  const minuto = new Date().toISOString().slice(0, 16);
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

export function contarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}
