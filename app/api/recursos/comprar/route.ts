import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearOrdenPayPal } from "@/lib/paypal";
import { checkRateLimitDb, registrarEvento, getIp } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  const rl = await checkRateLimitDb(ip, "/api/recursos/comprar", {
    maxIntentos: 20, ventanaMs: 60 * 60 * 1000, bloqueoMs: 30 * 60 * 1000, failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/recursos/comprar");
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const recursoId = typeof body.recursoId === "string" ? body.recursoId : "";
  const email     = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const nombre    = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";

  if (!recursoId) return NextResponse.json({ error: "Falta el identificador del recurso." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 422 });

  const recurso = await prisma.recursoHtml.findUnique({
    where: { id: recursoId },
    select: { id: true, titulo: true, slug: true, publicado: true, esPremium: true, precioCentavos: true },
  });

  if (!recurso || !recurso.publicado || !recurso.esPremium)
    return NextResponse.json({ error: "Este recurso no está disponible para compra." }, { status: 404 });

  const precio = recurso.precioCentavos ?? 0;
  if (precio < 100)
    return NextResponse.json({ error: "Este recurso no tiene un precio válido." }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const pedido = await prisma.pedidoRecurso.create({
    data: {
      recursoId: recurso.id,
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
      `${appUrl}/recursos/comprar/exito?pedido_id=${pedido.id}`,
      `${appUrl}/recursos/${recurso.slug}`,
      {
        descripcion: `Recurso: ${recurso.titulo}`.slice(0, 127),
        customId: `recurso:${pedido.id}`,
      }
    );

    await prisma.pedidoRecurso.update({ where: { id: pedido.id }, data: { paypalOrderId } });
    return NextResponse.json({ url: approvalUrl });
  } catch (err) {
    console.error("PayPal checkout error (recurso):", err);
    await prisma.pedidoRecurso.update({ where: { id: pedido.id }, data: { estado: "CANCELADO" } });
    return NextResponse.json({ error: "Error al conectar con PayPal. Intenta de nuevo." }, { status: 502 });
  }
}
