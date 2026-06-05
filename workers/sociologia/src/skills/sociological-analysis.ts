import type { Env } from "../types";
import type { DocumentoRecuperado } from "../types";
import type { Skill, SkillInput, SkillOutput } from "./registry";
import { recuperarDocumentos, calcularGrounding } from "../retrieval";
import { validarOutput } from "../security";
import { CHAT_MODEL } from "../config";

const FRAMEWORK_KEYWORDS: Record<string, string[]> = {
  "conflict-theory": ["marx", "clase", "lucha", "weber", "dominacion", "poder", "conflicto", "capitalismo", "burgues", "proletariado", "explotacion"],
  "functionalism": ["parsons", "funcion", "sistema", "durkheim", "anomia", "solidaridad", "institucion", "equilibrio", "merton", "disfuncion"],
  "symbolic-interactionism": ["goffman", "interaccion", "simbolo", "significado", "mead", "self", "rol", "identidad", "blumer", "dramaturgico"],
  "critical-theory": ["habermas", "bourdieu", "foucault", "habitus", "campo", "discurso", "hegemonia", "critica", "emancipacion", "gramsci"],
  "structuralism": ["estructura", "althusser", "supraestructura", "infraestructura", "ideologia", "aparato"],
  "post-structuralism": ["derrida", "laclau", "mouffe", "deconstruccion", "genealogia", "posmoderno", "contingencia"],
};

const TEORICOS = [
  "Marx", "Weber", "Durkheim", "Parsons", "Merton", "Bourdieu", "Foucault",
  "Habermas", "Goffman", "Mead", "Gramsci", "Althusser", "Dahrendorf",
  "Luhmann", "Laclau", "Mouffe", "Quijano", "Mariátegui",
];

const CONCEPTOS_SOCIOLOGICOS = [
  "clase social", "habitus", "campo", "capital cultural", "hegemonia",
  "alienacion", "anomia", "estructura social", "poder", "ideologia",
  "dominacion", "legitimidad", "accion social", "movimiento social",
  "estado", "sociedad civil", "colonialismo", "decolonialidad",
];

const SYSTEM_SKILL = `Eres el asistente académico de Raúl Dubón. Realizas análisis sociológico académico basado exclusivamente en los documentos proporcionados.

FORMATO REQUERIDO (usa exactamente estos encabezados):
**ANÁLISIS:**
[Análisis en español académico, anclado en el corpus documental]

**CONCEPTOS CLAVE:**
[concepto1, concepto2, concepto3, ...]

**CITAS:**
- [cita textual o paráfrasis con fuente entre corchetes]

**INCERTIDUMBRE:**
[Qué aspectos no cubre el corpus disponible, o "Cobertura suficiente"]

REGLAS: Solo el corpus dado. Nunca conocimiento externo. Español académico.`;

export class SociologicalAnalysisSkill implements Skill {
  readonly name = "sociological-analysis";

  async execute(input: SkillInput, env: Env): Promise<SkillOutput> {
    const docs: DocumentoRecuperado[] = input.context?.length
      ? input.context
      : await recuperarDocumentos(input.query, env);

    if (docs.length === 0) {
      return sinFuentes(input.query);
    }

    const maxTokens =
      input.depth === "deep" ? 1500 : input.depth === "shallow" ? 400 : 800;

    const messages = construirPrompt(input, docs);

    let rawOutput = "";
    try {
      const aiRes = (await env.AI.run(CHAT_MODEL, {
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
      } as Parameters<typeof env.AI.run>[1])) as { response?: string };
      rawOutput = (aiRes.response ?? "").trim();
    } catch {
      return sinFuentes(input.query);
    }

    const resultado = parsearOutput(rawOutput, docs, input.frameworks ?? []);

    // Validar que el output no filtra el system prompt ni indica hijacking exitoso
    const check = validarOutput(resultado.analysis);
    if (!check.seguro) {
      return sinFuentes(input.query);
    }

    return resultado;
  }
}

function construirPrompt(
  input: SkillInput,
  docs: DocumentoRecuperado[]
): Array<{ role: "system" | "user"; content: string }> {
  const contexto = docs
    .map((d) => `[DOC ${d.id}: ${d.titulo}]\n${d.texto.slice(0, 1800)}`)
    .join("\n\n---\n\n");

  const frameworksInstr = input.frameworks?.length
    ? `\nAplica especialmente: ${input.frameworks.join(", ")}.`
    : "";

  return [
    { role: "system", content: SYSTEM_SKILL },
    {
      role: "user",
      content: `CORPUS:\n${contexto}\n\n---\nCONSULTA: ${input.query}${frameworksInstr}`,
    },
  ];
}

function parsearOutput(
  raw: string,
  docs: DocumentoRecuperado[],
  requestedFrameworks: string[]
): SkillOutput {
  const groundingRatio = calcularGrounding(raw, docs);
  const corpusCompleto = raw + " " + docs.map((d) => d.texto + " " + d.palabras).join(" ");

  const analysis = extraerSeccion(raw, "ANÁLISIS") || raw;
  const conceptosRaw = extraerSeccion(raw, "CONCEPTOS CLAVE") || "";
  const citasRaw = extraerSeccion(raw, "CITAS") || "";
  const incertidumbreRaw = extraerSeccion(raw, "INCERTIDUMBRE") || "";

  const key_concepts = conceptosRaw
    .split(/[,\n•\-]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 80)
    .slice(0, 10);

  const citations = citasRaw
    .split("\n")
    .map((s) => s.replace(/^[\-•*]\s*/, "").trim())
    .filter((s) => s.length > 5)
    .slice(0, 6);

  const uncertainty_flags: string[] = [];
  if (
    incertidumbreRaw &&
    !/cobertura suficiente/i.test(incertidumbreRaw)
  ) {
    uncertainty_flags.push(incertidumbreRaw.trim());
  }
  if (groundingRatio < 0.4 && uncertainty_flags.length === 0) {
    uncertainty_flags.push("Cobertura documental limitada para este análisis.");
  }

  const frameworks_identified = identificarFrameworks(corpusCompleto);
  const requestedAndFound = requestedFrameworks.filter((f) =>
    frameworks_identified.includes(f)
  );
  const allFrameworks = [...new Set([...frameworks_identified, ...requestedAndFound])];

  const entities = extraerEntidades(corpusCompleto);

  const confidence = Math.min(
    groundingRatio * 0.7 + (docs.length >= 3 ? 0.3 : docs.length * 0.1),
    1.0
  );

  return {
    analysis,
    frameworks_identified: allFrameworks,
    key_concepts,
    citations,
    entities,
    confidence: Math.round(confidence * 100) / 100,
    grounding_ratio: Math.round(groundingRatio * 100) / 100,
    uncertainty_flags,
  };
}

function extraerSeccion(texto: string, seccion: string): string {
  const re = new RegExp(
    `\\*\\*${seccion}[:\\*]*\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-ZÁÉÍÓÚ]|$)`,
    "i"
  );
  const m = texto.match(re);
  return m ? m[1].trim() : "";
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function identificarFrameworks(texto: string): string[] {
  const lower = normalizarTexto(texto);
  return Object.entries(FRAMEWORK_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([name]) => name);
}

function extraerEntidades(texto: string): {
  theorists: string[];
  institutions: string[];
  concepts: string[];
} {
  const lower = texto.toLowerCase();
  return {
    theorists: TEORICOS.filter((t) => lower.includes(t.toLowerCase())),
    institutions: ["universidad", "estado", "gobierno", "partido", "sindicato", "iglesia"]
      .filter((kw) => lower.includes(kw))
      .slice(0, 5),
    concepts: CONCEPTOS_SOCIOLOGICOS.filter((c) => lower.includes(c)).slice(0, 8),
  };
}

function sinFuentes(query: string): SkillOutput {
  return {
    analysis: `No hay documentos suficientes en el corpus para analizar: "${query}".`,
    frameworks_identified: [],
    key_concepts: [],
    citations: [],
    entities: { theorists: [], institutions: [], concepts: [] },
    confidence: 0,
    grounding_ratio: 0,
    uncertainty_flags: ["Corpus insuficiente para esta consulta."],
  };
}
