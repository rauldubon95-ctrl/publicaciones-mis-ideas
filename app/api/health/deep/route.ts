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
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/auth";
import { conTimeout, fetchConTimeout } from "@/lib/timeout";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORKER_URL = "https://sociologia.raul-dubon95.workers.dev";

interface Estado {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

// Ejecuta un chequeo, mide su latencia y captura cualquier error/timeout sin
// propagarlo (un chequeo que falla no debe tumbar al endpoint).
async function medir(fn: () => Promise<void>): Promise<Estado> {
  const inicio = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - inicio };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, latencyMs: Date.now() - inicio, error: err.message.slice(0, 120) };
  }
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-health-token");
  const esperado = process.env.HEALTH_TOKEN;
  if (!esperado || !token || !safeCompare(token, esperado)) {
    // No autorizado: respuesta mínima, sin detalles del estado interno.
    return NextResponse.json({ status: "ok" });
  }

  const [db, worker, storage] = await Promise.all([
    // Base de datos: un SELECT 1 con timeout corto.
    medir(async () => {
      await conTimeout(prisma.$queryRaw`SELECT 1`, 5000, "db");
    }),
    // Worker de IA: GET a /telemetria sin auth → responde 401 (reachable). No
    // ejecuta trabajo. Cualquier respuesta HTTP = el Worker está vivo.
    medir(async () => {
      await fetchConTimeout(`${WORKER_URL}/telemetria`, { method: "GET" }, 5000);
    }),
    // Storage: listar buckets con el service role (operación barata).
    medir(async () => {
      const { error } = await conTimeout(
        getSupabaseAdmin().storage.listBuckets(),
        5000,
        "storage"
      );
      if (error) throw new Error(error.message);
    }),
  ]);

  const checks = { db, worker, storage };
  const sano = db.ok && worker.ok && storage.ok;

  return NextResponse.json(
    {
      status: sano ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: sano ? 200 : 503 }
  );
}
