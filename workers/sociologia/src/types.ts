// ─────────────────────────────────────────────────────────────
// Tipos del Worker — alineados con la D1 real (tabla: documentos)
// ─────────────────────────────────────────────────────────────

export interface Env {
  AI: Ai;
  DB: D1Database;
  RATE_LIMIT: KVNamespace;          // KV namespace binding real
  // ── Secretos (transición desde ADMIN_SECRET único) ─────────────
  // Si la variable específica no está configurada, el código cae a
  // ADMIN_SECRET legacy. Permite migración gradual sin downtime.
  ADMIN_SECRET?: string;            // legacy — fallback para todos los usos
  SESSION_SIGNING_SECRET?: string;  // valida token premium vía HMAC (chat IA + embed)
  D1_SYNC_SECRET?: string;          // autentica endpoints /sync y /telemetria
  VECTORIZE?: VectorizeIndex;       // Phase 3: opcional hasta que exista el index
}

// ── Request / Response (backward-compatible con v1) ───────────

export interface WorkerRequest {
  pregunta: string;
}

export interface WorkerResponse {
  respuesta?: string;
  fuentes?: string[];           // títulos de documentos (compat v1)
  fuentesDetalle?: FuenteDoc[]; // detalle enriquecido (nuevo)
  error?: string;
  mensaje?: string;
  restantes?: number;
  esPremium?: boolean;
  traceId?: string;
  confianza?: "alta" | "media" | "baja";
  advertencia?: string;
}

// ── Documento recuperado de D1 ────────────────────────────────

export interface DocumentoRecuperado {
  id: number;
  titulo: string;
  slug: string;
  texto: string;
  tipo: string;
  palabras: string;
  fuente: string;
  score: number;
  via: "fts" | "like" | "vector"; // cómo fue recuperado
}

// ── Fuente para el frontend ───────────────────────────────────

export interface FuenteDoc {
  titulo: string;
  fuente: string;
  tipo: string;
  score: number;
}

// ── Rate limit ────────────────────────────────────────────────

export interface RateLimitResult {
  permitido: boolean;
  restantes: number;
  resetAt: number;
  dbError?: boolean;
}

// ── Seguridad ─────────────────────────────────────────────────

export interface AnalisisInyeccion {
  riesgo: "alto" | "medio" | "bajo";
  score: number;
  patrones: string[];
  accion: "bloquear" | "revisar" | "permitir";
}

// ── Telemetría ────────────────────────────────────────────────

export interface TelemetriaEvento {
  traceId: string;
  tipo: string;
  timestamp: number;
  duracionMs?: number;
  tokensEntrada?: number;
  tokensSalida?: number;
  docsRecuperados?: number;
  scoreConfianza?: number;
  scoreInyeccion?: number;
  groundingRatio?: number;
  modelId?: string;
  viaRetrieval?: string;
  errorMsg?: string;
}
