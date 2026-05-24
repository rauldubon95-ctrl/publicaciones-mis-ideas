// Agente 2: Priorizador — lee issues existentes y crea un reporte de prioridades
// Se invoca desde el workflow prioritize.yml
// Usa GitHub Models (gratuito) — sin API key extra, solo GITHUB_TOKEN

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;

if (!GITHUB_TOKEN || !REPO) {
  console.error("Faltan variables de entorno.");
  process.exit(1);
}

const GITHUB_MODELS_URL = "https://models.inference.ai.azure.com/chat/completions";
const MODEL = "meta-llama-3.1-70b-instruct";

async function obtenerIssuesAbiertos() {
  let pagina = 1;
  const todos = [];

  while (true) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/issues?labels=ai-mejora&state=open&per_page=50&page=${pagina}`,
      { headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json" } }
    );
    const issues = await res.json();
    if (!Array.isArray(issues) || issues.length === 0) break;
    todos.push(...issues.filter(i => !i.pull_request));
    if (issues.length < 50) break;
    pagina++;
  }

  return todos;
}

async function priorizarConModelo(issues) {
  const resumen = issues.map(i => `#${i.number}: ${i.title}\n${i.body?.slice(0, 300) ?? ""}`).join("\n\n---\n\n");

  const res = await fetch(GITHUB_MODELS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: "Sos un arquitecto de software senior especializado en Next.js, TypeScript y Cloudflare Workers. Tu tarea es analizar y priorizar sugerencias de mejora de código.",
        },
        {
          role: "user",
          content: `Analizá estas sugerencias de mejora para una plataforma académica Next.js + Cloudflare Workers y priorizalas.

Criterios de priorización:
1. Impacto en seguridad (lo más importante)
2. Impacto en experiencia del usuario
3. Dificultad de implementación (fácil = antes)
4. Deuda técnica acumulada
5. Valor para el crecimiento futuro

ISSUES ABIERTOS:
${resumen}

Respondé con exactamente este formato:

## 🚨 Implementar esta semana (impacto crítico o fácil de hacer)
- #NNN — Título — Razón en una oración
- #NNN — Título — Razón en una oración

## 📅 Implementar este mes (importantes pero no urgentes)
- #NNN — Título — Razón en una oración
- #NNN — Título — Razón en una oración

## 🔮 Backlog (valiosos pero pueden esperar)
- #NNN — Título — Razón en una oración
- #NNN — Título — Razón en una oración

## ❌ No implementar (complejidad > beneficio o ya resuelto de otra forma)
- #NNN — Título — Razón en una oración

## 📊 Resumen ejecutivo
2-3 oraciones sobre el estado general del código y las áreas de mayor atención.`,
        },
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

async function cerrarReporteAnterior() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues?labels=ai-reporte&state=open&per_page=10`,
    { headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json" } }
  );
  const issues = await res.json();
  for (const issue of (issues ?? [])) {
    await fetch(`https://api.github.com/repos/${REPO}/issues/${issue.number}`, {
      method: "PATCH",
      headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify({ state: "closed" }),
    });
  }
}

async function crearReporte(contenido, totalIssues) {
  const fecha = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const body = `# Reporte de Priorización — ${fecha}

> Análisis automático de ${totalIssues} sugerencias abiertas.
> Este reporte reemplaza al anterior. Las decisiones finales las tomás vos.

${contenido}

---
*Generado por el Agente Priorizador con GitHub Models (Llama 3.1 70B). Para implementar una mejora, asignala y creá un PR.*`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      title: `📊 Reporte de Prioridades — ${new Date().toISOString().slice(0, 10)}`,
      body,
      labels: ["ai-reporte"],
    }),
  });

  const issue = await res.json();
  console.log(`✅ Reporte creado: Issue #${issue.number}`);
}

async function main() {
  console.log("📊 Agente Priorizador iniciando...");

  const issues = await obtenerIssuesAbiertos();
  console.log(`📋 ${issues.length} sugerencias abiertas encontradas`);

  if (issues.length === 0) {
    console.log("No hay sugerencias para priorizar.");
    return;
  }

  const reporte = await priorizarConModelo(issues);
  await cerrarReporteAnterior();
  await crearReporte(reporte, issues.length);

  console.log("✅ Priorización completa.");
}

main().catch(err => { console.error(err); process.exit(1); });
