import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;
  if (!token || !secret) return false;
  return verifySessionToken(token, secret);
}

export function unauthorizedResponse(): Response {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
