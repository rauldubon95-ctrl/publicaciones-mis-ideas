import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeCompare, createSessionToken } from "@/lib/auth";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";
import { prisma } from "@/lib/prisma";
import { adminPassword, sessionSecret } from "@/lib/secrets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE_CONFIG = {
  maxIntentos: 5,
  ventanaMs: 15 * 60 * 1000,
  bloqueoMs: 30 * 60 * 1000,
  failBehavior: "close" as const, // si DB cae, rechazar login (no permitir fuerza bruta)
};

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rate = await checkRateLimitDb(ip, "login", RATE_CONFIG);
  if (!rate.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/admin/login", {
      contador: rate.contador,
      bloqueadoHasta: rate.resetAt.toISOString(),
    });
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const clave =
    typeof (body as Record<string, unknown>).clave === "string"
      ? (body as Record<string, string>).clave
      : "";

  const password = adminPassword();
  const signingSecret = sessionSecret();

  if (!password || !signingSecret || !safeCompare(clave, password)) {
    await registrarEvento("LOGIN_FALLIDO", ip, "/api/admin/login", {
      intento: rate.contador,
    });
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  await registrarEvento("LOGIN_EXITOSO", ip, "/api/admin/login");

  const { token: sessionToken, jti } = await createSessionToken(signingSecret);
  await prisma.sesionAdmin.create({
    data: {
      jti,
      expiraAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
