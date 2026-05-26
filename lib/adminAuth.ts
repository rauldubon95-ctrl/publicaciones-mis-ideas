import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function isAdminAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;
  if (!token || !secret) return false;

  const jti = await parseSessionToken(token, secret);
  if (!jti) return false;

  const session = await prisma.sesionAdmin.findUnique({ where: { jti } });
  if (!session || session.revocadaAt !== null || session.expiraAt < new Date()) return false;

  return true;
}

export function unauthorizedResponse(): Response {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}
