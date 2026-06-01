// Cliente server-side para sincronizar artículos publicados hacia D1 del Worker.
// Se llama tras PUT en admin/publicaciones/[id] — fallo no bloquea la respuesta.
import { createHmac } from "crypto";
import { d1SyncSecret } from "@/lib/secrets";

const WORKER_URL = "https://sociologia.raul-dubon95.workers.dev";
const SYNC_MESSAGE = "d1-sync-v1";

export interface SyncPayload {
  slug: string;
  titulo: string;
  contenido: string;
  resumen?: string;
  etiquetas?: string[];
  categoria?: string;
}

export async function syncPublicacionToD1(
  payload: SyncPayload,
  action: "upsert" | "delete"
): Promise<void> {
  const secret = d1SyncSecret();
  if (!secret) return;

  const syncToken = createHmac("sha256", secret).update(SYNC_MESSAGE).digest("hex");
  const fuente = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/publicaciones/${payload.slug}`;

  const body = {
    action,
    slug: payload.slug,
    titulo: payload.titulo,
    contenido: payload.contenido,
    etiquetas: payload.etiquetas?.join(" "),
    categoria: payload.categoria,
    fuente,
  };

  try {
    await fetch(`${WORKER_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Token": syncToken,
      },
      body: JSON.stringify(body),
    });
  } catch {
    console.error("[d1sync] No se pudo sincronizar a D1:", payload.slug, action);
  }
}
