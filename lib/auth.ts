import { createHmac, timingSafeEqual } from "crypto";

/**
 * Deriva un token de sesión a partir del secreto de admin.
 * Nunca se almacena el secreto directamente en la cookie.
 */
export function createSessionToken(secret: string): string {
  return createHmac("sha256", secret).update("admin-session-v1").digest("hex");
}

/**
 * Compara dos strings de forma segura contra timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      // Comparación dummy para no filtrar longitud por tiempo
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifica que el token de la cookie corresponde al secreto actual.
 */
export function verifySessionToken(cookieValue: string, secret: string): boolean {
  const expected = createSessionToken(secret);
  return safeCompare(cookieValue, expected);
}
