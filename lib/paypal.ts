function getBase(): string {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getToken(): Promise<string> {
  const BASE = getBase();
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  console.log(`[paypal] env=${process.env.PAYPAL_ENV} base=${BASE} id_set=${!!id} secret_set=${!!secret}`);
  if (!id || !secret) throw new Error("Credenciales PayPal no configuradas");

  const creds = btoa(`${id}:${secret}`);
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[paypal] auth fallida status=${res.status} body=${body}`);
    throw new Error(`PayPal auth fallida (${res.status}): ${body}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function crearOrdenPayPal(
  montoCentavos: number,
  returnUrl: string,
  cancelUrl: string,
  opciones: {
    descripcion?: string;
    customId?: string; // se usa para distinguir donaciones de compras en el webhook
  } = {}
): Promise<{ id: string; approvalUrl: string }> {
  const token = await getToken();
  const BASE = getBase();
  const valor = (montoCentavos / 100).toFixed(2);

  const purchaseUnit: Record<string, unknown> = {
    amount: { currency_code: "USD", value: valor },
    description: opciones.descripcion ?? "Donación — Raúl Dubón",
  };
  if (opciones.customId) purchaseUnit.custom_id = opciones.customId;

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: "Raúl Dubón",
        user_action: "PAY_NOW",
        landing_page: "BILLING",
        locale: "es_MX",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[paypal] orden fallida status=${res.status} body=${body}`);
    throw new Error(`PayPal orden error: ${body}`);
  }

  const order = (await res.json()) as {
    id: string;
    links: Array<{ rel: string; href: string }>;
  };

  const link = order.links.find((l) => l.rel === "approve");
  if (!link) throw new Error("No se encontró el enlace de aprobación");

  return { id: order.id, approvalUrl: link.href };
}

// ─── Verificación de firma de webhook PayPal ──────────────────────────────────
// PayPal firma cada webhook con headers `paypal-transmission-*`. Llamamos a
// /v1/notifications/verify-webhook-signature con esos headers + el body crudo
// + el webhook ID (configurado en PayPal Dashboard) para que PayPal nos
// confirme que la firma es válida.
export async function verificarFirmaWebhookPayPal(
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID no configurado");
    return false;
  }

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const token = await getToken();
  const BASE = getBase();

  const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  if (!res.ok) {
    console.error("[paypal-webhook] verify falló:", res.status, await res.text());
    return false;
  }

  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

export async function capturarOrdenPayPal(orderId: string): Promise<{
  completado: boolean;
  monto: string;
  nombre: string;
}> {
  const token = await getToken();
  const BASE = getBase();

  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`PayPal captura error: ${await res.text()}`);

  const data = (await res.json()) as {
    status: string;
    purchase_units: Array<{
      payments: { captures: Array<{ amount: { value: string } }> };
    }>;
    payer?: { name?: { given_name?: string; surname?: string } };
  };

  const monto =
    data.purchase_units[0]?.payments?.captures[0]?.amount?.value ?? "0";
  const nombre = [data.payer?.name?.given_name, data.payer?.name?.surname]
    .filter(Boolean)
    .join(" ");

  return { completado: data.status === "COMPLETED", monto, nombre };
}
