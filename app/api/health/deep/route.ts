// Health check "profundo" (Fase 3 — resiliencia). Verifica la liveness de las
// tres dependencias externas con timeout y latencia: base de datos (Prisma),
// Worker de IA (sociologia) y Storage (Supabase). A diferencia de /api/health
// (que solo hace SELECT 1 + presencia de envs), este sondea cada dependencia
// para detectar caídas parciales.
//
// SOLO LECTURA: no escribe nada, no toca flujos de negocio. Protegido con
// HEALTH_TOKEN igual que /api/health (sin token válido devuelve un 200 mínimo
// para no filtrar el estado interno a terceros).
//
// Códigos: 200 si todo está sano, 503 si alguna dependencia falla (útil para
// alertas de uptime).

import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/auth";
import { chequearDependencias } from "@/lib/healthChecks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-health-token");
  const esperado = process.env.HEALTH_TOKEN;
  if (!esperado || !token || !safeCompare(token, esperado)) {
    // No autorizado: respuesta mínima + delay aleatorio para eliminar el
    // timing side-channel que revela la existencia del endpoint.
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    return NextResponse.json({ status: "ok" });
  }

  const checks = await chequearDependencias();
  const sano = checks.db.ok && checks.worker.ok && checks.storage.ok;

  return NextResponse.json(
    {
      status: sano ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: sano ? 200 : 503 }
  );
}
