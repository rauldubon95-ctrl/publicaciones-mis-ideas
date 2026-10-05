import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { LIBROS_AUTOR } from "@/lib/autor";
import { BASE_URL, breadcrumbJsonLd, canonicalUrl, SITE_NAME } from "@/lib/seo";

const DESCRIPCION =
  "Raúl Dubón, sociólogo e investigador social salvadoreño. Más de siete años en investigación aplicada, monitoreo y evaluación (M&E) y trabajo con niñez, adolescencia y juventudes.";

export const metadata: Metadata = {
  title: "Sobre mí",
  description: DESCRIPCION,
  alternates: { canonical: canonicalUrl("/sobre-mi") },
  openGraph: {
    type: "profile",
    title: `Sobre mí — ${SITE_NAME}`,
    description: DESCRIPCION,
    url: canonicalUrl("/sobre-mi"),
    siteName: SITE_NAME,
    locale: "es_ES",
  },
};

// Perfil profesional (fuente: CV, curado y sin datos de contacto privados).
const ESPECIALIDADES = [
  "Investigación social aplicada",
  "Monitoreo y evaluación (M&E)",
  "Líneas de base y caracterizaciones",
  "Protección de niñez y adolescencia",
  "Seguridad alimentaria (marco CARI)",
  "Análisis de datos (SPSS, R, Python, ATLAS.ti)",
  "Power BI · Looker Studio · KoboToolbox",
  "Cooperación internacional",
];

const EXPERIENCIA = [
  {
    periodo: "2026 – Actualidad",
    rol: "Técnico de Procesamiento y Análisis de Datos",
    org: "Educo El Salvador — proyecto ejecutado con el Programa Mundial de Alimentos (PMA)",
    detalle:
      "Análisis de la Línea de Base 2026 y del ejercicio de focalización OCHA; rutinas de procesamiento en R y Python e indicadores de seguridad alimentaria bajo el marco analítico CARI.",
  },
  {
    periodo: "2026 – Actualidad",
    rol: "Evaluador — Estrategia de Calidad Educativa",
    org: "SSPAS / FAD Juventud / CMDL — Convenio AECID",
    detalle:
      "Evaluación y sistematización en diez centros escolares del Área Metropolitana de San Salvador, con instrumentos cualitativos y protocolos éticos para personas adultas, niñez y adolescencia.",
  },
  {
    periodo: "2026 – Actualidad",
    rol: "Investigador Asociado — CISS",
    org: "Universidad Evangélica de El Salvador (UEES)",
    detalle:
      "Investigación sobre estresores antropogénicos y climáticos en especies marinas prioritarias para la alimentación y la economía costera de El Salvador y Honduras.",
  },
  {
    periodo: "2026",
    rol: "Consultor en Monitoreo, Evaluación y Aprendizaje (MEAL)",
    org: "Fe y Alegría El Salvador / Catholic Relief Services (CRS) — Proyecto OYE",
    detalle:
      "Diseño e impartición de un plan de formación de 40 horas en monitoreo, evaluación, rendición de cuentas y aprendizaje para equipos de formación juvenil.",
  },
  {
    periodo: "Abr. – Jun. 2026",
    rol: "Consultor — Levantamiento y sistematización de información cualitativa",
    org: "Servicio Social Pasionista (SSPAS) — Proyecto “Construyendo Paz” (FAD Juventud / Generalitat Valenciana)",
    detalle:
      "Investigación cualitativa sobre políticas de prevención de la violencia en El Salvador: trabajo de campo en territorios del interior, codificación de entrevistas y grupos focales e informe de hallazgos clave.",
  },
  {
    periodo: "Nov. 2025 – Abr. 2026",
    rol: "Consultor — Sistema de M&E y Línea de Base",
    org: "Aldeas Infantiles SOS El Salvador — Proyecto financiado por la Unión Europea",
    detalle:
      "Herramientas de recolección y procesamiento para la línea de base en Centros de Inserción Social con adolescentes en proceso de reinserción, personal de cuidado y familias.",
  },
  {
    periodo: "Nov. 2025 – Abr. 2026",
    rol: "Consultor — Caracterización PINA San Salvador Centro",
    org: "Servicio Social Pasionista (SSPAS)",
    detalle:
      "Caracterización de primera infancia, niñez y adolescencia en cinco distritos, con análisis de fuentes primarias, secundarias y censales para el Comité Local de Derechos.",
  },
  {
    periodo: "2025",
    rol: "Consultor en Investigación Social — Condiciones socioeducativas",
    org: "Servicio Social Pasionista (SSPAS) — Mejicanos",
    detalle:
      "Estudio sobre el impacto de las condiciones sociales en la educación en cuatro centros escolares públicos; resultados presentados como ponencia en el congreso “Aprendiendo Juntos”.",
  },
  {
    periodo: "2025",
    rol: "Técnico en Monitoreo y Seguimiento Pedagógico",
    org: "Universidad Don Bosco — Consultoría modalidades flexibles",
    detalle:
      "Validación del sistema de monitoreo de cinco modalidades flexibles de educación mediante observación en centros escolares y entrevistas, y construcción de un modelo contextualizado de seguimiento pedagógico.",
  },
  {
    periodo: "Jun. – Dic. 2025",
    rol: "Consultor en M&E — Proyecto FORMA-TE",
    org: "CEMYPE, Universidad Evangélica de El Salvador",
    detalle:
      "Diseño e implementación de un sistema de monitoreo y evaluación institucional desde cero, con enfoque participativo y herramientas no-code.",
  },
  {
    periodo: "2021 – 2024",
    rol: "Técnico de Investigación Social — Programa La Liga",
    org: "Instituto Nacional de los Deportes de El Salvador (INDES)",
    detalle:
      "Coordinación de investigaciones de impacto social a escala nacional con niñez y adolescencia, y diseño de metodología de monitoreo de ODS con elaboración de artículos indexados.",
  },
  {
    periodo: "2024",
    rol: "Sistematizador de investigación histórica",
    org: "Universidad Evangélica de El Salvador",
    detalle:
      "Sistematización y codificación en ATLAS.ti para el estudio “Incidencia de la Subcuenca del Río Sucio en la configuración sociohistórica de Quezaltepeque, 1524–1950”.",
  },
  {
    periodo: "2024",
    rol: "Implementación de proyecto socio-deportivo",
    org: "Asociación Deporte Sin Fronteras — Embajada de Irlanda",
    detalle:
      "Coordinación del proyecto Olas de Oportunidades (formación laboral de jóvenes en salvamento acuático) y gestión del equipo de campo.",
  },
  {
    periodo: "2023 – 2024",
    rol: "Co-investigador — Políticas deportivas universitarias",
    org: "Universidad Evangélica de El Salvador / ANADES",
    detalle:
      "Estudio cualitativo sobre modelos de implementación de políticas deportivas en estudiantes de educación superior: entrevistas, cuestionarios, grupos focales y análisis temático.",
  },
  {
    periodo: "2023 – 2024",
    rol: "Co-investigador — Estudio medioambiental",
    org: "OXFAM El Salvador",
    detalle:
      "Sistematización de experiencias de personas defensoras ambientales, con enfoque de derechos y sostenibilidad.",
  },
  {
    periodo: "2023",
    rol: "Técnico de campo — Consultorías sociales",
    org: "Aldeas Infantiles SOS El Salvador",
    detalle:
      "Análisis situacional del impacto del COVID-19 en jóvenes de Sonsonate, Acajutla, San Miguel y Conchagua, con validación de datos y herramientas cualitativas de campo.",
  },
  {
    periodo: "2020 – 2021",
    rol: "Implementación de proyecto de juventudes",
    org: "Instituto Holandés para la Democracia Multipartidaria (NIMD)",
    detalle:
      "Articulación de espacios para juventudes que promueven la participación democrática y redes juveniles a nivel comunitario.",
  },
];

const FORMACION = [
  {
    titulo: "Licenciatura en Sociología — Graduado Cum Honorífico (2021)",
    detalle: "Universidad de El Salvador (UES). Metodología cuali y cuantitativa, análisis estadístico y sociología de la educación.",
  },
];

const PUBLICACIONES = [
  "Quintanilla Magaña, A., Dubón, J.R., Flores de Pérez, K. y Juárez, J.O. (2026). Reconstrucción histórica del deporte como extensión universitaria en El Salvador (f. s. XIX–2010). Ciencia, Cultura y Sociedad, 12(1), 35–58. https://doi.org/10.69789/ccs.v12i1.757",
  "Dubón, J.R. (2026). Abordaje metodológico. Incidencia de la subcuenca del río Sucio en la configuración sociohistórica de Quezaltepeque, 1524–1950. Ciencia, Cultura y Sociedad, 12(1), 86–113. https://doi.org/10.69789/ccs.v12i1.850",
  "Juárez, J.O. y Dubón, J.R. (2025). Dirección estratégica y un modelo de gobernanza para el desarrollo comunitario a través del deporte. Revista Centroamericana de Administración Pública, 88, 172–182. https://doi.org/10.35485/rcap88_9",
  "Dubón, J.R. et al. (2024). Economía invisible de mujeres y su contribución en el deporte infantil. Revista FairPlay, Universitat Pompeu Fabra, Barcelona.",
  "Dubón, J.R. (2023). Evaluación del impacto de los CAMPUS socio-deportivos. INDES, El Salvador.",
  "Co-autor del estudio “Perspectivas en los modelos de implementación de políticas deportivas” (UEES / ANADES).",
  "Ponente en el congreso “Aprendiendo Juntos” (SSPAS, 2025): hallazgos sobre condiciones socioeducativas en centros escolares de Mejicanos.",
];

export default function SobreMiPage() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Raúl Dubón",
    alternateName: "José Raúl Dubón Huezo",
    jobTitle: "Sociólogo · Investigador social",
    description: DESCRIPCION,
    url: canonicalUrl("/sobre-mi"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Salvador",
      addressCountry: "SV",
    },
    knowsAbout: ESPECIALIDADES,
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Universidad de El Salvador",
    },
    mainEntityOfPage: canonicalUrl("/sobre-mi"),
    ...(BASE_URL ? { "@id": `${BASE_URL}/#persona` } : {}),
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Sobre mí", path: "/sobre-mi" },
  ]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <JsonLd data={[personJsonLd, breadcrumb]} />

      <nav className="text-xs text-zinc-400 mb-8 flex items-center gap-1.5 uppercase tracking-wider">
        <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-zinc-600">Sobre mí</span>
      </nav>

      {/* Encabezado */}
      <header className="mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700 mb-4">
          Quién soy
        </p>
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-zinc-900 leading-[1.05] tracking-tight mb-4">
          Raúl Dubón
        </h1>
        <p className="text-lg text-zinc-600 leading-relaxed">
          Sociólogo · Investigador social · Monitoreo y evaluación
        </p>
        <p className="text-sm text-zinc-400 mt-2">San Salvador, El Salvador</p>
      </header>

      {/* Perfil profesional */}
      <section className="mb-14">
        <p className="text-zinc-700 text-base leading-relaxed">
          Soy sociólogo por la Universidad de El Salvador (graduado <em>Cum Honorífico</em>) con
          más de siete años de experiencia acumulada en investigación social aplicada, monitoreo y
          evaluación de programas y trabajo directo con niñez, adolescencia y juventudes en
          contextos educativos y comunitarios.
        </p>
        <p className="text-zinc-700 text-base leading-relaxed mt-4">
          He liderado y coordinado consultorías en el marco de proyectos financiados por la Unión
          Europea, organizaciones del Sistema ONU y organismos de cooperación bilateral, incluyendo
          el diseño de líneas de base, caracterizaciones territoriales, sistemas de M&amp;E e
          instrumentos de recolección cuali-cuantitativa. Combino una sólida formación en ciencias
          sociales con certificaciones en protección integral de la niñez y la Agenda 2030.
        </p>
      </section>

      {/* Áreas de especialización */}
      <section className="mb-14">
        <h2 className="text-2xl font-serif font-semibold text-zinc-900 mb-5">
          Áreas de especialización
        </h2>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES.map((e) => (
            <span
              key={e}
              className="text-sm bg-zinc-50 border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-full"
            >
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Experiencia */}
      <section className="mb-14">
        <h2 className="text-2xl font-serif font-semibold text-zinc-900 mb-6">
          Experiencia profesional
        </h2>
        <div className="space-y-8 border-l border-zinc-200 pl-6">
          {EXPERIENCIA.map((exp) => (
            <div key={`${exp.rol}-${exp.periodo}`} className="relative">
              <span
                className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white"
                aria-hidden
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                {exp.periodo}
              </p>
              <p className="font-serif font-semibold text-zinc-900 leading-snug">{exp.rol}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{exp.org}</p>
              <p className="text-sm text-zinc-600 leading-relaxed mt-2">{exp.detalle}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-400 mt-6">
          Cartas de referencia disponibles a solicitud.
        </p>
      </section>

      {/* Formación */}
      <section className="mb-14">
        <h2 className="text-2xl font-serif font-semibold text-zinc-900 mb-6">Formación académica</h2>
        <div className="space-y-5">
          {FORMACION.map((f) => (
            <div key={f.titulo}>
              <p className="font-medium text-zinc-800">{f.titulo}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{f.detalle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Libros publicados */}
      <section className="mb-14">
        <h2 className="text-2xl font-serif font-semibold text-zinc-900 mb-2">Libros publicados</h2>
        <p className="text-sm text-zinc-500 mb-6">Trilogía disponible en Amazon.</p>
        <div className="space-y-4">
          {LIBROS_AUTOR.map((libro) => (
            <div
              key={libro.titulo}
              className="border border-zinc-200 rounded-xl bg-zinc-50/60 p-5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
                {libro.volumen}
              </p>
              <p className="font-serif font-semibold text-zinc-900 text-lg leading-snug">
                {libro.titulo}
              </p>
              {libro.subtitulo && (
                <p className="text-sm text-zinc-600 leading-relaxed mt-1">{libro.subtitulo}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Publicaciones académicas */}
      <section className="mb-14">
        <h2 className="text-2xl font-serif font-semibold text-zinc-900 mb-5">
          Publicaciones académicas
        </h2>
        <ul className="space-y-3">
          {PUBLICACIONES.map((p) => (
            <li key={p} className="text-sm text-zinc-600 leading-relaxed pl-4 border-l-2 border-zinc-200">
              {p}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 pt-10">
        <p className="text-zinc-600 leading-relaxed mb-5">
          ¿Te interesa una colaboración, una consultoría o conocer más de mi trabajo?
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/servicios"
            className="inline-flex items-center bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
          >
            Ver servicios de consultoría
          </Link>
          <Link
            href="/publicaciones"
            className="inline-flex items-center border border-zinc-300 hover:border-zinc-400 text-zinc-700 text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
          >
            Leer mis publicaciones
          </Link>
        </div>
      </section>
    </main>
  );
}
