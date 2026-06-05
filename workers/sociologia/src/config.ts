// ─────────────────────────────────────────────────────────────
// Configuración central de modelos de Workers AI.
// Punto único de verdad: cambiar el modelo de chat aquí lo
// propaga a index.ts y a las 3 skills (sociológica, histórica,
// política). Para futuras migraciones, editar SOLO esta línea.
// ─────────────────────────────────────────────────────────────

// Modelo de chat (instrucción) usado por las 3 skills académicas.
// Migrado desde "@cf/meta/llama-3.1-8b-instruct" (descontinuado por
// Cloudflare el 2026-05-30) a la variante "fast" del mismo Llama 3.1 8B,
// que sigue vigente, es la más económica en neuronas y mantiene el
// mismo formato de respuesta (los encabezados **ANÁLISIS:** / **CITAS:**
// que el código parsea no cambian). Ventana de contexto 128k tokens.
export const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
