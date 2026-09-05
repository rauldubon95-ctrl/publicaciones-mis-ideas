import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { sessionSecret } from "@/lib/secrets";
import { fetchConTimeout } from "@/lib/timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy admin → Worker /embed.
// El Worker requiere HMAC(sessionSecret, "premium-bypass-v1") en X-Admin-Key
// (formato estático usado solo por el endpoint /embed del worker).
// Este endpoint hace UNA llamada por invocación; el frontend orquesta el loop.
export async function POST() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "SESSION_SIGNING_SECRET no configurado" }, { status: 500 });
  }

  const workerUrl = process.env.WORKER_URL ?? "https://sociologia.raul-dubon95.workers.dev";
  const adminKey = createHmac("sha256", secret).update("premium-bypass-v1").digest("hex");

  try {
    const res = await fetchConTimeout(
      `${workerUrl}/embed`,
      {
        method: "POST",
        headers: { "X-Admin-Key": adminKey, "Content-Type": "application/json" },
        body: "{}",
      },
      45_000
    );

    // Leemos como texto primero para poder mostrarlo aun si no es JSON
    const bodyText = await res.text();

    if (!res.ok) {
      // Diagnóstico ampliado (SIN exponer el secret ni el HMAC).
      // Solo dice si están presentes, no su valor.
      return NextResponse.json(
        {
          error: "Worker rechazó la petición",
          workerStatus: res.status,
          workerBody: bodyText.slice(0, 500),
          diagnostico: {
            workerUrlUsada: workerUrl,
            workerUrlDeEnv: !!process.env.WORKER_URL,
            sessionSecretPresente: !!secret,
            longitudHmacEnviado: adminKey.length,
            hmacPrimerosCaracteres: adminKey.slice(0, 8),
            hmacUltimosCaracteres: adminKey.slice(-4),
          },
        },
        { status: res.status }
      );
    }

    try {
      return NextResponse.json(JSON.parse(bodyText), { status: 200 });
    } catch {
      return NextResponse.json({ error: "Worker respondió con body no-JSON", workerBody: bodyText.slice(0, 500) }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Fallo al contactar Worker", detalle: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
