// Reenvío del enlace de acceso a un tablero (dashboard) premium ya comprado.
// Mismo patrón que ventas-libros/[id]/reenviar: admin-only, solo al email del
// pedido, solo COMPLETADO, rate-limit, token nunca devuelto al cliente.

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { enviarEnlaceAccesoDashboard } from "@/lib/resend";
import { nuevaExpiracionAcceso } from "@/lib/accesoComun";
import { checkRateLimitDb, getIp, registrarEvento } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const ip = getIp(req);
  const rl = await checkRateLimitDb(ip, "/api/admin/ventas-dashboards/reenviar", {
    maxIntentos: 30,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 15 * 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/admin/ventas-dashboards/reenviar");
    return NextResponse.json(
      { error: "Demasiados reenvíos. Espera un momento." },
      { status: 429 }
    );
  }

  const { id } = await params;

  const pedido = await prisma.pedidoDashboard.findUnique({
    where: { id },
    select: {
      estado: true,
      emailComprador: true,
      nombreComprador: true,
      tokenAcceso: true,
      tablero: { select: { titulo: true } },
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

  const enviado = await enviarEnlaceAccesoDashboard(
    pedido.emailComprador,
    pedido.tablero.titulo,
    pedido.tokenAcceso,
    pedido.nombreComprador ?? undefined
  );

  if (!enviado) {
    return NextResponse.json(
      { error: "No se pudo enviar el correo. Revisa la configuración de Resend." },
      { status: 502 }
    );
  }

  // Reenviar es también "restaurar acceso": reinicia el contador de descargas y
  // renueva la ventana de caducidad de la descarga. La lectura nunca se afecta.
  await prisma.pedidoDashboard.update({
    where: { id },
    data: { descargas: 0, expiraAccesoAt: nuevaExpiracionAcceso() },
  }).catch(() => {});

  return NextResponse.json({ ok: true, email: pedido.emailComprador });
}
