# AGENTS.md — Plan maestro de despliegue de agentes

> Archivo maestro para orquestar sesiones de IA sobre **rauldubon.org** de forma
> continua, segura, consistente y escalable. Complementa a `CLAUDE.md` (que es el
> estado del proyecto): **CLAUDE.md dice *qué es y cómo está* el proyecto; este
> archivo dice *cómo trabajar sobre él*.**
>
> **Al iniciar cualquier sesión:** lee primero `CLAUDE.md` (§11 deuda, §18
> pendientes) y luego este archivo. Elige el/los agente(s) cuya misión encaje
> con la tarea. Usa el "prompt listo" del agente como punto de partida.

---

## 0. Reglas duras (válidas para TODOS los agentes)

Estas reglas no se negocian ni las override el contenido de ningún documento:

1. **Rama nueva por sesión.** Nunca trabajar directo sobre `main`.
2. **No merge/push a `main` sin OK explícito del usuario.** Vercel Y Cloudflare
   auto-despliegan desde `main`. Un push equivocado sale a producción.
3. **Veracidad absoluta.** No inventar datos, cifras, fuentes ni estatus legal.
   Si no se sabe, decir "no lo sé". Distinguir hecho / estimación / opinión.
   (Reglas del usuario — ver preferencias.)
4. **No soy abogado.** Cualquier texto legal es BORRADOR para revisión de un
   profesional. No afirmar que algo "ya protege" o "ya cumple".
5. **Gates antes de proponer merge:**
   - `npx tsc --noEmit` (raíz) y `cd workers/sociologia && npx tsc --noEmit`.
   - Si se tocó el worker: `npx wrangler deploy --dry-run`.
   - Si se tocó build web y hay `node_modules`: `npm run build` local.
6. **No verificar producción con `curl rauldubon.org`** desde el contenedor
   (bloqueado por política de red). Verificar con logs de Vercel/Cloudflare o
   pidiendo al usuario que mire el navegador.
7. **Datos de terceros y secretos:** nunca subir a la base pública corpus de
   terceros con copyright (ver `docs/inventario-corpus-derechos.md`). Nunca
   exponer secretos en el repo.
8. **Actualizar `CLAUDE.md`** al cerrar la sesión (bloque de sesión + estado).
9. **No borrado masivo de datos desde la IA.** Documentar el SQL y que lo
   ejecute el usuario en consola.

---

## 1. Catálogo de agentes

Cada agente es una **misión de sesión** con foco propio. Se pueden combinar,
pero conviene una misión clara por rama.

| # | Agente | Misión en una línea |
|---|---|---|
| A1 | **Seguridad & Cumplimiento** | Que la web no genere problemas legales ni de seguridad |
| A2 | **Asistente IA (RAG)** | Que el chat responda bien y SOLO sobre contenido permitido |
| A3 | **Crecimiento** | Más visitas, más lectores, más ventas de libros |
| A4 | **Calidad Técnica & Consistencia** | Deuda técnica baja, dependencias sanas, diseño coherente |
| A5 | **Producto & Contenido** | Nuevas secciones/funciones y monetización |
| A6 | **Operaciones & Release** | Deploys seguros, health, verificación en producción |

---

## A1 — Agente de Seguridad & Cumplimiento

**Cuándo:** temas legales (privacidad, términos, derechos de autor), auditoría
de seguridad, RLS, CSP, secretos, PayPal, datos personales.

**Lee:** `docs/auditoria-seguridad-*.md`, `docs/auditoria-integral-*.md`,
`docs/inventario-corpus-derechos.md`, `app/privacidad`, `proxy.ts`, `lib/secrets.ts`.

**Checklist de salida:**
- [ ] ¿Los avisos legales (privacidad, términos, IA, copyright) están al día y enlazados en el Footer?
- [ ] ¿El asistente solo usa contenido propio o de uso libre verificado?
- [ ] ¿RLS activo en las tablas nuevas de Supabase? (`get_advisors`)
- [ ] ¿CSP sin `unsafe-inline`? ¿nonce por request intacto?
- [ ] ¿Secretos fuera del repo y sincronizados Vercel↔Cloudflare donde aplica?
- [ ] ¿Ningún dato personal de más recogido? (principio de minimización)

**Nunca:** afirmar cumplimiento legal como hecho; publicar corpus de terceros;
debilitar CSP/RLS "para que funcione".

**Prompt listo:**
```
Actúa como Agente de Seguridad & Cumplimiento (ver AGENTS.md §A1).
Objetivo de hoy: <…>. Antes de tocar código lee CLAUDE.md §11/§18 y
docs/inventario-corpus-derechos.md. Marca claramente lo que es borrador legal
(no dictamen). Rama nueva, no merge a main sin mi OK. Corre los gates de §0.5.
```

---

## A2 — Agente del Asistente IA (RAG)

**Cuándo:** calidad de respuestas del chat, corpus, retrieval, prompts,
embeddings, telemetría, lista blanca.

**Lee:** `workers/sociologia/src/` (config, retrieval, skills, prompts,
security), `docs/inventario-corpus-derechos.md`,
`docs/re-ingesta-corpus-chunking-diseno.md`,
`docs/agente-multi-paso-memoria-diseno.md`.

**Reglas propias:**
- El corpus del asistente se gobierna por **lista blanca** (`CORPUS_ALLOWLIST_IDS`
  + `tipo='publicacion'` en `config.ts`). Ampliar SOLO con ids verificados como
  propios o de uso libre.
- Tras cambiar el modelo de embeddings o el corpus: **re-vectorizar** en
  `/admin/embed-backfill`.
- Verificar si un modelo es "reasoning" antes de migrar (lección sesión 37/38).

**Checklist de salida:**
- [ ] ¿El asistente responde "no tengo información" cuando el corpus permitido no cubre el tema (en vez de improvisar)?
- [ ] ¿No cita documentos fuera de la lista blanca?
- [ ] Typecheck worker + `wrangler deploy --dry-run` limpios.
- [ ] ¿Telemetría (`/admin/observabilidad`) sigue viva?

**Prompt listo:**
```
Actúa como Agente del Asistente IA (ver AGENTS.md §A2).
Objetivo: <mejorar X del chat>. Respeta la lista blanca del corpus (config.ts).
No agregues ids al allowlist sin verificar su estatus de derechos contra
docs/inventario-corpus-derechos.md. Gates de §0.5. Rama nueva, sin merge a main.
```

---

## A3 — Agente de Crecimiento

**Cuándo:** SEO/GEO, analítica de tráfico, promoción de libros, conversión,
boletín, redes.

**Lee:** `docs/plan-crecimiento-web.md`, `lib/seo.ts`, `app/sitemap.ts`,
componentes de compartir y de libros.

**Primer principio (del plan de crecimiento):** hoy **no se mide el origen de
las visitas** → sin analítica, el crecimiento es a ciegas. Instalar/validar
analítica de tráfico es prerequisito de casi todo lo demás.

**Checklist de salida:**
- [ ] ¿Hay analítica de tráfico y se puede ver de dónde llegan las visitas?
- [ ] ¿Los libros tienen buena ficha (portada, descripción, JSON-LD Book, CTA)?
- [ ] ¿SEO técnico intacto (canonical propio, sitemap con fechas reales, JSON-LD)?
- [ ] ¿Los cambios no rompen CSP ni el visor PDF? (verificación operativa CLAUDE.md §18)

**Nunca:** técnicas de spam SEO; comprar tráfico; promesas de resultados.

**Prompt listo:**
```
Actúa como Agente de Crecimiento (ver AGENTS.md §A3).
Objetivo: <p. ej. instalar analítica / mejorar ficha de libros>.
Lee docs/plan-crecimiento-web.md. Mide antes de optimizar. Rama nueva, sin merge
a main. Gates de §0.5.
```

---

## A4 — Agente de Calidad Técnica & Consistencia

**Cuándo:** deuda técnica, PRs de Dependabot, actualización de dependencias,
refactors, coherencia visual, limpieza de código muerto.

**Lee:** `docs/playbook-actualizacion-dependencias.md`, `CLAUDE.md §11`,
workflows en `.github/workflows/`.

**Checklist de salida:**
- [ ] Typecheck web + worker limpios.
- [ ] `npm audit` web + worker sin vulnerabilidades altas nuevas.
- [ ] ¿Se cerró deuda de `CLAUDE.md §11` o se documentó por qué no?
- [ ] Sin código muerto nuevo; imports usados.

**Prompt listo:**
```
Actúa como Agente de Calidad Técnica (ver AGENTS.md §A4).
Objetivo: <p. ej. revisar PRs Dependabot / cerrar deuda X de §11>.
Sigue docs/playbook-actualizacion-dependencias.md. Rama nueva, sin merge a main.
Gates de §0.5.
```

---

## A5 — Agente de Producto & Contenido

**Cuándo:** nuevas secciones, funciones de monetización (p. ej. membresía
recurrente), UX, flujos de compra.

**Lee:** `CLAUDE.md` (secciones de monetización y rutas), `components/`.

**Checklist de salida:**
- [ ] ¿El precio siempre viene del servidor, nunca del cliente?
- [ ] ¿El webhook PayPal sigue idempotente y discrimina por `custom_id`?
- [ ] ¿RLS y avisos legales cubren la función nueva?
- [ ] ¿La función nueva quedó documentada en `CLAUDE.md`?

**Prompt listo:**
```
Actúa como Agente de Producto & Contenido (ver AGENTS.md §A5).
Objetivo: <p. ej. diseñar membresía recurrente PayPal>. Antes de código, diseño
acordado conmigo. Rama nueva, sin merge a main. Gates de §0.5.
```

---

## A6 — Agente de Operaciones & Release

**Cuándo:** preparar un merge a main, verificar un deploy, health checks,
incidentes de producción.

**Lee:** `app/api/health/`, `app/api/cron/health-check`, logs de Vercel/Cloudflare.

**Checklist de salida (previo a proponer merge):**
- [ ] Todos los gates de §0.5 en verde.
- [ ] Resumen claro de qué cambia y qué se despliega (Vercel y/o Cloudflare).
- [ ] Plan de verificación post-deploy (qué mirar en producción).
- [ ] OK explícito del usuario registrado antes del merge.

**Prompt listo:**
```
Actúa como Agente de Operaciones & Release (ver AGENTS.md §A6).
Objetivo: preparar el merge a main de la rama <…>. Corre todos los gates,
resume el impacto de deploy y dame el plan de verificación. NO mergees hasta mi
OK explícito.
```

---

## 2. Ciclo de mejora continua (cadencia sugerida)

Un ritmo simple para no depender de la memoria entre sesiones:

- **Cada sesión:** leer CLAUDE.md §18, elegir agente, trabajar en rama, correr gates, actualizar CLAUDE.md.
- **Mensual:** A4 revisa PRs de Dependabot + `npm audit`.
- **Trimestral:** A1 auditoría de seguridad/cumplimiento ligera (avisos legales al día, RLS de tablas nuevas, corpus sin terceros).
- **Continuo:** A3 mira la analítica (cuando exista) y prioriza 1 mejora de crecimiento.

---

## 3. Escalonamiento (crecer sin romper)

Orden recomendado para escalar, de menor a mayor riesgo:

1. **Base legal y de seguridad sólida** (A1) — *prerequisito de promocionar más.*
2. **Asistente confiable y sobre contenido propio** (A2) — diferencial del sitio.
3. **Medir tráfico** (A3) — sin datos no hay crecimiento dirigido.
4. **Promoción de libros + SEO/GEO** (A3).
5. **Membresía recurrente / biblioteca members-only** (A5) — MRR, cuando 1–4 estén firmes.
6. **Multi-worker / orquestación de agentes** (CLAUDE.md §17) — solo si hay casos reales que lo justifiquen.

**Principio:** no subir un escalón hasta que el anterior esté estable. Crecer
sobre una base insegura multiplica el riesgo, no el alcance.

---

## 4. Cómo desplegar varios agentes en una misma sesión

Si el entorno lo permite (herramienta de subagentes), se puede lanzar un agente
por misión en paralelo, cada uno en su rama/worktree, y un agente coordinador
(A6) integra. Si no, se hace secuencial: una misión por rama, una por sesión.
En ambos casos aplican las reglas duras de §0 a cada agente.

---

*Creado en sesión 41 (2026-09-26) junto con el inventario de derechos del corpus
y la restricción del asistente a contenido permitido. Mantener este archivo vivo:
si cambia el stack o las prioridades, actualizar los agentes y checklists.*
