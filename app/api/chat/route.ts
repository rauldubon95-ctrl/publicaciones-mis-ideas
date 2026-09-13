import { NextRequest, NextResponse } from "next/server";
import { fetchConTimeout } from "@/lib/timeout";
import { checkRateLimitDb, getIp, registrarEvento } from "@/lib/security";

// Proxy server-side al Worker de IA. El frontend llama a /api/chat en vez de
// contactar al Worker directamente, evitando exponer la URL del Worker en el
// JavaScript del cliente.

const WORKER_URL = (() => {
  const url = process.env.WORKER_URL;
  if (!url) {
    console.warn("[chat-proxy] WORKER_URL no configurada — usando fallback hardcoded. Configúrala en Vercel.");
    return "https://sociologia.raul-dubon95.workers.dev";
  }
  return url;
})();

// Contextos válidos que el Worker acepta (whitelist idéntica a la del Worker).
const CONTEXTOS_VALIDOS = new Set([
  "general",
  "home",
  "publicacion",
  "libro",
  "donacion",
]);

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Rate limit: 30 peticiones por minuto por IP (fail-close — crítico para IA).
  const rl = await checkRateLimitDb(ip, "/api/chat", {
    maxIntentos: 30,
    ventanaMs: 60_000,
    failBehavior: "close",
  });
  if (!rl.permitido) {
    await registrarEvento("RATE_LIMIT", ip, "/api/chat");
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Inténtalo en un momento.", mensaje: "Límite temporal alcanzado." },
      { status: 429 }
    );
  }

  // Parsear y validar el body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la solicitud inválido." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("pregunta" in body) ||
    typeof (body as Record<string, unknown>).pregunta !== "string"
  ) {
    return NextResponse.json(
      { error: "El campo 'pregunta' es obligatorio y debe ser texto." },
      { status: 400 }
    );
  }

  const pregunta = ((body as Record<string, unknown>).pregunta as string).trim();
  if (!pregunta || pregunta.length > 2000) {
    return NextResponse.json(
      { error: "La pregunta debe tener entre 1 y 2000 caracteres." },
      { status: 400 }
    );
  }

  // Construir el payload para el Worker: solo los campos esperados.
  const workerBody: Record<string, unknown> = { pregunta };

  const rawContexto = (body as Record<string, unknown>).contexto;
  if (typeof rawContexto === "string" && CONTEXTOS_VALIDOS.has(rawContexto)) {
    workerBody.contexto = rawContexto;
  }

  // Construir headers para el Worker.
  const workerHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Pasar X-Premium-Token si el cliente lo envió (auth de admin sin límite).
  const premiumToken = req.headers.get("X-Premium-Token");
  if (premiumToken) {
    workerHeaders["X-Premium-Token"] = premiumToken;
  }

  try {
    const workerRes = await fetchConTimeout(
      WORKER_URL,
      {
        method: "POST",
        headers: workerHeaders,
        body: JSON.stringify(workerBody),
      },
      15_000
    );

    const data = await workerRes.json();

    // Devolver la respuesta del Worker con el mismo status code.
    return NextResponse.json(data, { status: workerRes.status });
  } catch (err) {
    console.error("[chat-proxy] Error conectando al Worker:", err);
    return NextResponse.json(
      { error: "No se pudo conectar con el asistente de IA." },
      { status: 503 }
    );
  }
}
