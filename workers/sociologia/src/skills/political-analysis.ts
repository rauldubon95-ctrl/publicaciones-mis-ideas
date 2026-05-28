import type { Env } from "../types";
import type { DocumentoRecuperado } from "../types";
import type { Skill, SkillInput, SkillOutput } from "./registry";
import { recuperarDocumentos, calcularGrounding } from "../retrieval";
import { validarOutput } from "../security";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_SKILL = `Eres el asistente académico de Raúl Dubón especializado en ciencia política comparada y análisis del poder en América Latina.

FORMATO REQUERIDO (usa exactamente estos encabezados):
**CONTEXTO POLÍTICO:**
[Régimen, coyuntura y configuración del poder]

**ACTORES Y FUERZAS:**
[Estado, partidos, movimientos, élites y sus posiciones]

**ANÁLISIS:**
[Interpretación académica anclada en el corpus]

**CITAS:**
- [cita o paráfrasis con fuente entre corchetes]

**INCERTIDUMBRE:**
[Qué no cubre el corpus, o "Cobertura suficiente"]

REGLAS: Solo el corpus dado. Español académico. Sin conocimiento externo.`;

const MARCOS_POLITICOS: Record<string, string[]> = {
  "democracia":        ["democracia", "democratización", "elecciones", "sufragio", "representación", "pluralismo"],
  "autoritarismo":     ["autoritarismo", "dictadura", "régimen", "golpe", "represión", "autocracia", "totalitar"],
  "populismo":         ["populismo", "populista", "liderazgo carismático", "pueblo", "antipluralismo", "hegemonía"],
  "estado":            ["estado", "burocracia", "aparato estatal", "soberanía", "legitimidad", "dominación"],
  "movimientos":       ["movimiento social", "acción colectiva", "protesta", "sindicalismo", "organización popular"],
  "partidos":          ["partido político", "sistema de partidos", "bipartidismo", "multipartidismo", "coalición"],
  "geopolitica":       ["imperialismo", "dependencia", "geopolítica", "soberanía", "relaciones internacionales"],
  "izquierda_derecha": ["izquierda", "derecha", "centro", "progresismo", "conservadurismo", "socialismo", "neoliberalismo"],
};

const POLITOLOGOS = [
  "O'Donnell", "Laclau", "Mouffe", "Poulantzas", "Linz", "Stepan",
  "Dahl", "Huntington", "Mainwaring", "Di Tella", "Germani",
  "García Canclini", "Quijano", "Gramsci", "Althusser",
];

const CONCEPTOS_POLITICOS = [
  "hegemonía", "bloque de poder", "correlación de fuerzas", "legitimidad",
  "clientelismo", "corporativismo", "transición pactada", "democracia delegativa",
  "Estado de bienestar", "neopopulismo", "autonomía relativa", "régimen híbrido",
  "sociedad civil", "gobernabilidad", "representación política",
];

export class PoliticalAnalysisSkill implements Skill {
  readonly name = "political-analysis";

  async execute(input: SkillInput, env: Env): Promise<SkillOutput> {
    const docs: DocumentoRecuperado[] = input.context?.length
      ? input.context
      : await recuperarDocumentos(input.query, env);

    if (docs.length === 0) return sinFuentes(input.query);

    const maxTokens = input.depth === "deep" ? 1500 : input.depth === "shallow" ? 400 : 800;

    let rawOutput = "";
    try {
      const aiRes = (await env.AI.run(MODEL, {
        messages: construirPrompt(input, docs),
        max_tokens: maxTokens,
        temperature: 0.2,
      } as Parameters<typeof env.AI.run>[1])) as { response?: string };
      rawOutput = (aiRes.response ?? "").trim();
    } catch {
      return sinFuentes(input.query);
    }

    const resultado = parsearOutput(rawOutput, docs);
    return validarOutput(resultado.analysis).seguro ? resultado : sinFuentes(input.query);
  }
}

function construirPrompt(input: SkillInput, docs: DocumentoRecuperado[]) {
  const contexto = docs
    .map((d) => `[DOC ${d.id}: ${d.titulo}]\n${d.texto.slice(0, 1800)}`)
    .join("\n\n---\n\n");
  const frameworksInstr = input.frameworks?.length
    ? `\nAplica especialmente estos marcos: ${input.frameworks.join(", ")}.`
    : "";
  return [
    { role: "system" as const, content: SYSTEM_SKILL },
    { role: "user" as const, content: `CORPUS:\n${contexto}\n\n---\nCONSULTA POLÍTICA: ${input.query}${frameworksInstr}` },
  ];
}

function parsearOutput(raw: string, docs: DocumentoRecuperado[]): SkillOutput {
  const groundingRatio = calcularGrounding(raw, docs);
  const corpusCompleto = raw + " " + docs.map((d) => d.texto + " " + d.palabras).join(" ");
  const lower = corpusCompleto.toLowerCase();

  const analysis = extraerSeccion(raw, "ANÁLISIS") || raw;
  const actoresRaw = extraerSeccion(raw, "ACTORES Y FUERZAS") || "";
  const citasRaw = extraerSeccion(raw, "CITAS") || "";
  const incertidumbreRaw = extraerSeccion(raw, "INCERTIDUMBRE") || "";

  const key_concepts = actoresRaw
    .split(/[,\n•\-]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80).slice(0, 10);

  const citations = citasRaw
    .split("\n").map((s) => s.replace(/^[\-•*]\s*/, "").trim()).filter((s) => s.length > 5).slice(0, 6);

  const uncertainty_flags: string[] = [];
  if (incertidumbreRaw && !/cobertura suficiente/i.test(incertidumbreRaw)) {
    uncertainty_flags.push(incertidumbreRaw.trim());
  }
  if (groundingRatio < 0.4 && uncertainty_flags.length === 0) {
    uncertainty_flags.push("Cobertura documental limitada para este análisis político.");
  }

  const frameworks_identified = Object.entries(MARCOS_POLITICOS)
    .filter(([, kws]) => kws.some((kw) => lower.includes(kw)))
    .map(([m]) => m);

  const confidence = Math.min(
    groundingRatio * 0.7 + (docs.length >= 3 ? 0.3 : docs.length * 0.1), 1.0
  );

  return {
    analysis,
    frameworks_identified,
    key_concepts,
    citations,
    entities: {
      theorists: POLITOLOGOS.filter((p) => lower.includes(p.toLowerCase())),
      institutions: ["estado", "partido", "sindicato", "ejército", "iglesia", "parlamento"]
        .filter((kw) => lower.includes(kw)).slice(0, 5),
      concepts: CONCEPTOS_POLITICOS.filter((c) => lower.includes(c)).slice(0, 8),
    },
    confidence: Math.round(confidence * 100) / 100,
    grounding_ratio: Math.round(groundingRatio * 100) / 100,
    uncertainty_flags,
  };
}

function extraerSeccion(texto: string, seccion: string): string {
  const re = new RegExp(`\\*\\*${seccion}[:\\*]*\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*[A-ZÁÉÍÓÚ]|$)`, "i");
  const m = texto.match(re);
  return m ? m[1].trim() : "";
}

function sinFuentes(query: string): SkillOutput {
  return {
    analysis: `No hay documentos suficientes en el corpus para analizar políticamente: "${query}".`,
    frameworks_identified: [], key_concepts: [], citations: [],
    entities: { theorists: [], institutions: [], concepts: [] },
    confidence: 0, grounding_ratio: 0,
    uncertainty_flags: ["Corpus insuficiente para esta consulta política."],
  };
}
