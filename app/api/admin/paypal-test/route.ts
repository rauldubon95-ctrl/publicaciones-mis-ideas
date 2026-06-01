import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Acepta sesión admin O el HEALTH_TOKEN como query param ?token=...
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

  const diagnostico = {
    PAYPAL_ENV: env ?? "(no configurado)",
    PAYPAL_CLIENT_ID_set: !!id,
    PAYPAL_CLIENT_ID_preview: id ? `${id.slice(0, 8)}...` : null,
    PAYPAL_CLIENT_SECRET_set: !!secret,
    base_url:
      env === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com",
    auth_resultado: null as string | null,
    auth_status: null as number | null,
    auth_body: null as string | null,
  };

  if (!id || !secret) {
    return NextResponse.json({
      ...diagnostico,
      error: "Credenciales no configuradas",
    });
  }

  try {
    const base =
      env === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    const creds = btoa(`${id}:${secret}`);
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    const body = await res.text();
    diagnostico.auth_status = res.status;
    diagnostico.auth_body = body.slice(0, 300);
    diagnostico.auth_resultado = res.ok ? "OK" : "FALLO";
  } catch (err) {
    diagnostico.auth_resultado = "ERROR_RED";
    diagnostico.auth_body =
      err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnostico);
}
