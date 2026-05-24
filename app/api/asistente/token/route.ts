import { cookies } from "next/headers";
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

  // Usa el token estático configurado en Vercel env vars
  const token = process.env.PREMIUM_TOKEN ?? null;
  return Response.json({ token });
}
