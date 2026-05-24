// ─────────────────────────────────────────────────────────────
// Cloudflare Worker: Asistente Académico v2.0
// D1: llm_sociolog | KV: RATE_LIMIT | AI: Workers AI
// API 100% compatible con v1 (AsistenteChat.tsx no cambia)
// ─────────────────────────────────────────────────────────────
import type { Env, WorkerResponse } from "./types";
import { analizarInyeccion, validarOutput } from "./security";
import { recuperarDocumentos, calcularGrounding } from "./retrieval";
import {
  construirMensajes,
  extraerFuentesTitulos,
  construirAdvertencia,
  determinarConfianza,
  esSaludo,
} from "./prompts";
import { checkRateLimit, validarTokenPremium, contarTokens } from "./ratelimit";
import { emitirEvento } from "./telemetry";
import { handleEmbedRequest } from "./embed-worker";

// Orígenes permitidos (mismos que el Worker v1)
const ORIGENES_PERMITIDOS = [
  "https://publicaciones-mis-ideas.vercel.app",
  "http://localhost:3000",
  "https://mis-ideas.vercel.app",
];

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigin = ORIGENES_PERMITIDOS.includes(origin)
      ? origin
      : ORIGENES_PERMITIDOS[0];

    const CORS = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Premium-Token, X-Trace-Id",
      "Content-Type": "application/json",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== "POST") {
      return resp({ error: "Método no permitido" }, 405, CORS);
    }

    // ── Admin: generación de embeddings (Phase 3) ────────────
    const pathname = new URL(request.url).pathname;
    if (pathname === "/embed" || pathname.endsWith("/embed")) {
      return handleEmbedRequest(request, env);
    }

    const traceId =
      request.headers.get("X-Trace-Id") ?? crypto.randomUUID();
    const inicioMs = Date.now();

    // ── 1. IP ────────────────────────────────────────────────
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
      "unknown";

    // ── 2. Token premium ─────────────────────────────────────
    const tokenHeader = request.headers.get("X-Premium-Token");
    const esPremium = await validarTokenPremium(tokenHeader, env);

    // ── 3. Rate limiting ─────────────────────────────────────
    if (!esPremium) {
      const rl = await checkRateLimit(ip, env);
      if (!rl.permitido) {
        if (rl.dbError) {
          return resp(
            { error: "Servicio no disponible temporalmente", mensaje: "Inténtalo en unos minutos." },
            503, CORS, traceId
          );
        }
        return resp(
          {
            error: "Límite diario alcanzado",
            mensaje: "Has usado tus 5 consultas gratuitas de hoy. Vuelve mañana.",
            restantes: 0,
            esPremium: false,
          },
          429, CORS, traceId
        );
      }
    }

    // ── 4. Parsear body ──────────────────────────────────────
    let pregunta: string;
    try {
      const body = await request.json() as { pregunta?: string };
      pregunta = (body.pregunta ?? "").trim();
    } catch {
      return resp({ error: "Solicitud inválida" }, 400, CORS, traceId);
    }

    if (!pregunta || pregunta.length < 3) {
      return resp({ error: "Pregunta muy corta" }, 400, CORS, traceId);
    }

    if (pregunta.length > 2000) {
      return resp({ error: "Pregunta demasiado larga (máx. 2000 caracteres)" }, 400, CORS, traceId);
    }

    // ── 5. Detección de injection ────────────────────────────
    const seguridad = analizarInyeccion(pregunta);
    if (seguridad.accion === "bloquear") {
      emitirEvento(
        { traceId, tipo: "injection_blocked", timestamp: Date.now(), scoreInyeccion: seguridad.score },
        env, ctx
      );
      return resp(
        { error: "Consulta no permitida", mensaje: "Tu consulta contiene instrucciones no permitidas." },
        422, CORS, traceId
      );
    }

    // ── 6. Saludo rápido sin LLM ─────────────────────────────
    if (esSaludo(pregunta)) {
      return resp(
        {
          respuesta: "¡Hola! Soy el asistente académico de Raúl Dubón. Puedo ayudarte a explorar sus publicaciones sobre ciencias sociales, sociología y análisis político latinoamericano. ¿Sobre qué tema querés consultar?",
          fuentes: [],
          esPremium,
        },
        200, CORS, traceId
      );
    }

    // ── 7. Retrieval (FTS → LIKE → vector) ───────────────────
    let docs;
    try {
      docs = await recuperarDocumentos(pregunta, env);
    } catch {
      docs = [];
    }

    if (docs.length === 0) {
      const sinFuentes: WorkerResponse = {
        respuesta: "No tengo información suficiente en mis fuentes actuales sobre ese tema.",
        fuentes: [],
        esPremium,
        confianza: "baja",
        traceId,
      };
      if (!esPremium) {
        const rl = await checkRateLimit(ip, env).catch(() => null);
        if (rl) sinFuentes.restantes = rl.restantes;
      }
      return resp(sinFuentes, 200, CORS, traceId);
    }

    // ── 8. Construir prompt ──────────────────────────────────
    const messages = construirMensajes(pregunta, docs, esPremium);
    const tokensEntrada = contarTokens(messages.map((m) => m.content).join(" "));

    // ── 9. Llamar al LLM ─────────────────────────────────────
    let respuestaLLM: string;
    try {
      const aiRes = await env.AI.run(MODEL, {
        messages,
        max_tokens: esPremium ? 1200 : 600,
        temperature: 0.25,
      } as Parameters<typeof env.AI.run>[1]) as { response?: string };

      respuestaLLM = (aiRes.response ?? "").trim();
    } catch (err) {
      emitirEvento(
        { traceId, tipo: "error", timestamp: Date.now(), duracionMs: Date.now() - inicioMs, errorMsg: String(err) },
        env, ctx
      );
      return resp({ error: "Error al procesar tu consulta. Inténtalo de nuevo." }, 500, CORS, traceId);
    }

    if (!respuestaLLM) {
      return resp({ error: "El modelo no generó una respuesta." }, 500, CORS, traceId);
    }

    // ── 10. Validar output ───────────────────────────────────
    const validacion = validarOutput(respuestaLLM);
    if (!validacion.seguro) {
      emitirEvento(
        { traceId, tipo: "output_invalid", timestamp: Date.now(), errorMsg: validacion.razon },
        env, ctx
      );
      respuestaLLM = "No puedo proporcionar una respuesta en este momento. Reformula tu pregunta.";
    }

    // ── 11. Grounding y confianza ────────────────────────────
    const groundingRatio = calcularGrounding(respuestaLLM, docs);
    const confianza = determinarConfianza(groundingRatio, docs.length);
    const advertencia = construirAdvertencia(groundingRatio);
    const tokensSalida = contarTokens(respuestaLLM);

    // ── 12. Rate limit restante ──────────────────────────────
    let restantes: number | undefined;
    if (!esPremium) {
      const rl = await checkRateLimit(ip, env).catch(() => null);
      restantes = rl?.restantes;
    }

    // ── 13. Telemetría async ─────────────────────────────────
    emitirEvento(
      {
        traceId,
        tipo: "query_complete",
        timestamp: Date.now(),
        duracionMs: Date.now() - inicioMs,
        tokensEntrada,
        tokensSalida,
        docsRecuperados: docs.length,
        scoreConfianza: groundingRatio,
        groundingRatio,
        modelId: MODEL,
        viaRetrieval: docs[0]?.via ?? "none",
      },
      env, ctx
    );

    // ── 14. Respuesta ─────────────────────────────────────────
    const respuesta: WorkerResponse = {
      respuesta: respuestaLLM,
      fuentes: extraerFuentesTitulos(docs), // compat v1
      esPremium,
      confianza,
      traceId,
    };

    if (restantes !== undefined) respuesta.restantes = restantes;
    if (advertencia) respuesta.advertencia = advertencia;

    return resp(respuesta, 200, CORS, traceId);
  },
};

function resp(
  data: unknown,
  status: number,
  headers: Record<string, string>,
  traceId?: string
): Response {
  const h = { ...headers };
  if (traceId) h["X-Trace-Id"] = traceId;
  return new Response(JSON.stringify(data), { status, headers: h });
}
