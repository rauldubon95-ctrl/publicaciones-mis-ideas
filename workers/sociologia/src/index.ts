// ─────────────────────────────────────────────────────────────
// Cloudflare Worker: Asistente Académico v2.0
// D1: llm_sociolog | KV: RATE_LIMIT | AI: Workers AI
// API 100% compatible con v1 (AsistenteChat.tsx no cambia)
// ─────────────────────────────────────────────────────────────
import type { ContextoSitio, Env, WorkerResponse } from "./types";
import { CONTEXTOS_VALIDOS } from "./types";
import { analizarInyeccion } from "./security";
import { recuperarDocumentos } from "./retrieval";
import { extraerFuentesTitulos, esSaludo, esConsultaTrivial } from "./prompts";
import { checkRateLimit, validarTokenPremium, contarTokens, checkGlobalRateLimit } from "./ratelimit";
import { emitirEvento, handleTelemetriaRequest } from "./telemetry";
import { handleEmbedRequest } from "./embed-worker";
import { SkillRegistry } from "./skills/registry";
import { SociologicalAnalysisSkill } from "./skills/sociological-analysis";
import { HistoricalAnalysisSkill } from "./skills/historical-analysis";
import { PoliticalAnalysisSkill } from "./skills/political-analysis";
import { handleSyncRequest } from "./sync";
import { CHAT_MODEL } from "./config";

const skillRegistry = new SkillRegistry();
skillRegistry.register(new SociologicalAnalysisSkill());
skillRegistry.register(new HistoricalAnalysisSkill());
skillRegistry.register(new PoliticalAnalysisSkill());

// Orígenes permitidos
const ORIGENES_PERMITIDOS = [
  "https://rauldubon.org",
  "https://www.rauldubon.org",
  "https://publicaciones-mis-ideas.vercel.app",
  "http://localhost:3000",
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigin = ORIGENES_PERMITIDOS.includes(origin) ? origin : null;

    const CORS: Record<string, string> = {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Premium-Token, X-Trace-Id",
      "Content-Type": "application/json",
    };
    if (allowedOrigin) CORS["Access-Control-Allow-Origin"] = allowedOrigin;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const pathname = new URL(request.url).pathname;

    // ── Telemetría (GET, autenticado) ────────────────────────
    if (pathname === "/telemetria" || pathname.endsWith("/telemetria")) {
      return handleTelemetriaRequest(request, env, CORS);
    }

    if (request.method !== "POST") {
      return resp({ error: "Método no permitido" }, 405, CORS);
    }

    // ── Sync Supabase → D1 (server-to-server, no rate limit) ─
    if (pathname === "/sync" || pathname.endsWith("/sync")) {
      return handleSyncRequest(request, env);
    }

    // ── Admin: generación de embeddings (Phase 3) ────────────
    if (pathname === "/embed" || pathname.endsWith("/embed")) {
      return handleEmbedRequest(request, env);
    }

    // ── Skill: análisis académico estructurado ───────────────
    if (pathname === "/skill" || pathname.endsWith("/skill")) {
      return handleSkillRequest(request, env, CORS);
    }

    const traceId =
      request.headers.get("X-Trace-Id") ?? crypto.randomUUID();
    const inicioMs = Date.now();

    // ── 1. IP ────────────────────────────────────────────────
    const ip =
      request.headers.get("CF-Connecting-IP") ??
      request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
      "unknown";

    // ── 1b. Límite global (protección ante ataques distribuidos) ─
    const globalOk = await checkGlobalRateLimit(env);
    if (!globalOk) {
      return resp(
        { error: "Servicio temporalmente saturado", mensaje: "El asistente está recibiendo demasiadas consultas. Inténtalo en un minuto." },
        503, CORS, traceId
      );
    }

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
    let contextoSitio: ContextoSitio = "general";
    try {
      const body = await request.json() as { pregunta?: string; contexto?: unknown };
      pregunta = (body.pregunta ?? "").trim();
      // Validación estricta del contexto contra whitelist.
      // Cualquier valor inesperado o manipulado cae a "general" — nunca
      // se acepta un contexto arbitrario del cliente, y nunca se inserta
      // como texto crudo en el prompt.
      if (typeof body.contexto === "string" &&
          (CONTEXTOS_VALIDOS as readonly string[]).includes(body.contexto)) {
        contextoSitio = body.contexto as ContextoSitio;
      }
    } catch {
      return resp({ error: "Solicitud inválida" }, 400, CORS, traceId);
    }

    if (!pregunta || pregunta.length < 3) {
      return resp({ error: "Pregunta muy corta" }, 400, CORS, traceId);
    }

    if (pregunta.length > 1500) {
      return resp({ error: "Pregunta demasiado larga (máx. 1500 caracteres)" }, 400, CORS, traceId);
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

    // ── 6. Saludo o consulta trivial: respuesta rápida sin LLM ──
    // Cubre "holis", "hola", "buenas!" y cualquier query sin al menos
    // 2 palabras significativas. Antes disparaba el pipeline RAG+LLM
    // y citaba documentos irrelevantes ("citar por citar").
    if (esSaludo(pregunta) || esConsultaTrivial(pregunta)) {
      const mensajeSegunContexto: Record<ContextoSitio, string> = {
        general: "¡Hola! Soy el asistente académico de Raúl Dubón. Puedo ayudarte a explorar sus publicaciones sobre ciencias sociales, sociología y análisis político latinoamericano. ¿Sobre qué tema querés consultar?",
        home: "¡Hola! Soy el asistente académico de Raúl Dubón. Puedo ayudarte a explorar sus artículos, libros y análisis sobre ciencias sociales latinoamericanas. Contame qué tema te interesa (sociología, política, historia, educación, etc.) y te oriento.",
        publicacion: "¡Hola! Estás leyendo un artículo de Raúl Dubón. Puedo ayudarte a profundizar en su contenido, contextualizarlo con otros artículos del sitio o explicar conceptos que aparezcan. ¿Qué te gustaría entender mejor?",
        libro: "¡Hola! Estás explorando los libros de Raúl. Puedo ayudarte a conocer los temas que abordan o sugerirte cuál se relaciona con lo que te interesa. Contame qué tema estás explorando.",
        donacion: "¡Hola! Puedo ayudarte con dudas sobre el trabajo de Raúl, sus publicaciones o cómo apoyarlo. ¿Qué te gustaría saber?",
      };
      return resp(
        {
          respuesta: mensajeSegunContexto[contextoSitio],
          fuentes: [],
          esPremium,
        },
        200, CORS, traceId
      );
    }

    // ── 7. Retrieval (FTS → LIKE → vector) ───────────────────
    let docs: Awaited<ReturnType<typeof recuperarDocumentos>>;
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

    // ── 8-11. Análisis via skill (routing automático por dominio) ──
    const tokensEntrada = contarTokens(pregunta + docs.map((d) => d.texto).join(" "));
    let respuestaLLM: string;
    let groundingRatio: number;
    let confianza: "alta" | "media" | "baja";
    let advertencia: string | undefined;
    let tokensSalida: number;

    try {
      const skillElegida = detectarSkill(pregunta);
      const skillResult = await skillRegistry.execute(
        skillElegida,
        {
          query: pregunta,
          context: docs,
          depth: esPremium ? "deep" : "standard",
          contextoSitio, // validado en el paso 4 contra whitelist
        },
        env
      );

      if (!skillResult.analysis) {
        return resp({ error: "El modelo no generó una respuesta." }, 500, CORS, traceId);
      }

      respuestaLLM = skillResult.analysis;
      groundingRatio = skillResult.grounding_ratio;
      confianza =
        skillResult.confidence >= 0.7 ? "alta"
        : skillResult.confidence >= 0.4 ? "media"
        : "baja";
      advertencia = skillResult.uncertainty_flags[0] ?? undefined;

      // Post-proceso: si el grounding es débil, remover la sección de
      // fuentes del texto para no citar por citar (regla del prompt v1.2).
      // El campo fuentes[] del JSON de respuesta sigue lleno como
      // "referencia complementaria" para el UI, pero la respuesta
      // textual queda limpia.
      if (groundingRatio < 0.4) {
        respuestaLLM = removerSeccionFuentes(respuestaLLM);
      }

      tokensSalida = contarTokens(respuestaLLM);
    } catch (err) {
      emitirEvento(
        { traceId, tipo: "error", timestamp: Date.now(), duracionMs: Date.now() - inicioMs, errorMsg: String(err) },
        env, ctx
      );
      return resp({ error: "Error al procesar tu consulta. Inténtalo de nuevo." }, 500, CORS, traceId);
    }

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
        modelId: CHAT_MODEL,
        viaRetrieval: docs[0]?.via ?? "none",
      },
      env, ctx
    );

    // ── 14. Respuesta ─────────────────────────────────────────
    // Si el grounding es débil, ya removimos las citas del texto —
    // el array fuentes[] también queda vacío para no confundir al
    // frontend con una lista que el asistente no usó realmente.
    const respuesta: WorkerResponse = {
      respuesta: respuestaLLM,
      fuentes: groundingRatio < 0.4 ? [] : extraerFuentesTitulos(docs),
      esPremium,
      confianza,
      traceId,
    };

    if (restantes !== undefined) respuesta.restantes = restantes;
    if (advertencia) respuesta.advertencia = advertencia;

    return resp(respuesta, 200, CORS, traceId);
  },
};

async function handleSkillRequest(
  request: Request,
  env: Env,
  CORS: Record<string, string>
): Promise<Response> {
  const traceId = request.headers.get("X-Trace-Id") ?? crypto.randomUUID();
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown";

  const tokenHeader = request.headers.get("X-Premium-Token");
  const esPremium = await validarTokenPremium(tokenHeader, env);

  if (!esPremium) {
    const rl = await checkRateLimit(ip, env);
    if (!rl.permitido) {
      return resp(
        { error: "Límite diario alcanzado", mensaje: "Has usado tus consultas gratuitas de hoy.", restantes: 0 },
        429, CORS, traceId
      );
    }
  }

  let body: { skill?: string; query?: string; depth?: string; frameworks?: string[]; outputFormat?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return resp({ error: "Solicitud inválida" }, 400, CORS, traceId);
  }

  const { skill: skillName, query, depth, frameworks, outputFormat } = body;

  if (!skillName) {
    return resp(
      { error: "Campo 'skill' requerido", available: skillRegistry.list() },
      400, CORS, traceId
    );
  }
  if (!skillRegistry.has(skillName)) {
    return resp(
      { error: `Skill '${skillName}' no encontrada`, available: skillRegistry.list() },
      404, CORS, traceId
    );
  }
  if (!query || query.trim().length < 3) {
    return resp({ error: "query muy corta (mín. 3 caracteres)" }, 400, CORS, traceId);
  }
  if (query.length > 1500) {
    return resp({ error: "query demasiado larga (máx. 1500 caracteres)" }, 400, CORS, traceId);
  }

  const seguridad = analizarInyeccion(query);
  if (seguridad.accion === "bloquear") {
    return resp({ error: "Consulta no permitida" }, 422, CORS, traceId);
  }

  try {
    const result = await skillRegistry.execute(skillName, {
      query: query.trim(),
      depth: depth as "shallow" | "standard" | "deep" | undefined,
      frameworks,
      outputFormat: outputFormat as "prose" | "structured" | undefined,
    }, env);

    let restantes: number | undefined;
    if (!esPremium) {
      const rl = await checkRateLimit(ip, env).catch(() => null);
      restantes = rl?.restantes;
    }

    return resp({ ...result, esPremium, traceId, restantes }, 200, CORS, traceId);
  } catch (err) {
    return resp({ error: String(err) }, 500, CORS, traceId);
  }
}

// Detecta el dominio académico de la pregunta y elige la skill más adecuada.
// Usa scoring por keywords — sin LLM, sin latencia extra.
function detectarSkill(pregunta: string): string {
  const lower = pregunta.toLowerCase();

  const kHistorico = [
    "historia", "históric", "período", "siglo", "coloni", "independenci",
    "revolución", "dictadura", "golpe de estado", "transición democrática",
    "1800", "1900", "siglo xix", "siglo xx", "guerra civil", "caudillo",
    "liberalism", "oligarqu", "reforma agrar", "industrializac",
  ];
  const kPolitico = [
    "polític", "partido", "gobierno", "democracia", "elecciones", "estado",
    "régimen", "movimiento social", "hegemonía", "populismo", "autoritarismo",
    "soberanía", "legislativo", "ejecutivo", "judicial", "izquierda", "derecha",
    "neoliberal", "sociedad civil", "ciudadanía", "poder político",
  ];

  const scoreH = kHistorico.filter((kw) => lower.includes(kw)).length;
  const scoreP = kPolitico.filter((kw) => lower.includes(kw)).length;

  if (scoreH >= 2 && scoreH > scoreP) return "historical-analysis";
  if (scoreP >= 2 && scoreP > scoreH) return "political-analysis";
  return "sociological-analysis";
}

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

// Remueve secciones tipo "📚 Fuentes:" o "**CITAS:**" del final del
// texto cuando el LLM no ancló bien la respuesta al corpus. Evita
// "citar por citar" (regla 10 del prompt v1.2). Preserva el resto.
function removerSeccionFuentes(texto: string): string {
  // Corta desde el primer encabezado tipo "📚 Fuentes:", "Fuentes:",
  // "**CITAS:**" o "**Fuentes:**" hasta el final del texto.
  const re = /(\n+\s*(?:📚\s*)?\*{0,2}(?:CITAS|Fuentes)\s*:?\*{0,2}[\s\S]*)$/i;
  return texto.replace(re, "").trimEnd();
}
