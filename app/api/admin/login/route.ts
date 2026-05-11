import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { clave } = await req.json();
  const secret = process.env.ADMIN_SECRET;

  if (!secret || clave !== secret) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  const cookieStore = cookies();
  cookieStore.set("admin_auth", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
