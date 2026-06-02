import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Solo accesible con token interno o desde Vercel Cron
  const token = req.headers.get("x-health-token");
  const esperado = process.env.HEALTH_TOKEN;
  if (!esperado || !token || !safeCompare(token, esperado)) {
    return NextResponse.json({ status: "ok" });
  }

  // Presencia de variables críticas. NO leakeamos valores — solo si están seteadas.
  // Sirve para detectar de un vistazo si una variable faltante está rompiendo
  // flujos silenciosos (ej: webhook PayPal sin PAYPAL_WEBHOOK_ID rechaza con 401
  // y el comprador nunca recibe magic link). Ver §18 P2 en CLAUDE.md.
  const config = {
    paypal_webhook_id: !!process.env.PAYPAL_WEBHOOK_ID,
    paypal_client_id: !!process.env.PAYPAL_CLIENT_ID,
    paypal_client_secret: !!process.env.PAYPAL_CLIENT_SECRET,
    paypal_env: process.env.PAYPAL_ENV ?? null,
    resend_api_key: !!process.env.RESEND_API_KEY,
    session_signing_secret: !!process.env.SESSION_SIGNING_SECRET,
    d1_sync_secret: !!process.env.D1_SYNC_SECRET,
    supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected", config });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json(
      { status: "error", db: "unreachable", error: err.message.slice(0, 100), config },
      { status: 500 }
    );
  }
}
