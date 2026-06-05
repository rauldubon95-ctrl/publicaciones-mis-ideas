// Chequeos de liveness de las tres dependencias externas (base de datos, Worker
// de IA y Storage), compartidos por /api/health/deep (consulta externa) y por el
// vigilante /api/cron/health-check (alerta por correo). Centralizar evita
// duplicar la lógica y mantiene un único lugar para ajustar timeouts o añadir
// dependencias.
//
// SOLO LECTURA: ninguna comprobación escribe ni toca flujos de negocio.

import { prisma } from "@/lib/prisma";
import { conTimeout, fetchConTimeout } from "@/lib/timeout";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const WORKER_URL = "https://sociologia.raul-dubon95.workers.dev";

export interface EstadoDependencia {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

// Ejecuta un chequeo, mide su latencia y captura cualquier error/timeout sin
// propagarlo (un chequeo que falla no debe tumbar al que lo invoca).
async function medir(fn: () => Promise<void>): Promise<EstadoDependencia> {
  const inicio = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - inicio };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, latencyMs: Date.now() - inicio, error: err.message.slice(0, 120) };
  }
}

export interface ChequeoSalud {
  db: EstadoDependencia;
  worker: EstadoDependencia;
  storage: EstadoDependencia;
}

// Sondea las tres dependencias en paralelo, cada una con timeout de 5s.
export async function chequearDependencias(): Promise<ChequeoSalud> {
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

  return { db, worker, storage };
}
