import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { sessionSecret } from "@/lib/secrets";
import { fetchConTimeout } from "@/lib/timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Proxy admin → Worker /embed.
// Genera el token en el MISMO formato nuevo que /api/asistente/token
// ({hmac}.{jti}.{exp}) y lo envía como X-Premium-Token. Si el chat con
// premium funciona, este endpoint funciona por la misma ruta de auth.
// Además prueba fallback al formato legado hex si el nuevo falla.
export async function POST() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "SESSION_SIGNING_SECRET no configurado" }, { status: 500 });
  }

  const workerUrl = process.env.WORKER_URL ?? "https://sociologia.raul-dubon95.workers.dev";

  // Token nuevo (formato con jti+exp, igual que el chat)
  const jti = randomUUID();
  const exp = Date.now() + 60 * 60 * 1000; // 1 hora
  const messageNuevo = `premium-bypass-v1:${jti}:${exp}`;
  const hmacNuevo = createHmac("sha256", secret).update(messageNuevo).digest("hex");
  const tokenNuevo = `${hmacNuevo}.${jti}.${exp}`;

  // Token legado (HMAC estático)
  const tokenLegado = createHmac("sha256", secret).update("premium-bypass-v1").digest("hex");

  async function llamarWorker(token: string, headerName: string) {
    return await fetchConTimeout(
      `${workerUrl}/embed`,
      {
        method: "POST",
        headers: { [headerName]: token, "Content-Type": "application/json" },
        body: "{}",
      },
      45_000
    );
  }

  try {
    // Intento 1: token nuevo con X-Premium-Token (misma auth que chat)
    let res = await llamarWorker(tokenNuevo, "X-Premium-Token");
    let intentoUsado = "X-Premium-Token(nuevo)";

    // Intento 2: si falla con 401, prueba token legado con X-Admin-Key
    if (res.status === 401) {
      res = await llamarWorker(tokenLegado, "X-Admin-Key");
      intentoUsado = "X-Admin-Key(legado)";
    }

    const bodyText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "Worker rechazó la petición (ambos intentos)",
          workerStatus: res.status,
          workerBody: bodyText.slice(0, 500),
          diagnostico: {
            workerUrlUsada: workerUrl,
            workerUrlDeEnv: !!process.env.WORKER_URL,
            sessionSecretPresente: !!secret,
            longitudSecret: secret.length,
            hmacNuevoPrimero: hmacNuevo.slice(0, 8),
            hmacLegadoPrimero: tokenLegado.slice(0, 8),
            ultimoIntento: intentoUsado,
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
