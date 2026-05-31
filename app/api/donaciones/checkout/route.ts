import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimitDb(ip, "/api/donaciones/checkout", {
    maxIntentos: 5,
    ventanaMs: 30 * 60 * 1000,
    bloqueoMs: 60 * 60 * 1000,
    failBehavior: "close",
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

  // Crear registro PENDIENTE en DB antes de llamar a Stripe
  const donacion = await prisma.donacion.create({
    data: {
      monto,
      moneda: "USD",
      nombre: nombre || null,
      correo: correo || null,
      estado: "PENDIENTE",
    },
  });

  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "usd",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: monto,
            product_data: {
              name: "Donación a Raúl Dubón",
              description:
                "Apoya el proyecto de publicaciones académicas independientes.",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/donar/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/donar`,
      customer_email: correo || undefined,
      metadata: {
        donacionId: donacion.id,
      },
    });

    // Guardar el stripeId de la sesión para referencia cruzada
    await prisma.donacion.update({
      where: { id: donacion.id },
      data: { stripeId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    await prisma.donacion.update({
      where: { id: donacion.id },
      data: { estado: "CANCELADO" },
    });
    return NextResponse.json(
      { error: "Error al conectar con el sistema de pagos. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
