// ─────────────────────────────────────────────────────────────
// Tipos compartidos del Worker
// ─────────────────────────────────────────────────────────────

export interface Env {
  AI: Ai;
  DB: D1Database;
  KV: KVNamespace;
  PREMIUM_TOKEN_HASH: string; // env var: HMAC del admin secret
  AI_GATEWAY_URL?: string;    // env var: URL de AI Gateway (opcional)
}

// ── Request / Response ────────────────────────────────────────

export interface WorkerRequest {
  pregunta: string;
  sessionId?: string;  // futuro: contexto de conversación
}

export interface WorkerResponse {
  respuesta?: string;
  fuentes?: FuenteDoc[];
  error?: string;
  mensaje?: string;
  restantes?: number;
  esPremium?: boolean;
  traceId?: string;
  confianza?: "alta" | "media" | "baja";
  advertencia?: string; // si hay baja confianza
}

// ── Documentos recuperados ────────────────────────────────────

export interface FuenteDoc {
  titulo: string;
  autor?: string;
  año?: number;
  pagina?: number;
  seccion?: string;
  score: number;
}

export interface ChunkRecuperado {
  id: string;
  doc_id: string;
  contenido: string;
  titulo_doc: string;
  autor_doc?: string;
  año_doc?: number;
  pagina_inicio?: number;
  seccion?: string;
  score_fts?: number;
  score_final: number;
}

// ── Rate limit ────────────────────────────────────────────────

export interface RateLimitResult {
  permitido: boolean;
  restantes: number;
  resetAt: number; // unix timestamp ms
  dbError?: boolean;
}

// ── Seguridad ─────────────────────────────────────────────────

export interface AnalisisInyeccion {
  riesgo: "alto" | "medio" | "bajo";
  score: number;         // 0.0 - 1.0
  patrones: string[];    // patrones encontrados
  accion: "bloquear" | "revisar" | "permitir";
}

// ── Telemetría ────────────────────────────────────────────────

export interface TelemetriaEvento {
  traceId: string;
  tipo: "query_start" | "retrieval" | "llm_response" | "query_complete" | "injection_blocked" | "error";
  timestamp: number;
  duracionMs?: number;
  tokensEntrada?: number;
  tokensSalida?: number;
  chunksRecuperados?: number;
  scoreConfianza?: number;
  scoreInyeccion?: number;
  groundingRatio?: number;
  modelId?: string;
  skillUsada?: string;
  errorMsg?: string;
}
