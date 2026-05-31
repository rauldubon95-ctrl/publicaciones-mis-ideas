const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
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
  if (!res.ok) throw new Error("PayPal auth fallida");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function crearOrdenPayPal(
  montoCentavos: number,
  returnUrl: string,
  cancelUrl: string
): Promise<{ id: string; approvalUrl: string }> {
  const token = await getToken();
  const valor = (montoCentavos / 100).toFixed(2);

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: valor },
          description: "Donación — Raúl Dubón",
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: "Raúl Dubón",
        user_action: "PAY_NOW",
        landing_page: "LOGIN",
      },
    }),
  });

  if (!res.ok) throw new Error(`PayPal orden error: ${await res.text()}`);

  const order = (await res.json()) as {
    id: string;
    links: Array<{ rel: string; href: string }>;
  };

  const link = order.links.find((l) => l.rel === "approve");
  if (!link) throw new Error("No se encontró el enlace de aprobación");

  return { id: order.id, approvalUrl: link.href };
}

export async function capturarOrdenPayPal(orderId: string): Promise<{
  completado: boolean;
  monto: string;
  nombre: string;
}> {
  const token = await getToken();

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
