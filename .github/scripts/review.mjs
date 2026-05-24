// Agente 1: Revisor de código — analiza el diff y crea issues con mejoras
// Se invoca desde el workflow code-review.yml
// Usa GitHub Models (gratuito) — sin API key extra, solo GITHUB_TOKEN

import { execSync } from "child_process";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // owner/repo
const EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const PR_NUMBER = process.env.PR_NUMBER;

if (!GITHUB_TOKEN) { console.error("Falta GITHUB_TOKEN"); process.exit(1); }
if (!REPO) { console.error("Falta GITHUB_REPOSITORY"); process.exit(1); }

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";
const MODEL = "meta-llama-3.1-70b-instruct";

// Obtener diff según el contexto (PR o revisión semanal)
function obtenerDiff() {
  try {
    if (EVENT_NAME === "pull_request" && PR_NUMBER) {
      return execSync(`git diff origin/main...HEAD -- '*.ts' '*.tsx' '*.js' '*.mjs'`, { encoding: "utf8" });
    }
    // Revisión semanal: últimos 7 días de cambios
    return execSync(`git log --since="7 days ago" --pretty=format: -p -- '*.ts' '*.tsx' '*.js' '*.mjs'`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

// Obtener lista de archivos modificados recientemente
function obtenerArchivosRecientes() {
  try {
    return execSync(`git diff --name-only origin/main...HEAD 2>/dev/null || git log --since="7 days ago" --name-only --pretty=format: | sort -u`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function llamarModelo(diff, archivos) {
  const sistema = `Eres un revisor de código senior especializado en Next.js, TypeScript, Cloudflare Workers y seguridad web.
Estás revisando el repositorio "publicaciones-mis-ideas" — una plataforma académica con:
- Frontend Next.js 14 + Supabase + Prisma (en Vercel)
- Cloudflare Worker para asistente IA con D1, KV, Workers AI
- Sistema de publicaciones, recursos, cómics y comentarios`;

  const usuario = `Archivos modificados:
${archivos || "(revisión completa semanal)"}

Diff de cambios:
${diff.slice(0, 12000)}

Analiza el código y encuentra oportunidades de mejora concretas y realizables.

Para cada mejora encontrada, crea una entrada con exactamente este formato:

---MEJORA---
CATEGORÍA: [Seguridad|Rendimiento|Calidad|UX|Mantenibilidad]
PRIORIDAD: [Alta|Media|Baja]
ARCHIVO: ruta/al/archivo.ts (línea aproximada si aplica)
TÍTULO: Título corto y descriptivo (máx 80 chars)
DESCRIPCIÓN: Explicación del problema en 2-3 oraciones.
IMPACTO: Qué pasa si no se corrige / qué mejora si se implementa.
IMPLEMENTACIÓN: Pasos concretos o código de ejemplo para implementarlo.
---FIN---

Busca específicamente:
1. Código duplicado que puede ser un helper compartido
2. Llamadas a BD sin índices o con N+1 queries
3. Manejo de errores inconsistente
4. Oportunidades de caché (React cache(), unstable_cache)
5. Componentes que pueden memoizarse
6. Validaciones de input faltantes o incompletas
7. Mejoras de accesibilidad (aria, semántica HTML)
8. Seguridad: headers faltantes, validaciones débiles
9. TypeScript: tipos any, aserciones innecesarias
10. Tests faltantes para lógica crítica

Sé específico. Solo reporta mejoras reales que valgan la pena implementar. Máximo 8 mejoras por revisión.`;

  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub Models API error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function parsearMejoras(texto) {
  const mejoras = [];
  const bloques = texto.split("---MEJORA---").slice(1);

  for (const bloque of bloques) {
    const fin = bloque.indexOf("---FIN---");
    const contenido = fin >= 0 ? bloque.slice(0, fin) : bloque;

    const get = (campo) => {
      const re = new RegExp(`${campo}:\\s*(.+?)(?=\\n[A-ZÁÉÍÓÚ]+:|$)`, "s");
      return contenido.match(re)?.[1]?.trim() ?? "";
    };

    const titulo = get("TÍTULO");
    if (!titulo) continue;

    mejoras.push({
      titulo,
      categoria: get("CATEGORÍA"),
      prioridad: get("PRIORIDAD"),
      archivo: get("ARCHIVO"),
      descripcion: get("DESCRIPCIÓN"),
      impacto: get("IMPACTO"),
      implementacion: get("IMPLEMENTACIÓN"),
    });
  }

  return mejoras;
}

async function crearIssue(mejora, numero) {
  const etiquetas = ["ai-mejora"];
  if (mejora.categoria === "Seguridad") etiquetas.push("security");
  if (mejora.prioridad === "Alta") etiquetas.push("priority-high");
  if (mejora.prioridad === "Media") etiquetas.push("priority-medium");
  if (mejora.prioridad === "Baja") etiquetas.push("priority-low");

  const body = `## ${mejora.categoria} — Prioridad ${mejora.prioridad}

**Archivo:** \`${mejora.archivo || "General"}\`

### Descripción
${mejora.descripcion}

### Impacto
${mejora.impacto}

### Cómo implementarlo
${mejora.implementacion}

---
*Sugerencia generada automáticamente por el Agente de Revisión de Código. Revisar antes de implementar.*`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      title: `[IA-${String(numero).padStart(2, "0")}] ${mejora.titulo}`,
      body,
      labels: etiquetas,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Error creando issue: ${err}`);
    return null;
  }

  const issue = await res.json();
  console.log(`✅ Issue #${issue.number} creado: ${mejora.titulo}`);
  return issue;
}

async function asegurarEtiquetas() {
  const etiquetas = [
    { name: "ai-mejora", color: "0075ca", description: "Mejora sugerida por el agente IA" },
    { name: "ai-reporte", color: "e4e669", description: "Reporte de prioridades generado por IA" },
    { name: "priority-high", color: "d73a4a", description: "Prioridad alta" },
    { name: "priority-medium", color: "f9d0c4", description: "Prioridad media" },
    { name: "priority-low", color: "cfd3d7", description: "Prioridad baja" },
  ];

  for (const etiqueta of etiquetas) {
    await fetch(`https://api.github.com/repos/${REPO}/labels`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json",
      },
      body: JSON.stringify(etiqueta),
    });
    // 422 significa que ya existe — ignoramos ese error intencionalmente
  }
}

async function main() {
  console.log("🔍 Agente de Revisión iniciando...");
  await asegurarEtiquetas();

  const diff = obtenerDiff();
  const archivos = obtenerArchivosRecientes();

  if (!diff && !archivos) {
    console.log("No hay cambios para revisar.");
    return;
  }

  console.log(`📊 Analizando ${diff.split("\n").length} líneas de diff...`);
  const respuesta = await llamarModelo(diff, archivos);

  const mejoras = parsearMejoras(respuesta);
  console.log(`\n💡 ${mejoras.length} mejoras encontradas\n`);

  for (let i = 0; i < mejoras.length; i++) {
    await crearIssue(mejoras[i], i + 1);
    // Pequeña pausa para no saturar la API de GitHub
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Revisión completa. ${mejoras.length} issues creados.`);
}

main().catch(err => { console.error(err); process.exit(1); });
