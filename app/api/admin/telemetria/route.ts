import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { createHmac } from "crypto";
import { d1SyncSecret } from "@/lib/secrets";

const WORKER_URL = "https://sociologia.raul-dubon95.workers.dev";

export async function GET() {
  const authorized = await isAdminAuthorized();
  if (!authorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const secret = d1SyncSecret();
  if (!secret) {
    return NextResponse.json({ error: "Secreto de sync no configurado" }, { status: 500 });
  }

  const token = createHmac("sha256", secret).update("telemetria-v1").digest("hex");

  try {
    const res = await fetch(`${WORKER_URL}/telemetria`, {
      headers: { "X-Sync-Token": token },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Worker respondió ${res.status}: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo conectar al Worker de IA", detalle: String(err) },
      { status: 503 }
    );
  }
}
