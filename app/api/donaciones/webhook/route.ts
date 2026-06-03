// Webhook de PayPal — fuente de verdad para el estado de las donaciones.
//
// PayPal nos llama aquí (configurar en PayPal Dashboard → Webhooks) cada vez
// que un pago cambia de estado. Verificamos la firma con PayPal antes de
// confiar en el contenido, y usamos WebhookEventoProcesado para que un mismo
// evento reenviado no se aplique dos veces.
//
// La página /donar/gracias sigue capturando el pago como UX rápido para el
// donante, pero este webhook es el respaldo que garantiza que toda donación
// completada en PayPal queda registrada en la DB aunque el navegador del
// donante se cierre antes de cargar la página.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarFirmaWebhookPayPal } from "@/lib/paypal";
import { nuevaExpiracionAcceso } from "@/lib/accesoLibro";
import {
  enviarNotificacionDonacion,
  enviarEnlaceAccesoContenido,
  enviarEnlaceDescargaLibro,
  enviarNotificacionCompraLibro,
  enviarEnlaceAccesoRecurso,
  enviarNotificacionCompraRecurso,
  enviarEnlaceAccesoDashboard,
  enviarNotificacionCompraDashboard,
} from "@/lib/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    amount?: { value?: string; currency_code?: string };
    // custom_id puede estar a nivel de captura O dentro de purchase_units;
    // cuando va a nivel de orden suele aparecer aquí.
    custom_id?: string;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
    payer?: { name?: { given_name?: string; surname?: string } };
  };
}

const PREFIJO_CONTENIDO = "contenido:";
const PREFIJO_LIBRO = "libro:";
const PREFIJO_RECURSO = "recurso:";
const PREFIJO_DASHBOARD = "dashboard:";

export async function POST(req: NextRequest) {
  // Necesitamos el body crudo (texto exacto) para que PayPal pueda verificar la firma.
  const rawBody = await req.text();

  const firmaOk = await verificarFirmaWebhookPayPal(req.headers, rawBody);
  if (!firmaOk) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!event.id || !event.event_type) {
    return NextResponse.json({ error: "Evento mal formado" }, { status: 400 });
  }

  // Idempotencia: si ya procesamos este eventId, salir silenciosamente.
  try {
    await prisma.webhookEventoProcesado.create({
      data: {
        eventId: event.id,
        proveedor: "paypal",
        tipoEvento: event.event_type,
      },
    });
  } catch {
    // Conflict en clave única = evento ya procesado. Responder 200 para que
    // PayPal deje de reintentar.
    return NextResponse.json({ ok: true, duplicado: true });
  }

  try {
    const customId = event.resource?.custom_id ?? "";
    const esCompraContenido = customId.startsWith(PREFIJO_CONTENIDO);
    const esCompraLibro = customId.startsWith(PREFIJO_LIBRO);
    const esCompraRecurso = customId.startsWith(PREFIJO_RECURSO);
    const esCompraDashboard = customId.startsWith(PREFIJO_DASHBOARD);

    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        if (esCompraContenido) {
          await procesarCompraContenidoCompletada(event, customId);
        } else if (esCompraLibro) {
          await procesarCompraLibroCompletada(event, customId);
        } else if (esCompraRecurso) {
          await procesarCompraRecursoCompletada(event, customId);
        } else if (esCompraDashboard) {
          await procesarCompraDashboardCompletada(event, customId);
        } else {
          await procesarDonacionCompletada(event);
        }
        break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        if (esCompraContenido) {
          await marcarPedidoPorCustomId(customId, "FALLIDO");
        } else if (esCompraLibro) {
          await marcarPedidoLibroPorCustomId(customId, "FALLIDO");
        } else if (esCompraRecurso) {
          await marcarPedidoRecursoPorCustomId(customId, "FALLIDO");
        } else if (esCompraDashboard) {
          await marcarPedidoDashboardPorCustomId(customId, "FALLIDO");
        } else {
          await marcarDonacionPorOrderId(event, "FALLIDO");
        }
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        if (esCompraContenido) {
          await marcarPedidoPorCustomId(customId, "CANCELADO");
        } else if (esCompraLibro) {
          await marcarPedidoLibroPorCustomId(customId, "CANCELADO");
        } else if (esCompraRecurso) {
          await marcarPedidoRecursoPorCustomId(customId, "CANCELADO");
        } else if (esCompraDashboard) {
          await marcarPedidoDashboardPorCustomId(customId, "CANCELADO");
        } else {
          await marcarDonacionPorOrderId(event, "CANCELADO");
        }
        break;
    }
  } catch (err) {
    console.error("[paypal-webhook] error procesando", event.event_type, err);
    // No devolvemos 500 — el evento ya quedó marcado como procesado. Reintentos
    // de PayPal no nos ayudarían.
  }

  return NextResponse.json({ ok: true });
}

async function procesarDonacionCompletada(event: PayPalWebhookEvent) {
  const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
  const montoStr = event.resource?.amount?.value;
  if (!orderId || !montoStr) return;

  const donacion = await prisma.donacion.findUnique({
    where: { stripeId: orderId },
    select: { id: true, estado: true, correo: true, nombre: true },
  });
  if (!donacion) return;

  // updateMany para que el WHERE incluya el estado: solo actualizamos si está
  // en PENDIENTE. Si ya estaba COMPLETADO (porque la página /donar/gracias se
  // adelantó), no enviamos doble correo.
  const r = await prisma.donacion.updateMany({
    where: { id: donacion.id, estado: "PENDIENTE" },
    data: { estado: "COMPLETADO" },
  });

  if (r.count > 0) {
    const nombrePayPal = [
      event.resource?.payer?.name?.given_name,
      event.resource?.payer?.name?.surname,
    ]
      .filter(Boolean)
      .join(" ");
    const nombreFinal = nombrePayPal || donacion.nombre || "Anónimo";
    await enviarNotificacionDonacion(
      montoStr,
      nombreFinal,
      donacion.correo,
      donacion.id
    ).catch(() => {});
  }
}

async function marcarDonacionPorOrderId(
  event: PayPalWebhookEvent,
  estado: string
) {
  const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
  if (!orderId) return;
  await prisma.donacion.updateMany({
    where: { stripeId: orderId },
    data: { estado },
  });
}

async function procesarCompraContenidoCompletada(
  event: PayPalWebhookEvent,
  customId: string
) {
  const pedidoId = customId.slice(PREFIJO_CONTENIDO.length);
  if (!pedidoId) return;

  const r = await prisma.pedidoContenido.updateMany({
    where: { id: pedidoId, estado: "PENDIENTE" },
    data: { estado: "COMPLETADO", completadoAt: new Date() },
  });

  if (r.count === 0) return; // ya estaba procesado

  const pedido = await prisma.pedidoContenido.findUnique({
    where: { id: pedidoId },
    select: {
      tokenAcceso: true,
      emailComprador: true,
      nombreComprador: true,
      publicacion: { select: { titulo: true, slug: true } },
    },
  });
  if (!pedido) return;

  await enviarEnlaceAccesoContenido(
    pedido.emailComprador,
    pedido.publicacion.titulo,
    pedido.publicacion.slug,
    pedido.tokenAcceso,
    pedido.nombreComprador
  ).catch(() => {});
}

async function marcarPedidoPorCustomId(customId: string, estado: string) {
  const pedidoId = customId.slice(PREFIJO_CONTENIDO.length);
  if (!pedidoId) return;
  await prisma.pedidoContenido.updateMany({
    where: { id: pedidoId },
    data: { estado },
  });
}

async function procesarCompraLibroCompletada(
  event: PayPalWebhookEvent,
  customId: string
) {
  const pedidoId = customId.slice(PREFIJO_LIBRO.length);
  if (!pedidoId) return;

  const montoStr = event.resource?.amount?.value ?? "0";

  const r = await prisma.pedidoLibro.updateMany({
    where: { id: pedidoId, estado: "PENDIENTE" },
    data: {
      estado: "COMPLETADO",
      completadoAt: new Date(),
      expiraAccesoAt: nuevaExpiracionAcceso(),
    },
  });

  if (r.count === 0) return; // ya estaba procesado

  const pedido = await prisma.pedidoLibro.findUnique({
    where: { id: pedidoId },
    select: {
      tokenAcceso: true,
      emailComprador: true,
      nombreComprador: true,
      libro: { select: { titulo: true } },
    },
  });
  if (!pedido) return;

  await Promise.all([
    enviarEnlaceDescargaLibro(
      pedido.emailComprador,
      pedido.libro.titulo,
      pedido.tokenAcceso,
      pedido.nombreComprador ?? undefined
    ).catch(() => {}),
    enviarNotificacionCompraLibro(
      montoStr,
      pedido.libro.titulo,
      pedido.emailComprador,
      pedido.nombreComprador
    ).catch(() => {}),
  ]);
}

async function marcarPedidoLibroPorCustomId(customId: string, estado: string) {
  const pedidoId = customId.slice(PREFIJO_LIBRO.length);
  if (!pedidoId) return;
  await prisma.pedidoLibro.updateMany({
    where: { id: pedidoId },
    data: { estado },
  });
}

async function procesarCompraRecursoCompletada(
  event: PayPalWebhookEvent,
  customId: string
) {
  const pedidoId = customId.slice(PREFIJO_RECURSO.length);
  if (!pedidoId) return;

  const montoStr = event.resource?.amount?.value ?? "0";

  const r = await prisma.pedidoRecurso.updateMany({
    where: { id: pedidoId, estado: "PENDIENTE" },
    data: { estado: "COMPLETADO", completadoAt: new Date() },
  });

  if (r.count === 0) return; // ya estaba procesado

  const pedido = await prisma.pedidoRecurso.findUnique({
    where: { id: pedidoId },
    select: {
      tokenAcceso: true,
      emailComprador: true,
      nombreComprador: true,
      recurso: { select: { titulo: true } },
    },
  });
  if (!pedido) return;

  await Promise.all([
    enviarEnlaceAccesoRecurso(
      pedido.emailComprador,
      pedido.recurso.titulo,
      pedido.tokenAcceso,
      pedido.nombreComprador ?? undefined
    ).catch(() => {}),
    enviarNotificacionCompraRecurso(
      montoStr,
      pedido.recurso.titulo,
      pedido.emailComprador,
      pedido.nombreComprador
    ).catch(() => {}),
  ]);
}

async function marcarPedidoRecursoPorCustomId(customId: string, estado: string) {
  const pedidoId = customId.slice(PREFIJO_RECURSO.length);
  if (!pedidoId) return;
  await prisma.pedidoRecurso.updateMany({
    where: { id: pedidoId },
    data: { estado },
  });
}

async function procesarCompraDashboardCompletada(
  event: PayPalWebhookEvent,
  customId: string
) {
  const pedidoId = customId.slice(PREFIJO_DASHBOARD.length);
  if (!pedidoId) return;

  const montoStr = event.resource?.amount?.value ?? "0";

  const r = await prisma.pedidoDashboard.updateMany({
    where: { id: pedidoId, estado: "PENDIENTE" },
    data: { estado: "COMPLETADO", completadoAt: new Date() },
  });

  if (r.count === 0) return; // ya estaba procesado

  const pedido = await prisma.pedidoDashboard.findUnique({
    where: { id: pedidoId },
    select: {
      tokenAcceso: true,
      emailComprador: true,
      nombreComprador: true,
      tablero: { select: { titulo: true } },
    },
  });
  if (!pedido) return;

  await Promise.all([
    enviarEnlaceAccesoDashboard(
      pedido.emailComprador,
      pedido.tablero.titulo,
      pedido.tokenAcceso,
      pedido.nombreComprador ?? undefined
    ).catch(() => {}),
    enviarNotificacionCompraDashboard(
      montoStr,
      pedido.tablero.titulo,
      pedido.emailComprador,
      pedido.nombreComprador
    ).catch(() => {}),
  ]);
}

async function marcarPedidoDashboardPorCustomId(customId: string, estado: string) {
  const pedidoId = customId.slice(PREFIJO_DASHBOARD.length);
  if (!pedidoId) return;
  await prisma.pedidoDashboard.updateMany({
    where: { id: pedidoId },
    data: { estado },
  });
}
