import { createHmac, randomUUID } from "crypto";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { sessionSecret } from "@/lib/secrets";

export async function GET() {
  const secret = sessionSecret();
  if (!secret || !(await isAdminAuthorized())) {
    return Response.json({ token: null });
  }

  // Token con expiración: "{hmac}.{jti}.{exp}"
  // HMAC firma "premium-bypass-v1:{jti}:{exp}" — el Worker valida exp y HMAC.
  // Reemplaza el HMAC estático anterior que era permanente e irrevocable.
  const jti = randomUUID();
  const exp = Date.now() + 60 * 60 * 1000; // 1 hora
  const message = `premium-bypass-v1:${jti}:${exp}`;
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  const token = `${hmac}.${jti}.${exp}`;

  return Response.json({ token });
}
