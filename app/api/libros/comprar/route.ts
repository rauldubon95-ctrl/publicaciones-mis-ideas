import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearOrdenPayPal } from "@/lib/paypal";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // H4: fail-close + 5 intentos/h
  const rl = await checkRateLimitDb(ip, "/api/libros/comprar", {
    maxIntentos: 5, ventanaMs: 60 * 60 * 1000, bloqueoMs: 30 * 60 * 1000, failBehavior: "close",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/libros/comprar");
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const libroId = typeof body.libroId === "string" ? body.libroId : "";
  const email   = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const nombre  = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";

  if (!libroId) return NextResponse.json({ error: "Falta el identificador del libro." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 422 });

  // H4: rate limit secundario por email
  const emailRl = await checkRateLimitDb(email, "/api/libros/comprar:email", {
    maxIntentos: 3, ventanaMs: 60 * 60 * 1000, bloqueoMs: 60 * 60 * 1000, failBehavior: "close",
  });
  if (!emailRl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/libros/comprar");
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  const libro = await prisma.libro.findUnique({
    where: { id: libroId },
    select: { id: true, titulo: true, slug: true, publicado: true, precioCentavos: true },
  });

  if (!libro || !libro.publicado)
    return NextResponse.json({ error: "Este libro no está disponible." }, { status: 404 });

  const precio = libro.precioCentavos ?? 0;
  if (precio < 100)
    return NextResponse.json({ error: "Este libro no tiene un precio válido." }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const pedido = await prisma.pedidoLibro.create({
    data: {
      libroId: libro.id,
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
      `${appUrl}/libros/comprar/exito?pedido_id=${pedido.id}`,
      `${appUrl}/libros/${libro.slug}`,
      {
        descripcion: `Libro: ${libro.titulo}`.slice(0, 127),
        customId: `libro:${pedido.id}`,
      }
    );

    await prisma.pedidoLibro.update({ where: { id: pedido.id }, data: { paypalOrderId } });
    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("PayPal checkout error (libro):", err);
    await prisma.pedidoLibro.update({ where: { id: pedido.id }, data: { estado: "CANCELADO" } });
    return NextResponse.json({ error: "Error al conectar con PayPal. Intenta de nuevo." }, { status: 502 });
  }
}
