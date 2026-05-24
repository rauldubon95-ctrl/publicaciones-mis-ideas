// ─────────────────────────────────────────────────────────────
// Cloudflare Worker: Asistente Académico v2.0
// Reemplaza el Worker monolítico anterior.
// API idéntica — retrocompatible con AsistenteChat.tsx
// ─────────────────────────────────────────────────────────────
import type { Env, WorkerRequest, WorkerResponse } from "./types";
import { analizarInyeccion, validarOutput } from "./security";
import { recuperarChunks, calcularGroundingRatio } from "./retrieval";
import {
  construirPrompt,
  extraerFuentes,
  construirAdvertencia,
  determinarConfianza,
} from "./prompts";
import { checkRateLimit, validarTokenPremium, contarTokens } from "./ratelimit";
import { emitirEvento } from "./telemetry";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Premium-Token, X-Trace-Id",
};

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_OUTPUT_TOKENS = 600;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Método no permitido" }, 405);
    }

    const traceId =
      request.headers.get("x-trace-id") ??
      crypto.randomUUID();
    const inicioMs = Date.now();

    // ── 1. Extraer IP ────────────────────────────────────────
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown";

    // ── 2. Validar token premium ─────────────────────────────
    const tokenHeader = request.headers.get("X-Premium-Token");
    const esPremium = await validarTokenPremium(tokenHeader, env);

    // ── 3. Rate limiting (solo usuarios free) ────────────────
    if (!esPremium) {
      const rl = await checkRateLimit(ip, env);
      if (!rl.permitido) {
        if (rl.dbError) {
          return jsonResponse(
            { error: "Servicio temporalmente no disponible", mensaje: "Inténtalo en unos minutos." },
            503,
            traceId
          );
        }
        return jsonResponse(
          {
            mensaje: "Alcanzaste el límite de 5 consultas diarias. Vuelve mañana.",
            restantes: 0,
            esPremium: false,
          },
          429,
          traceId
        );
      }
    }

    // ── 4. Parsear body ──────────────────────────────────────
    let body: WorkerRequest;
    try {
      body = (await request.json()) as WorkerRequest;
    } catch {
      return jsonResponse({ error: "Cuerpo de solicitud inválido" }, 400, traceId);
    }

    const pregunta = (body.pregunta ?? "").trim();

    if (!pregunta) {
      return jsonResponse({ error: "La pregunta no puede estar vacía" }, 400, traceId);
    }

    if (pregunta.length > 600) {
      return jsonResponse({ error: "La pregunta es demasiado larga (máx. 600 caracteres)" }, 400, traceId);
    }

    // ── 5. Detección de prompt injection ────────────────────
    const analisisSeguridad = analizarInyeccion(pregunta);
    if (analisisSeguridad.accion === "bloquear") {
      emitirEvento(
        {
          traceId,
          tipo: "injection_blocked",
          timestamp: Date.now(),
          scoreInyeccion: analisisSeguridad.score,
        },
        env,
        ctx
      );
      return jsonResponse(
        { error: "Consulta rechazada. Por favor realiza una pregunta académica." },
        422,
        traceId
      );
    }

    // ── 6. Retrieval: buscar en corpus documental ────────────
    let chunks;
    try {
      chunks = await recuperarChunks(pregunta, env);
    } catch {
      chunks = [];
    }

    // Si no hay documentos, responder con mensaje estándar
    if (chunks.length === 0) {
      const respSinFuentes: WorkerResponse = {
        respuesta:
          "No encuentro información sobre esto en mis fuentes actuales. " +
          "El corpus disponible puede no cubrir este tema específico.",
        fuentes: [],
        esPremium,
        confianza: "baja",
        traceId,
      };
      if (!esPremium) {
        const rl = await checkRateLimit(ip, env).catch(() => null);
        if (rl) respSinFuentes.restantes = rl.restantes;
      }
      return jsonResponse(respSinFuentes, 200, traceId);
    }

    // ── 7. Construir prompt con documentos sandboxeados ──────
    const messages = construirPrompt(pregunta, chunks);

    // Contar tokens de entrada para telemetría
    const tokensEntrada = contarTokens(
      messages.map((m) => m.content).join(" ")
    );

    // ── 8. Llamar al modelo de lenguaje ─────────────────────
    let respuestaLLM: string;
    try {
      const aiResponse = await env.AI.run(MODEL, {
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.1, // baja temperatura = menor alucinación
      } as Parameters<typeof env.AI.run>[1]);

      // Workers AI response shape
      const resultado = aiResponse as { response?: string };
      respuestaLLM = resultado.response?.trim() ?? "";
    } catch (err) {
      emitirEvento(
        {
          traceId,
          tipo: "error",
          timestamp: Date.now(),
          duracionMs: Date.now() - inicioMs,
          errorMsg: String(err),
        },
        env,
        ctx
      );
      return jsonResponse(
        { error: "Error al procesar tu consulta. Inténtalo de nuevo." },
        500,
        traceId
      );
    }

    if (!respuestaLLM) {
      return jsonResponse(
        { error: "El modelo no generó una respuesta. Inténtalo de nuevo." },
        500,
        traceId
      );
    }

    // ── 9. Validar output (seguridad post-LLM) ───────────────
    const validacion = validarOutput(respuestaLLM);
    if (!validacion.seguro) {
      // No enviar la respuesta comprometida; registrar y retornar mensaje seguro
      emitirEvento(
        {
          traceId,
          tipo: "error",
          timestamp: Date.now(),
          errorMsg: `output_validation_failed:${validacion.razon}`,
        },
        env,
        ctx
      );
      respuestaLLM =
        "No puedo proporcionar una respuesta en este momento. Reformula tu pregunta.";
    }

    // ── 10. Calcular grounding y confianza ───────────────────
    const groundingRatio = calcularGroundingRatio(respuestaLLM, chunks);
    const confianza = determinarConfianza(groundingRatio, chunks.length);
    const advertencia = construirAdvertencia(groundingRatio);
    const tokensSalida = contarTokens(respuestaLLM);

    // ── 11. Preparar fuentes para frontend ───────────────────
    const fuentes = extraerFuentes(chunks);

    // ── 12. Rate limit restante (para display en frontend) ───
    let restantes: number | undefined;
    if (!esPremium) {
      const rlCheck = await checkRateLimit(ip, env).catch(() => null);
      restantes = rlCheck?.restantes ?? undefined;
    }

    // ── 13. Telemetría (async, no bloquea) ───────────────────
    emitirEvento(
      {
        traceId,
        tipo: "query_complete",
        timestamp: Date.now(),
        duracionMs: Date.now() - inicioMs,
        tokensEntrada,
        tokensSalida,
        chunksRecuperados: chunks.length,
        scoreConfianza: groundingRatio,
        groundingRatio,
        modelId: MODEL,
      },
      env,
      ctx
    );

    // ── 14. Respuesta final ───────────────────────────────────
    const respuesta: WorkerResponse = {
      respuesta: respuestaLLM,
      fuentes,
      esPremium,
      confianza,
      traceId,
    };

    if (restantes !== undefined) respuesta.restantes = restantes;
    if (advertencia) respuesta.advertencia = advertencia;

    return jsonResponse(respuesta, 200, traceId);
  },
};

function jsonResponse(
  data: unknown,
  status: number,
  traceId?: string
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  };
  if (traceId) headers["X-Trace-Id"] = traceId;
  return new Response(JSON.stringify(data), { status, headers });
}
