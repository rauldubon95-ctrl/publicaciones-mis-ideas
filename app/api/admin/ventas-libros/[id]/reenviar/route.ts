// Reenvío del enlace de descarga de un libro ya comprado.
//
// Caso de uso: un comprador perdió el correo / el acceso y escribe pidiéndolo.
// El admin pulsa "Reenviar enlace" en /admin/ventas-libros y este endpoint
// reenvía el correo con el enlace mágico al MISMO email registrado en el pedido
// (no se acepta un email arbitrario → no hay forma de exfiltrar el acceso a un
// tercero). Solo opera sobre pedidos COMPLETADOS. El token nunca se devuelve al
// cliente: solo viaja en el correo.

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { enviarEnlaceDescargaLibro } from "@/lib/resend";
import { nuevaExpiracionAcceso } from "@/lib/accesoLibro";
import { checkRateLimitDb, getIp, registrarEvento } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const ip = getIp(req);
  // Rate-limit conservador: el admin no debería reenviar más de 30 enlaces/h.
  const rl = await checkRateLimitDb(ip, "/api/admin/ventas-libros/reenviar", {
    maxIntentos: 30,
    ventanaMs: 60 * 60 * 1000,
    bloqueoMs: 15 * 60 * 1000,
    failBehavior: "open",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/admin/ventas-libros/reenviar");
    return NextResponse.json(
      { error: "Demasiados reenvíos. Espera un momento." },
      { status: 429 }
    );
  }

  const { id } = await params;

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { id },
    select: {
      estado: true,
      emailComprador: true,
      nombreComprador: true,
      tokenAcceso: true,
      libro: { select: { titulo: true } },
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

  const enviado = await enviarEnlaceDescargaLibro(
    pedido.emailComprador,
    pedido.libro.titulo,
    pedido.tokenAcceso,
    pedido.nombreComprador ?? undefined
  );

  if (!enviado) {
    return NextResponse.json(
      { error: "No se pudo enviar el correo. Revisa la configuración de Resend." },
      { status: 502 }
    );
  }

  // Reenviar es también "restaurar acceso": renueva la ventana de caducidad y
  // reinicia el contador de descargas, para ayudar a un comprador legítimo que
  // caducó o agotó su tope.
  await prisma.pedidoLibro.update({
    where: { id },
    data: { descargas: 0, expiraAccesoAt: nuevaExpiracionAcceso() },
  }).catch(() => {});

  return NextResponse.json({ ok: true, email: pedido.emailComprador });
}
