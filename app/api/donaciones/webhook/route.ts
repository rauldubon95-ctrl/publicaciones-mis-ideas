import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// En App Router no se necesita bodyParser: false.
// req.text() devuelve el cuerpo sin parsear — necesario para verificar la firma.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Falta la firma o el secreto del webhook." },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook: firma inválida:", err);
    return NextResponse.json(
      { error: "Firma del webhook inválida." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donacionId = session.metadata?.donacionId;
        if (donacionId) {
          await prisma.donacion.update({
            where: { id: donacionId },
            data: { estado: "COMPLETADO", stripeId: session.id },
          });
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donacionId = session.metadata?.donacionId;
        if (donacionId) {
          await prisma.donacion.update({
            where: { id: donacionId },
            data: { estado: "COMPLETADO", stripeId: session.id },
          });
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donacionId = session.metadata?.donacionId;
        if (donacionId) {
          await prisma.donacion.update({
            where: { id: donacionId },
            data: { estado: "FALLIDO" },
          });
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donacionId = session.metadata?.donacionId;
        if (donacionId) {
          await prisma.donacion.update({
            where: { id: donacionId },
            data: { estado: "CANCELADO" },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook: error procesando evento:", event.type, err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
