import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (token && secret) {
    const jti = await parseSessionToken(token, secret);
    if (jti) {
      await prisma.sesionAdmin
        .updateMany({ where: { jti }, data: { revocadaAt: new Date() } })
        .catch(() => {});
    }
  }

  cookieStore.set("admin_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return NextResponse.json({ ok: true });
}
