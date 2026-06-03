// Reenvío del enlace de acceso a un recurso premium ya comprado.
// Mismo patrón que ventas-libros/[id]/reenviar: admin-only, solo al email del
// pedido, solo COMPLETADO, rate-limit, token nunca devuelto al cliente.

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { enviarEnlaceAccesoRecurso } from "@/lib/resend";
import { checkRateLimitDb, getIp, registrarEvento } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const ip = getIp(req);
  const rl = await checkRateLimitDb(ip, "/api/admin/ventas-recursos/reenviar", {
    maxIntentos: 30,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 15 * 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/admin/ventas-recursos/reenviar");
    return NextResponse.json(
      { error: "Demasiados reenvíos. Espera un momento." },
      { status: 429 }
    );
  }

  const { id } = await params;

  const pedido = await prisma.pedidoRecurso.findUnique({
    where: { id },
    select: {
      estado: true,
      emailComprador: true,
      nombreComprador: true,
      tokenAcceso: true,
      recurso: { select: { titulo: true } },
    },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }
  if (pedido.estado !== "COMPLETADO") {
    return NextResponse.json(
      { error: "Solo se puede reenviar el enlace de compras completadas." },
      { status: 409 }
    );
  }

  const enviado = await enviarEnlaceAccesoRecurso(
    pedido.emailComprador,
    pedido.recurso.titulo,
    pedido.tokenAcceso,
    pedido.nombreComprador ?? undefined
  );

  if (!enviado) {
    return NextResponse.json(
      { error: "No se pudo enviar el correo. Revisa la configuración de Resend." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, email: pedido.emailComprador });
}
