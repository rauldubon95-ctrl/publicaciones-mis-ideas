import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";
import { enviarConfirmacion } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimitDb(ip, "/api/subscribe", {
    maxIntentos: 3,
    ventanaMs: 30 * 60 * 1000,
    bloqueoMs: 60 * 60 * 1000,
    failBehavior: "close",
  });

  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/subscribe");
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta más tarde." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  // Honeypot anti-bot: campo oculto debe estar vacío
  if (body.website) {
    return NextResponse.json({ ok: true }); // respuesta silenciosa
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const nombre =
    typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) || null : null;

  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 422 });
  }

  const existente = await prisma.subscription.findUnique({ where: { email } });

  // Si ya está activo, no revelar el estado — solo responder ok
  if (existente?.status === "ACTIVE") {
    return NextResponse.json({ ok: true });
  }

  let token: string;

  if (existente) {
    // Re-suscripción: generar nuevo token para invalidar el anterior
    const actualizado = await prisma.subscription.update({
      where: { email },
      data: {
        nombre: nombre ?? existente.nombre,
        status: "PENDING",
        token: crypto.randomUUID(),
        confirmedAt: null,
        unsubscribedAt: null,
      },
    });
    token = actualizado.token;
  } else {
    const nueva = await prisma.subscription.create({
      data: { email, nombre },
    });
    token = nueva.token;
  }

  await enviarConfirmacion(email, token, nombre);

  return NextResponse.json({ ok: true });
}
