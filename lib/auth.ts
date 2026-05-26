// Web Crypto API — compatible con Edge Runtime (middleware) y Node.js 18+

async function hmacHex(secret: string, message: string): Promise<string> {
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

// Formato del cookie: "v2.{jti}.{hmac}"
// jti = UUID v4 (sin puntos), hmac = HMAC(secret, "v2." + jti)
export async function createSessionToken(
  secret: string
): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomUUID();
  const sig = await hmacHex(secret, "v2." + jti);
  return { token: `v2.${jti}.${sig}`, jti };
}

// Extrae el jti si la firma HMAC es válida; retorna false si no
export async function parseSessionToken(
  cookieValue: string,
  secret: string
): Promise<string | false> {
  if (!cookieValue.startsWith("v2.")) return false;
  const secondDot = cookieValue.indexOf(".", 3);
  if (secondDot === -1) return false;
  const jti = cookieValue.slice(3, secondDot);
  const sig = cookieValue.slice(secondDot + 1);
  if (!jti || !sig) return false;
  const expected = await hmacHex(secret, "v2." + jti);
  return safeCompare(sig, expected) ? jti : false;
}

// Mantiene la interfaz boolean para el middleware (Edge runtime, sin DB)
export async function verifySessionToken(
  cookieValue: string,
  secret: string
): Promise<boolean> {
  return (await parseSessionToken(cookieValue, secret)) !== false;
}

export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
