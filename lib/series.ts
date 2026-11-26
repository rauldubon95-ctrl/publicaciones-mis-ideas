// Series: textos escritos para leerse en orden (libros por capítulos,
// trilogías, artículos encadenados). Se definen aquí, en código, y no en la
// base de datos: no requieren migración y cambiarlas es editar esta lista.
//
// Cada capítulo se identifica por el SLUG de su publicación (la URL no cambia
// aunque se corrija el título). Si un slug no existe o el texto no está
// publicado, simplemente no se muestra.
//
// Propuesta de agrupación: docs/propuesta-titulos-y-series.md (sesión 45).

export interface CapituloSerie {
  slug: string;
  /** Etiqueta propia ("Parte II") cuando la numeración no es correlativa. */
  etiqueta?: string;
  /** Agrupador opcional dentro de la serie ("Parte I · El problema…"). */
  seccion?: string;
}

export interface Serie {
  slug: string;
  titulo: string;
  descripcion: string;
  /** "Capítulo" para libros, "Parte" o "Artículo" para series de artículos. */
  unidad: "Capítulo" | "Parte" | "Artículo";
  capitulos: CapituloSerie[];
}

export const SERIES: Serie[] = [
  {
    slug: "la-ideologia-en-disputa",
    titulo: "La ideología en disputa",
    descripcion:
      "Libro publicado por capítulos: la historia del concepto de ideología y de las tradiciones que lo disputaron, de Marx al análisis crítico del discurso.",
    unidad: "Capítulo",
    capitulos: [
      { slug: "genealogia-de-un-concepto-en-disputa-capitulo-1", seccion: "Parte I · El problema y el punto de observación" },
      { slug: "el-observador-observado-vigilancia-epistemologica-y-reflexividad-cap-2", seccion: "Parte I · El problema y el punto de observación" },
      { slug: "la-ideologia-en-disputa-cap-3", seccion: "Parte II · Máscara: la tradición crítica" },
      { slug: "la-ideologia-en-disputa-cap-4-lukacs-y-gramsci-cosificacion-y-hegemonia", seccion: "Parte II · Máscara: la tradición crítica" },
      { slug: "la-ideologia-en-disputa-la-escuela-de-frankfurt-industria-cultural-y-razon-instrumental", seccion: "Parte II · Máscara: la tradición crítica" },
      { slug: "la-ideologia-en-disputa-cap-6-althusser-aparatos-ideologicos-e-interpelacion-del-sujeto", seccion: "Parte II · Máscara: la tradición crítica" },
      { slug: "la-ideologia-en-disputa-mannheim-sociologia-del-conocimiento-y-reflexividad-cap-7", seccion: "Parte III · Desplazamientos: del saber al discurso" },
      { slug: "foucault-del-poder-saber-al-abandono-del-concepto-de-ideologia-cap-8", seccion: "Parte III · Desplazamientos: del saber al discurso" },
      { slug: "laclau-mouffe-y-zizek-hegemonia-discursiva-y-el-retorno-psicoanalitico-de-la-ideologia-cap-9", seccion: "Parte III · Desplazamientos: del saber al discurso" },
      { slug: "thompson-fairclough-y-van-dijk-hermeneutica-profunda-y-analisis-critico-del-discurso-cap-10", seccion: "Parte III · Desplazamientos: del saber al discurso" },
    ],
  },
  {
    slug: "clases-y-sujeto-politico",
    titulo: "Clases y sujeto político en América Latina (2008–2026)",
    descripcion:
      "Investigación en dos partes: por qué las clases son hoy más nítidas en la cúspide y por qué eso no se traduce en sujetos políticos.",
    unidad: "Parte",
    capitulos: [
      { slug: "dubon-clases-mas-nitidas-democracias-mas-fragiles" },
      { slug: "dubon-parte2-clases-nitidas-sujetos-opacos" },
    ],
  },
  {
    slug: "sujeto-historico-y-pensamiento-critico",
    titulo: "Sujeto histórico y pensamiento crítico",
    // Artículos 02, 03, 04 y 06 llevan el número en el nombre de archivo; el 01
    // y el 05 se dedujeron por formato de cabecera, tema y fecha (20 may y 1 jun
    // encajan en la secuencia 22, 23, 24 may y 2 jun).
    descripcion:
      "Seis artículos sobre cómo el pensamiento crítico latinoamericano reformuló la pregunta por el sujeto de la transformación social.",
    unidad: "Artículo",
    capitulos: [
      { slug: "la-crisis-del-sujeto-historico-clasico-laclau-gorz-y-hardt-negri-ante-el-agotamiento-del-proletariado-fordista" },
      { slug: "articulo-02-anclaje-material-wood" },
      { slug: "articulo-03-mutaciones-pensamiento-critico" },
      { slug: "articulo-04-colonialidad-poder-quijano" },
      { slug: "epistemicidio-ecologias-de-saberes-y-la-dimension-epistemica-del-sujeto-historico" },
      { slug: "articulo-06-desposesion-centroamerica" },
    ],
  },
  {
    slug: "teologia-politica-critica",
    titulo: "Teología política crítica",
    // La Parte IV menciona "el Dios-Sustantivo… el César-Verbo… y la
    // Iglesia-Bisagra": la III (Iglesia-Bisagra) no está en la base (sesión 45).
    descripcion:
      "Serie en cuatro partes sobre religión, poder y autoritarismo en América Latina. La Parte III aún no está publicada en este sitio.",
    unidad: "Parte",
    capitulos: [
      { slug: "el-dios-sustantivo", etiqueta: "Parte I" },
      { slug: "el-cesar-dios", etiqueta: "Parte II" },
      { slug: "el-pueblo-creyente-como-sujeto-recepcion-activa-resistencia-cotidiana-y-agencia-popular-en-el-dispositivo-teologico-politico-latinoamericano", etiqueta: "Parte IV" },
    ],
  },
  {
    slug: "trilogia-metodologica",
    titulo: "Trilogía metodológica",
    descripcion:
      "Tres artículos sobre rigor, innovación y ética en la investigación social aplicada.",
    unidad: "Artículo",
    capitulos: [
      { slug: "el-rigor-como-postura-epistemica" },
      { slug: "innovar-sin-improvisar" },
      { slug: "la-etica-no-va-al-final" },
    ],
  },
  {
    slug: "ciudad-y-desigualdad-en-san-salvador",
    titulo: "Ciudad y desigualdad en San Salvador",
    descripcion:
      "Tres artículos sobre el Centro Histórico, el comercio informal y el derecho a la vivienda.",
    unidad: "Artículo",
    capitulos: [
      { slug: "reorganizacion-espacial-de-la-desigualdad-gentrificacion-acumulacion-por-desposesion-y-periferizacion-urbana-en-el-area-metropolitana-de-san-salvador" },
      { slug: "economia-moral-genero-y-derechos-del-comercio-informal-en-el-centro-historico-de-san-salvador" },
      { slug: "derecho-a-la-vivienda-en-el-salvador" },
    ],
  },
];

export interface UbicacionEnSerie {
  serie: Serie;
  indice: number; // 0-based dentro de serie.capitulos
  /** "Capítulo 4 de 10", "Parte II", "Artículo 2 de 3" */
  rotulo: string;
  anterior: CapituloSerie | null;
  siguiente: CapituloSerie | null;
}

export function rotuloCapitulo(serie: Serie, indice: number): string {
  const c = serie.capitulos[indice];
  if (c.etiqueta) return c.etiqueta;
  return `${serie.unidad} ${indice + 1} de ${serie.capitulos.length}`;
}

export function serieDePublicacion(slug: string): UbicacionEnSerie | null {
  for (const serie of SERIES) {
    const indice = serie.capitulos.findIndex((c) => c.slug === slug);
    if (indice === -1) continue;
    return {
      serie,
      indice,
      rotulo: rotuloCapitulo(serie, indice),
      anterior: serie.capitulos[indice - 1] ?? null,
      siguiente: serie.capitulos[indice + 1] ?? null,
    };
  }
  return null;
}

export function serieDeSlug(slug: string): Serie | undefined {
  return SERIES.find((s) => s.slug === slug);
}
