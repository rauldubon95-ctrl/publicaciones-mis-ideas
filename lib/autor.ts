// Perfil del autor — edita estos datos con tu información real.
// Este archivo nunca se sube con credenciales; es solo datos públicos de presentación.

export const AUTOR = {
  nombre: "Raúl Dubón",
  titulo: "Sociólogo · Investigador social · M&E",
  bio: "Sociólogo por la Universidad de El Salvador (egresado Cum Honorífico), con más de siete años de experiencia en investigación social aplicada, monitoreo y evaluación de programas y trabajo con niñez, adolescencia y juventudes. Ha coordinado consultorías en proyectos financiados por la Unión Europea, el Sistema ONU y la cooperación bilateral.",
  bioCorta:
    "Más de siete años en investigación social aplicada, monitoreo y evaluación y trabajo con niñez y juventudes en El Salvador.",
  formacion: [
    "Licenciatura en Sociología — UES (Cum Honorífico)",
    "MBA en Gestión de Proyectos (en curso)",
  ],
  especialidades: [
    "Investigación social aplicada",
    "Monitoreo y evaluación (M&E)",
    "Protección de niñez y adolescencia",
    "Análisis de datos (R, Python, SPSS)",
  ],
  enlaces: {
    orcid:        "",   // ej: "https://orcid.org/0000-0000-0000-0000"
    scholar:      "",   // ej: "https://scholar.google.com/..."
    linkedin:     "",
    researchgate: "",
    cv:           "",   // URL pública a tu CV en PDF (puede ser Supabase Storage)
  },
  // Foto: coloca una imagen en /public/autor.jpg o deja vacío
  foto: "",
};

// Trilogía publicada (solo mención, sin enlaces externos por indexación).
export const LIBROS_AUTOR = [
  {
    volumen: "Volumen I",
    titulo: "El sujeto histórico del siglo XXI",
    subtitulo:
      "Clase, colonialidad y territorio en América Latina. Más allá del debate europeo: hacia una teoría decolonial-materialista de la transformación social.",
  },
  {
    volumen: "Volumen II",
    titulo: "Construir Poder",
    subtitulo: "",
  },
  {
    volumen: "Volumen III",
    titulo: "Transformar el Estado",
    subtitulo: "Poder y transformación.",
  },
];
