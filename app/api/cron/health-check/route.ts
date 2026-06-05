// Vigilante interno de salud. Vercel Cron llama a este endpoint según el bloque
// "crons" de vercel.json. Ejecuta el chequeo profundo de dependencias y, SOLO si
// algo está degradado, envía un correo de alerta al admin (Resend). En estado
// sano no hace nada (no genera spam).
//
// Autenticación: Vercel Cron incluye automáticamente el header
// `Authorization: Bearer <CRON_SECRET>` cuando existe la env var CRON_SECRET.
// Rechazamos cualquier petición que no la traiga, para que nadie dispare alertas
// desde fuera. Sin CRON_SECRET configurada, el endpoint responde 401 a todos
// (queda inerte hasta que se configure en Vercel).
//
// LIMITACIÓN HONESTA: corre dentro de la misma app, así que detecta fallos
// PARCIALES (base de datos / Worker / Storage caídos mientras la web responde).
// NO detecta una caída TOTAL de la web (si la app está muerta, este cron tampoco
// corre). Para caídas totales hace falta un monitor EXTERNO (p.ej. UptimeRobot)
// apuntando a /api/health/deep. En el plan Hobby de Vercel los crons corren como
// máximo 1 vez al día; al pasar a Pro se puede subir la frecuencia en vercel.json.

import { NextRequest, NextResponse } from "next/server";
import { safeCompare } from "@/lib/auth";
import { chequearDependencias } from "@/lib/healthChecks";
import { enviarAlertaSalud } from "@/lib/resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || !auth || !safeCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const checks = await chequearDependencias();

  const fallidos = (
    [
      { nombre: "Base de datos", estado: checks.db },
      { nombre: "Worker de IA", estado: checks.worker },
      { nombre: "Storage", estado: checks.storage },
    ] as const
  )
    .filter((c) => !c.estado.ok)
    .map((c) => ({ nombre: c.nombre, error: c.estado.error }));

  if (fallidos.length > 0) {
    await enviarAlertaSalud(fallidos).catch(() => {});
    return NextResponse.json(
      { status: "degraded", checks, alertados: fallidos.map((f) => f.nombre) },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: "ok", checks });
}
