import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearOrdenPayPal } from "@/lib/paypal";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimitDb(ip, "/api/dashboard/comprar", {
    maxIntentos: 20, ventanaMs: 60 * 60 * 1000, bloqueoMs: 30 * 60 * 1000, failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/dashboard/comprar");
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const tableroId = typeof body.tableroId === "string" ? body.tableroId : "";
  const email     = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const nombre    = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";

  if (!tableroId) return NextResponse.json({ error: "Falta el identificador del tablero." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 422 });

  const tablero = await prisma.tablero.findUnique({
    where: { id: tableroId },
    select: { id: true, titulo: true, slug: true, publicado: true, esPremium: true, precioCentavos: true },
  });

  if (!tablero || !tablero.publicado || !tablero.esPremium)
    return NextResponse.json({ error: "Este tablero no está disponible para compra." }, { status: 404 });

  const precio = tablero.precioCentavos ?? 0;
  if (precio < 100)
    return NextResponse.json({ error: "Este tablero no tiene un precio válido." }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const pedido = await prisma.pedidoDashboard.create({
    data: {
      tableroId: tablero.id,
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
      `${appUrl}/dashboard/comprar/exito?pedido_id=${pedido.id}`,
      `${appUrl}/dashboard/${tablero.slug}`,
      {
        descripcion: `Tablero: ${tablero.titulo}`.slice(0, 127),
        customId: `dashboard:${pedido.id}`,
      }
    );

    await prisma.pedidoDashboard.update({ where: { id: pedido.id }, data: { paypalOrderId } });
    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("PayPal checkout error (dashboard):", err);
    await prisma.pedidoDashboard.update({ where: { id: pedido.id }, data: { estado: "CANCELADO" } });
    return NextResponse.json({ error: "Error al conectar con PayPal. Intenta de nuevo." }, { status: 502 });
  }
}
