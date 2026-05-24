// ─────────────────────────────────────────────────────────────
// Seguridad del Worker: detección de injection y sanitización
// ─────────────────────────────────────────────────────────────
import type { AnalisisInyeccion } from "./types";

// Patrones de prompt injection (capa 1: expresiones regulares)
const INJECTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  // Role hijacking
  { re: /ignore\s+(all\s+)?previous\s+instructions?/gi, label: "role_hijack_ignore" },
  { re: /forget\s+(all\s+)?(your\s+)?instructions?/gi, label: "role_hijack_forget" },
  { re: /disregard\s+(all\s+)?previous/gi, label: "role_hijack_disregard" },
  { re: /you\s+are\s+now\s+(?!an?\s+academic|an?\s+assistant)/gi, label: "role_redefine" },
  { re: /act\s+as\s+(?!an?\s+(academic|sociolog|researcher|analyst))/gi, label: "role_act_as" },
  { re: /pretend\s+(you\s+are|to\s+be)/gi, label: "role_pretend" },
  { re: /roleplay\s+as/gi, label: "role_roleplay" },

  // System prompt extraction
  { re: /repeat\s+(your\s+)?(system\s+)?prompt/gi, label: "extract_repeat_prompt" },
  { re: /what\s+are\s+your\s+(instructions?|rules?|directives?)/gi, label: "extract_instructions" },
  { re: /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/gi, label: "extract_show_prompt" },
  { re: /print\s+(your\s+)?(initial\s+)?instructions?/gi, label: "extract_print" },
  { re: /reveal\s+(your\s+)?(hidden\s+|system\s+)?prompt/gi, label: "extract_reveal" },
  { re: /output\s+(your\s+)?(system\s+)?prompt/gi, label: "extract_output" },
  { re: /display\s+(your\s+)?(system\s+)?prompt/gi, label: "extract_display" },
  { re: /leak\s+(your\s+)?(system\s+)?prompt/gi, label: "extract_leak" },

  // Jailbreak keywords
  { re: /\bDAN\b/g, label: "jailbreak_dan" },
  { re: /jailbreak/gi, label: "jailbreak_keyword" },
  { re: /bypass\s+(the\s+)?(safety|filter|restriction|rule|content)/gi, label: "jailbreak_bypass" },
  { re: /override\s+(the\s+)?(system|instruction|rule|filter)/gi, label: "jailbreak_override" },
  { re: /do\s+anything\s+now/gi, label: "jailbreak_dan2" },
  { re: /without\s+(any\s+)?restrictions?/gi, label: "jailbreak_no_restrictions" },
  { re: /developer\s+mode/gi, label: "jailbreak_dev_mode" },

  // Token manipulation
  { re: /\[SYSTEM\]/gi, label: "token_system" },
  { re: /\[INST\]/gi, label: "token_inst" },
  { re: /<\|im_start\|>/gi, label: "token_im_start" },
  { re: /<<SYS>>/gi, label: "token_sys_bracket" },
  { re: /<\|system\|>/gi, label: "token_system_pipe" },
  { re: /\[\/INST\]/gi, label: "token_end_inst" },

  // Encoding attacks
  { re: /base64\s*:/gi, label: "encoding_base64" },
  { re: /atob\s*\(/gi, label: "encoding_atob" },

  // Data exfiltration
  { re: /send\s+(this|my|the)\s+(data|info|prompt|context)/gi, label: "exfil_send" },
  { re: /transmit\s+(to|this)/gi, label: "exfil_transmit" },

  // Code execution
  { re: /execute\s+(this\s+)?(code|script|command)/gi, label: "exec_code" },
  { re: /eval\s*\(/gi, label: "exec_eval" },
  { re: /import\s+os/gi, label: "exec_os" },
];

// Sanitizar el contenido de un documento (documento envuelto)
// El contenido de PDFs NUNCA se convierte en instrucción
export function envolverDocumento(
  contenido: string,
  docId: string,
  chunkId: string,
  fuente: string
): string {
  // Neutralizar patrones de instrucción que puedan estar en el PDF
  const sanitizado = contenido
    .replace(/\[SYSTEM\]/gi, "[SYS_BLOQUEADO]")
    .replace(/\[INST\]/gi, "[INST_BLOQUEADO]")
    .replace(/<<SYS>>/gi, "[SYS_BLOQUEADO]")
    .replace(/<\|im_start\|>/gi, "[IM_BLOQUEADO]")
    .replace(/ignore\s+previous\s+instructions?/gi, "[INSTRUCCION_BLOQUEADA]")
    .replace(/you\s+are\s+now/gi, "[REDEFINICION_BLOQUEADA]")
    .replace(/forget\s+(all\s+)?instructions?/gi, "[OLVIDO_BLOQUEADO]");

  return `[INICIO_DOCUMENTO id="${docId}" chunk="${chunkId}" fuente="${fuente}"]
${sanitizado}
[FIN_DOCUMENTO]`;
}

// Análisis multi-capa de injection en la query del usuario
export function analizarInyeccion(texto: string): AnalisisInyeccion {
  const patronesEncontrados: string[] = [];
  let scorePatrones = 0;

  for (const { re, label } of INJECTION_PATTERNS) {
    if (re.test(texto)) {
      patronesEncontrados.push(label);
      scorePatrones += 0.12; // cada patrón suma
    }
  }
  scorePatrones = Math.min(scorePatrones, 1.0);

  // Análisis estructural
  let scoreEstructural = 0;

  // Texto muy corto con palabras clave de instrucción → sospechoso
  if (
    texto.length < 120 &&
    /\b(ignore|forget|override|bypass|act|pretend|reveal|show|print)\b/i.test(texto)
  ) {
    scoreEstructural += 0.4;
  }

  // Muchos caracteres especiales (adversarial inputs)
  const especialRatio =
    (texto.match(/[^a-zA-Z0-9\sáéíóúüñÁÉÍÓÚÜÑ.,;:?!¿¡'"()]/g) ?? []).length /
    Math.max(texto.length, 1);
  if (especialRatio > 0.12) scoreEstructural += 0.3;

  // Bloques de código sospechosos
  if ((texto.match(/```|<code>|<script>/g) ?? []).length > 1) {
    scoreEstructural += 0.25;
  }

  scoreEstructural = Math.min(scoreEstructural, 1.0);

  // Score final combinado
  const score = scorePatrones * 0.6 + scoreEstructural * 0.4;

  let riesgo: AnalisisInyeccion["riesgo"];
  let accion: AnalisisInyeccion["accion"];

  if (score >= 0.5 || patronesEncontrados.length >= 2) {
    riesgo = "alto";
    accion = "bloquear";
  } else if (score >= 0.2 || patronesEncontrados.length === 1) {
    riesgo = "medio";
    accion = "revisar"; // se procesa pero se loggea
  } else {
    riesgo = "bajo";
    accion = "permitir";
  }

  return { riesgo, score, patrones: patronesEncontrados, accion };
}

// Validar output: detectar leakage de system prompt o tokens internos
export function validarOutput(texto: string): {
  seguro: boolean;
  razon?: string;
} {
  // Señales de que el LLM expuso instrucciones internas
  const LEAKAGE_PATTERNS = [
    /REGLAS\s+ABSOLUTAS\s+E\s+INMUTABLES/i,
    /JERARQUÍA\s+DE\s+CONFIANZA/i,
    /REGLAS\s+DE\s+GROUNDING/i,
    /\[TOKEN_LIMIT\]/i,
    /Nivel\s+1\s+\(máximo\)/i,
    /estas\s+instrucciones\s+del\s+sistema/i,
  ];

  for (const re of LEAKAGE_PATTERNS) {
    if (re.test(texto)) {
      return { seguro: false, razon: "system_prompt_leakage" };
    }
  }

  // Señales de role hijacking exitoso
  const HIJACK_PATTERNS = [
    /I\s+am\s+now\s+(?!an?\s+academic)/i,
    /I\s+can\s+now\s+ignore/i,
    /DAN\s+mode\s+activated/i,
  ];

  for (const re of HIJACK_PATTERNS) {
    if (re.test(texto)) {
      return { seguro: false, razon: "role_hijack_detected" };
    }
  }

  return { seguro: true };
}

// Detectar si la query habla de un tema fuera del corpus (sin recuperación)
export function esQueryAcademica(query: string): boolean {
  const TOPICOS_VALIDOS = [
    /sociolog/i, /politic/i, /social/i, /ideolog/i, /marx/i, /weber/i,
    /capital/i, /clase\s+social/i, /movimiento/i, /estado/i, /poder/i,
    /democraci/i, /discurso/i, /cultura/i, /educaci/i, /econom/i,
    /desigualdad/i, /pobrez/i, /género/i, /identidad/i, /racismo/i,
    /colonialismo/i, /imperialismo/i, /neoliberal/i, /globalizaci/i,
    /ciudadan/i, /derechos/i, /publicaci/i, /artículo/i, /raúl/i,
    /dubón/i, /centroamérica/i, /guatemala/i, /honduras/i, /latinoamérica/i,
  ];
  return TOPICOS_VALIDOS.some((r) => r.test(query));
}
