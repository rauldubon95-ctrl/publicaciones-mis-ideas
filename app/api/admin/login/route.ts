import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeCompare, createSessionToken } from "@/lib/auth";

// Rate limiting en memoria: máx 5 intentos por IP cada 15 minutos
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const clave = typeof (body as Record<string, unknown>).clave === "string"
    ? (body as Record<string, string>).clave
    : "";

  const secret = process.env.ADMIN_SECRET;

  if (!secret || !safeCompare(clave, secret)) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }

  // Guardar un token derivado, nunca la clave directamente
  const sessionToken = createSessionToken(secret);

  const cookieStore = cookies();
  cookieStore.set("admin_auth", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
