import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;
  if (!secret || !token) return false;
  return verifySessionToken(token, secret);
}

export function unauthorizedResponse() {
  return Response.json({ error: "No autorizado" }, { status: 401 });
}
