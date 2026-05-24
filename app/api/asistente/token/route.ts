import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || !cookie) {
    return Response.json({ token: null });
  }

  const valido = await verifySessionToken(cookie, secret);
  if (!valido) {
    return Response.json({ token: null });
  }

  // Si PREMIUM_TOKEN está configurado lo usa (compatible con Worker v1 vía KV).
  // Si no, deriva el token por HMAC (compatible con Worker v2).
  const token =
    process.env.PREMIUM_TOKEN ??
    createHmac("sha256", secret).update("premium-bypass-v1").digest("hex");

  return Response.json({ token });
}
