import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const healthToken = process.env.HEALTH_TOKEN;
  const qToken = req.nextUrl.searchParams.get("token");
  const tokenOk = healthToken && qToken === healthToken;
  const sessionOk = tokenOk ? false : await isAdminAuthorized();
  if (!tokenOk && !sessionOk) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const env = process.env.PAYPAL_ENV;
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const base =
    env === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  const result: Record<string, unknown> = {
    PAYPAL_ENV: env ?? "(no configurado)",
    base_url: base,
    NEXT_PUBLIC_APP_URL: appUrl || "(vacío)",
    PAYPAL_CLIENT_ID_set: !!id,
    PAYPAL_CLIENT_SECRET_set: !!secret,
  };

  if (!id || !secret) {
    return NextResponse.json({ ...result, error: "Credenciales no configuradas" });
  }

  // Paso 1: obtener token
  let token = "";
  try {
    const creds = btoa(`${id}:${secret}`);
    const authRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    const authBody = await authRes.text();
    result.auth_status = authRes.status;
    result.auth_ok = authRes.ok;
    if (!authRes.ok) {
      result.auth_error = authBody.slice(0, 400);
      return NextResponse.json(result);
    }
    token = (JSON.parse(authBody) as { access_token: string }).access_token;
    result.auth_ok = true;
  } catch (err) {
    result.auth_error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(result);
  }

  // Paso 2: crear orden de prueba ($1)
  const returnUrl = `${appUrl}/donar/gracias?donacion_id=TEST`;
  const cancelUrl = `${appUrl}/donar`;
  result.return_url_usado = returnUrl;
  result.cancel_url_usado = cancelUrl;

  try {
    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: "1.00" }, description: "Test" }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: "Raúl Dubón",
          user_action: "PAY_NOW",
          landing_page: "BILLING",
          locale: "es-MX",
        },
      }),
    });
    const orderBody = await orderRes.text();
    result.orden_status = orderRes.status;
    result.orden_ok = orderRes.ok;
    result.orden_body = orderBody.slice(0, 600);
  } catch (err) {
    result.orden_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
