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
import { enviarNotificacionDonacion } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    amount?: { value?: string; currency_code?: string };
    custom_id?: string;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
    payer?: { name?: { given_name?: string; surname?: string } };
  };
}

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
    switch (event.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        await procesarCaptureCompleted(event);
        break;
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED":
        await marcarPorOrderId(event, "FALLIDO");
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
        await marcarPorOrderId(event, "CANCELADO");
        break;
      // Otros eventos (CHECKOUT.ORDER.APPROVED, etc.) — registrados pero no actúan.
    }
  } catch (err) {
    console.error("[paypal-webhook] error procesando", event.event_type, err);
    // No devolvemos 500 — el evento ya quedó marcado como procesado. Reintentos
    // de PayPal no nos ayudarían.
  }

  return NextResponse.json({ ok: true });
}

async function procesarCaptureCompleted(event: PayPalWebhookEvent) {
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

async function marcarPorOrderId(event: PayPalWebhookEvent, estado: string) {
  const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
  if (!orderId) return;
  await prisma.donacion.updateMany({
    where: { stripeId: orderId },
    data: { estado },
  });
}
