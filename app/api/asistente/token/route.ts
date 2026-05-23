import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

async function derivarTokenPremium(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode("premium-bypass-v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

  const token = await derivarTokenPremium(secret);
  return Response.json({ token });
}
