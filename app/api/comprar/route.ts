// Endpoint de compra de contenido premium.
// El cliente envía { publicacionId, email, nombre? }. Validamos que la
// publicación exista, esté publicada y sea premium; el precio se toma del
// servidor (nunca del cliente). Creamos un PedidoContenido PENDIENTE y una
// orden PayPal con custom_id="contenido:<pedidoId>" para que el webhook lo
// distinga de las donaciones.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearOrdenPayPal } from "@/lib/paypal";
import {
  checkRateLimitDb,
  registrarEvento,
  getIp,
} from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // H4: fail-close + 5 intentos/h — si la DB cae es mejor rechazar que
  // permitir abuso ilimitado de la API de PayPal.
  const rl = await checkRateLimitDb(ip, "/api/comprar", {
    maxIntentos: 5,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 30 * 60 * 1000,
    failBehavior: "close",
  });

  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/comprar");
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  // Honeypot anti-bot
  if (body.website) {
    await registrarEvento("BOT_DETECTADO", ip, "/api/comprar", {
      motivo: "honeypot",
    });
    return NextResponse.json({ ok: true });
  }

  const publicacionId =
    typeof body.publicacionId === "string" ? body.publicacionId : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase().slice(0, 200)
      : "";
  const nombre =
    typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";

  if (!publicacionId) {
    return NextResponse.json(
      { error: "Falta el identificador del artículo." },
      { status: 400 }
    );
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Correo electrónico inválido." },
      { status: 422 }
    );
  }

  // H4: rate limit secundario por email (además del IP)
  const emailRl = await checkRateLimitDb(email, "/api/comprar:email", {
    maxIntentos: 3,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 60 * 60 * 1000,
    failBehavior: "close",
  });
  if (!emailRl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/comprar");
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento." },
      { status: 429 }
    );
  }

  const publicacion = await prisma.publicacion.findUnique({
    where: { id: publicacionId },
    select: {
      id: true,
      titulo: true,
      slug: true,
      publicado: true,
      esPremium: true,
      precioCentavos: true,
    },
  });

  if (!publicacion || !publicacion.publicado || !publicacion.esPremium) {
    return NextResponse.json(
      { error: "Este artículo no está a la venta." },
      { status: 404 }
    );
  }

  const precio = publicacion.precioCentavos ?? 0;
  if (precio < 100) {
    return NextResponse.json(
      { error: "Este artículo no tiene un precio válido configurado." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const pedido = await prisma.pedidoContenido.create({
    data: {
      publicacionId: publicacion.id,
      emailComprador: email,
      nombreComprador: nombre || null,
      montoCentavos: precio,
      moneda: "USD",
      estado: "PENDIENTE",
    },
  });

  try {
    const { id: paypalOrderId, approvalUrl } = await crearOrdenPayPal(
      precio,
      `${appUrl}/comprar/exito?pedido_id=${pedido.id}`,
      `${appUrl}/publicaciones/${publicacion.slug}`,
      {
        descripcion: `Acceso a: ${publicacion.titulo}`.slice(0, 127),
        customId: `contenido:${pedido.id}`,
      }
    );

    await prisma.pedidoContenido.update({
      where: { id: pedido.id },
      data: { paypalOrderId },
    });

    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("PayPal checkout error (compra):", err);
    await prisma.pedidoContenido.update({
      where: { id: pedido.id },
      data: { estado: "CANCELADO" },
    });
    return NextResponse.json(
      { error: "Error al conectar con PayPal. Intenta de nuevo." },
      { status: 502 }
    );
  }
}
