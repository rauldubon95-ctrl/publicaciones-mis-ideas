import type { Env } from "../types";
import type { DocumentoRecuperado } from "../types";
import type { Skill, SkillInput, SkillOutput } from "./registry";
import { recuperarDocumentos, calcularGrounding } from "../retrieval";
import { validarOutput } from "../security";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_SKILL = `Eres el asistente académico de Raúl Dubón especializado en historia latinoamericana y procesos histórico-sociales.

FORMATO REQUERIDO (usa exactamente estos encabezados):
**CONTEXTO HISTÓRICO:**
[Período, coyuntura y condiciones estructurales]

**PROCESOS Y ACTORES:**
[Fuerzas sociales, movimientos y actores clave]

**ANÁLISIS:**
[Interpretación académica anclada en el corpus]

**CITAS:**
- [cita o paráfrasis con fuente entre corchetes]

**INCERTIDUMBRE:**
[Qué no cubre el corpus, o "Cobertura suficiente"]

REGLAS: Solo el corpus dado. Español académico. Sin conocimiento externo.`;

const PERIODOS_KEYWORDS: Record<string, string[]> = {
  "colonial":         ["colonia", "colonial", "virreinato", "conquista", "encomienda", "evangeliz"],
  "independencia":    ["independencia", "emancipación", "libertador", "criollo", "insurgente"],
  "oligarquico":      ["oligarquía", "latifundio", "hacienda", "exportación", "caudillo", "liberal"],
  "revolucionario":   ["revolución", "reforma agraria", "nacionalización", "ejido", "campesino"],
  "autoritario":      ["dictadura", "golpe", "junta", "desaparecido", "represión", "estado de sitio"],
  "democratizacion":  ["transición", "democratización", "elecciones", "ciudadanía", "sufragio"],
  "neoliberal":       ["neoliberal", "ajuste estructural", "privatización", "fmi", "banco mundial"],
  "posneoliberal":    ["marea rosa", "socialismo del siglo xxi", "giro a la izquierda", "buen vivir"],
};

const HISTORIADORES = [
  "Galeano", "Quijano", "Mariátegui", "Cardoso", "Faletto", "Prebisch",
  "Halperin Donghi", "Lynch", "Loveman", "Torres Rivas", "Pérez Brignoli",
  "Amin", "Frank", "Wallerstein", "O'Donnell",
];

const CONCEPTOS_HISTORICOS = [
  "dependencia", "colonialismo interno", "modernización", "desarrollo",
  "industrialización", "reforma agraria", "movimiento obrero", "populismo",
  "autoritarismo", "estado desarrollista", "extractivismo", "caudillismo",
  "sistema mundo", "imperialismo", "mestizaje", "criollismo",
];

export class HistoricalAnalysisSkill implements Skill {
  readonly name = "historical-analysis";

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
  return [
    { role: "system" as const, content: SYSTEM_SKILL },
    { role: "user" as const, content: `CORPUS:\n${contexto}\n\n---\nCONSULTA HISTÓRICA: ${input.query}` },
  ];
}

function parsearOutput(raw: string, docs: DocumentoRecuperado[]): SkillOutput {
  const groundingRatio = calcularGrounding(raw, docs);
  const corpusCompleto = raw + " " + docs.map((d) => d.texto + " " + d.palabras).join(" ");
  const lower = corpusCompleto.toLowerCase();

  const analysis = extraerSeccion(raw, "ANÁLISIS") || raw;
  const procesosRaw = extraerSeccion(raw, "PROCESOS Y ACTORES") || "";
  const citasRaw = extraerSeccion(raw, "CITAS") || "";
  const incertidumbreRaw = extraerSeccion(raw, "INCERTIDUMBRE") || "";

  const key_concepts = procesosRaw
    .split(/[,\n•\-]/).map((s) => s.trim()).filter((s) => s.length > 2 && s.length < 80).slice(0, 10);

  const citations = citasRaw
    .split("\n").map((s) => s.replace(/^[\-•*]\s*/, "").trim()).filter((s) => s.length > 5).slice(0, 6);

  const uncertainty_flags: string[] = [];
  if (incertidumbreRaw && !/cobertura suficiente/i.test(incertidumbreRaw)) {
    uncertainty_flags.push(incertidumbreRaw.trim());
  }
  if (groundingRatio < 0.4 && uncertainty_flags.length === 0) {
    uncertainty_flags.push("Cobertura documental limitada para este análisis histórico.");
  }

  const frameworks_identified = Object.entries(PERIODOS_KEYWORDS)
    .filter(([, kws]) => kws.some((kw) => lower.includes(kw)))
    .map(([p]) => p);

  const confidence = Math.min(
    groundingRatio * 0.7 + (docs.length >= 3 ? 0.3 : docs.length * 0.1), 1.0
  );

  return {
    analysis,
    frameworks_identified,
    key_concepts,
    citations,
    entities: {
      theorists: HISTORIADORES.filter((h) => lower.includes(h.toLowerCase())),
      institutions: ["iglesia", "ejército", "sindicato", "hacienda", "partido", "oligarquía"]
        .filter((kw) => lower.includes(kw)).slice(0, 5),
      concepts: CONCEPTOS_HISTORICOS.filter((c) => lower.includes(c)).slice(0, 8),
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
    analysis: `No hay documentos suficientes en el corpus para analizar históricamente: "${query}".`,
    frameworks_identified: [], key_concepts: [], citations: [],
    entities: { theorists: [], institutions: [], concepts: [] },
    confidence: 0, grounding_ratio: 0,
    uncertainty_flags: ["Corpus insuficiente para esta consulta histórica."],
  };
}
