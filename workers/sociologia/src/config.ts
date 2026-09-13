// ─────────────────────────────────────────────────────────────
// Configuración central de modelos de Workers AI.
// Punto único de verdad: cambiar el modelo de chat aquí lo
// propaga a index.ts y a las 3 skills (sociológica, histórica,
// política). Para futuras migraciones, editar SOLO esta línea.
// ─────────────────────────────────────────────────────────────

// Modelo de chat (instrucción) usado por las 3 skills académicas.
//
// IMPORTANTE (sesión 38): se revierte desde "@cf/google/gemma-4-26b-a4b-it".
// Gemma 4 es un modelo de RAZONAMIENTO (reasoning): gasta su presupuesto de
// tokens "pensando" internamente antes de escribir la respuesta final. Con
// max_tokens de 400–800 (los que usamos) agotaba el presupuesto razonando y
// devolvía `response` vacío → el chat respondía "El modelo no generó una
// respuesta." en producción.
//
// Llama 3.1 8B Instruct (FP8, fast) es un modelo instruct clásico (NO
// reasoning): escribe la respuesta directamente, compatible con nuestros
// max_tokens y con el formato **ANÁLISIS:** que parseamos. Es el modelo más
// económico de Workers AI (≈4.119 neuronas/M entrada, ≈34.868 neuronas/M
// salida) → cabe holgado en la asignación gratuita de 10.000 neuronas/día del
// plan Free para el tráfico de un sitio personal. Es el mismo modelo (familia
// 8B fast) que funcionaba antes de la sesión 37.
//
// Type assertion: la unión de literales de @cloudflare/workers-types no
// siempre incluye todas las variantes; la forma de la API (messages +
// max_tokens + temperature) es idéntica, así que el cast es seguro en runtime.
export const CHAT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast" as Parameters<Ai["run"]>[0];

// Extrae de forma robusta el texto de la respuesta de Workers AI.
// Los modelos instruct devuelven { response: string }. Esta función tolera
// además formas alternativas ({ result: { response } }, anidados) y, si algún
// día se usa un modelo de razonamiento, descarta el bloque <think>…</think>
// para quedarse solo con la respuesta final. Evita el fallo silencioso que
// dejó el chat mudo al cambiar de modelo sin adaptar el parseo.
export function extraerRespuestaIA(aiRes: unknown): string {
  if (!aiRes || typeof aiRes !== "object") return "";
  const obj = aiRes as Record<string, unknown>;

  let texto = "";
  if (typeof obj.response === "string") {
    texto = obj.response;
  } else if (
    obj.response &&
    typeof obj.response === "object" &&
    typeof (obj.response as Record<string, unknown>).response === "string"
  ) {
    texto = (obj.response as Record<string, string>).response;
  } else if (
    obj.result &&
    typeof obj.result === "object" &&
    typeof (obj.result as Record<string, unknown>).response === "string"
  ) {
    texto = (obj.result as Record<string, string>).response;
  }

  // Modelos de razonamiento envuelven el pensamiento en <think>…</think>.
  // Nos quedamos con lo que viene DESPUÉS del último cierre.
  const cierre = texto.lastIndexOf("</think>");
  if (cierre !== -1) texto = texto.slice(cierre + "</think>".length);

  return texto.trim();
}
