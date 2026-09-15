// ─────────────────────────────────────────────────────────────
// Instrucciones por contexto de sitio + helpers de fuentes/saludos.
//
// NOTA (sesión 40): se eliminó el bloque legado "Worker v1" que ya no
// usaba nadie (SYSTEM_PROMPT, construirMensajes, construirContexto,
// extraerCita, construirAdvertencia, determinarConfianza). La ruta activa
// arma el prompt dentro de cada skill (workers/sociologia/src/skills/*),
// no aquí. La sanitización del contenido de los documentos vive ahora en
// security.ts (`sanitizarContenidoDoc`) y la aplican las skills.
// ─────────────────────────────────────────────────────────────
import type { ContextoSitio, DocumentoRecuperado } from "./types";
import { limpiarTitulo } from "./fuentes";

// Instrucciones específicas según el contexto del sitio (ubicación web
// desde donde se hace la consulta). Se añaden al SYSTEM de cada skill para
// modular el TONO y las SUGERENCIAS del asistente, SIN alterar las reglas
// absolutas (que siguen siendo intocables).
//
// El contexto viene validado del `index.ts` — si el cliente envía algo
// fuera de la whitelist, se normaliza a "general" ANTES de llegar aquí.
// Nunca insertar `contexto` como texto crudo del usuario.
export function instruccionesContexto(contexto: ContextoSitio): string {
  // NOTA sesión 36: los mensajes son opt-in. El asistente los aplica SOLO
  // cuando efectivamente hay material relevante que responder — la regla
  // crítica del SYSTEM_SKILL de "no improvisar si el corpus no cubre" tiene
  // prioridad absoluta. Estos son sugerencias de tono/cierre, no permisos
  // para inventar.
  switch (contexto) {
    case "publicacion":
      return `\n\nCONTEXTO DE SESIÓN: el visitante está leyendo un artículo del sitio. Si tu respuesta REAL cita artículos del corpus (tipo='publicacion') que sean relevantes, puedes cerrar sugiriéndolos como lectura complementaria con su título entre comillas. No inventes URLs. No añadas sugerencias si la respuesta principal es "no tengo información suficiente".`;
    case "libro":
      return `\n\nCONTEXTO DE SESIÓN: el visitante está en la sección de libros. SOLO si tu análisis se apoya en material que provenga de un documento cuya "fuente" indica que es un libro de Raúl (revisa el campo fuente en el CONTEXTO), puedes cerrar mencionando ese libro con una frase natural (ej: "Este tema se profundiza en el libro X"). NO inventes libros. NO menciones libros si el corpus recuperado no incluye ningún libro real, ni si tu respuesta es "no tengo información suficiente".`;
    case "donacion":
      return `\n\nCONTEXTO DE SESIÓN: el visitante está en la página de donaciones. SOLO si el usuario pregunta explícitamente cómo apoyar el trabajo del autor, o si la respuesta REAL trata directamente del proyecto/trabajo de Raúl, puedes cerrar con una frase discreta invitando a apoyar. NUNCA conviertas una respuesta académica en un pitch. NUNCA menciones donaciones si la respuesta es "no tengo información suficiente" o si el tema es puramente teórico.`;
    case "home":
      return `\n\nCONTEXTO DE SESIÓN: el visitante está en la portada. Puede ser primera visita. Sé claro y accesible. Si la consulta pide orientación general (ej: "de qué habla el sitio", "qué temas hay") puedes sugerir 2-3 secciones o temas concretos que sí existen en el corpus. NO improvises un mapa del sitio si el corpus recuperado no lo respalda.`;
    case "general":
    default:
      return "";
  }
}

// Fuentes para el frontend (títulos únicos). Se limpian los títulos crudos
// (nombres de archivo de PDFs) antes de mostrarlos al usuario.
export function extraerFuentesTitulos(docs: DocumentoRecuperado[]): string[] {
  return [...new Set(docs.map((d) => limpiarTitulo(d.titulo)).filter(Boolean))];
}

// Detectar saludo para respuesta rápida sin LLM.
// Incluye variantes coloquiales (holis, holita, qué onda) y latinoamericanas.
export function esSaludo(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  // Coincidencia exacta con saludos comunes, con puntuación opcional
  const re = /^[\s¡!¿?.,]*(holi(s|ta|to)?|hola|buenas|saludos|hey|hello|hi|holaa+|hola\s+asistente|buen\s+d[ií]a|buenos\s+d[ií]as|buenas\s+(tardes|noches)|qu[eé]\s+tal|qu[eé]\s+onda|qu[eé]\s+hay|qu[eé]\s+pas[oó]?|c[oó]mo\s+est[aá]s?|c[oó]mo\s+va|c[oó]mo\s+andas|hey\s+asistente|good\s+(morning|afternoon|evening))[\s,!?¡¿.]*$/i;
  return re.test(t);
}

// ─────────────────────────────────────────────────────────────
// Filtro anti-consultas-triviales (sesión 35, ajustado)
// ─────────────────────────────────────────────────────────────
// Detecta queries que NO son preguntas reales (frases sueltas, palabras
// aisladas, ruido puro). Evita que el pipeline RAG+LLM se dispare y cite
// documentos irrelevantes ante ruido.
//
// Umbral CONSERVADOR: solo bloquea si NO hay NINGUNA palabra de contenido
// (>= 3 chars, fuera de stop-words). Preguntas cortas legítimas como
// "que es la hegemonía" o "IA en salud" pasan (tienen "hegemonía"/"salud").
export function esConsultaTrivial(texto: string): boolean {
  const STOP = new Set([
    "hola","holi","holis","holita","hey","hello","saludos","buenas",
    "que","como","donde","cuando","para","por","con","del","sin","sus",
    "los","las","una","uno","unos","unas","este","esta","esto","estos",
    "estas","muy","poco","mas","menos","algo","nada","todo","todos",
    "cada","otro","otra","otros","otras","the","and","for","with","from",
    "this","that","are","was","has","have","not","only","yes","si","tal",
    "vez","aun","aunque","pero","sino","asi","aqui","alli","ahi","hoy",
    "ayer","manana","siempre","nunca","dime","dame","cuentame","sabes",
  ]);
  const palabras = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
  return palabras.length < 1;
}
