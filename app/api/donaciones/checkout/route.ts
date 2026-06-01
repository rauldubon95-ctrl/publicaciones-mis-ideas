import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearOrdenPayPal } from "@/lib/paypal";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimitDb(ip, "/api/donaciones/checkout", {
    maxIntentos: 30,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 30 * 60 * 1000,
    failBehavior: "open",
  });

  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/donaciones/checkout");
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento antes de continuar." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  // Honeypot anti-bot — el campo debe llegar vacío en envíos humanos
  if (body.website) {
    await registrarEvento("BOT_DETECTADO", ip, "/api/donaciones/checkout", {
      motivo: "honeypot",
    });
    return NextResponse.json({ ok: true });
  }

  const monto = typeof body.monto === "number" ? Math.round(body.monto) : 0;
  const nombre =
    typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";
  const correo =
    typeof body.correo === "string"
      ? body.correo.trim().toLowerCase().slice(0, 200)
      : "";

  if (monto < 100 || monto > 1_000_000) {
    return NextResponse.json(
      { error: "El monto debe estar entre $1.00 y $10,000.00." },
      { status: 422 }
    );
  }

  if (correo && !EMAIL_RE.test(correo)) {
    return NextResponse.json(
      { error: "El correo electrónico no es válido." },
      { status: 422 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const donacion = await prisma.donacion.create({
    data: {
      monto,
      moneda: "USD",
      nombre: nombre || null,
      correo: correo || null,
      estado: "PENDIENTE",
    },
  });

  try {
    const { id: paypalOrderId, approvalUrl } = await crearOrdenPayPal(
      monto,
      `${appUrl}/donar/gracias?donacion_id=${donacion.id}`,
      `${appUrl}/donar`
    );

    await prisma.donacion.update({
      where: { id: donacion.id },
      data: { stripeId: paypalOrderId },
    });

    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("PayPal checkout error:", msg);
    await prisma.donacion.update({
      where: { id: donacion.id },
      data: { estado: "CANCELADO" },
    });
    return NextResponse.json(
      { error: "Error al conectar con PayPal. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
