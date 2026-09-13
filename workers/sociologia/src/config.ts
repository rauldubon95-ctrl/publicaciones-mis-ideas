// ─────────────────────────────────────────────────────────────
// Configuración central de modelos de Workers AI.
// Punto único de verdad: cambiar el modelo de chat aquí lo
// propaga a index.ts y a las 3 skills (sociológica, histórica,
// política). Para futuras migraciones, editar SOLO esta línea.
// ─────────────────────────────────────────────────────────────

// Modelo de chat (instrucción) usado por las 3 skills académicas.
// Migrado sesión 37 desde "@cf/meta/llama-3.1-8b-instruct-fast" (Llama 3.1
// 8B, 128k contexto) a Gemma 4 26B A4B IT — 26B params con 4B activos
// (Mixture of Experts), 256k tokens de contexto, razonamiento mejorado,
// plan gratuito de Cloudflare Workers AI. Usa la misma API de text
// generation (messages + max_tokens + temperature), compatible sin cambios.
// Type assertion: Gemma 4 is not yet in @cloudflare/workers-types overloads.
// The API shape (messages + max_tokens + temperature) is identical to the
// text-generation models already listed, so this cast is safe at runtime.
export const CHAT_MODEL = "@cf/google/gemma-4-26b-a4b-it" as Parameters<Ai["run"]>[0];
