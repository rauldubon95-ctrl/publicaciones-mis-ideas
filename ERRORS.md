# REGISTRO DE ERRORES Y CAMBIOS

Archivo de trazabilidad de cambios críticos. Cada entrada tiene fecha, commit hash (cuando disponible), descripción del problema y la solución aplicada.

---

## CONVENCIÓN

- **[FIX]** — Corrección de bug o error de seguridad
- **[FEAT]** — Nueva funcionalidad
- **[REFACTOR]** — Mejora estructural sin cambio de comportamiento
- **[SECURITY]** — Corrección de vulnerabilidad de seguridad
- **[ROLLBACK]** — Si se reversa un cambio, documentar aquí el commit hash al que se volvió

---

## FASE 1 — QUICK WINS

---

### 2026-05-24 — Inicio de refactor arquitectónico

**Estado:** COMPLETADO  
**Rama:** `claude/elegant-bardeen-HHEmr` → mergeada a `main`

---

### [SECURITY] Fail-open en rate limiting

**Archivo:** `lib/security.ts:123`  
**Problema:** Si la base de datos (Supabase) falla durante el check de rate limit, el sistema permite todos los requests (`permitido: true`). Esto significa que un atacante que sature la DB puede saltarse el rate limiting completamente.  
**Riesgo:** ALTO para login. MEDIO para comentarios/reacciones.  
**Solución:** Cambiar comportamiento por tipo de ruta:
- Login → fail-close (403 si DB cae, mejor rechazar que permitir fuerza bruta)
- Comentarios/reacciones → fail-open (UX, no crítico)
- AI queries → fail-close (no servir AI si no podemos contabilizar tokens)  
**Commit:** `9979edd`

---

### [FIX] Bot patterns desincronizados

**Archivos:** `middleware.ts:4-8` vs `lib/security.ts:151-170`  
**Problema:** `middleware.ts` tiene 14 patrones de bot. `lib/security.ts` tiene 17. No están sincronizados. Algunos bots que security.ts bloquea, middleware.ts los deja pasar.  
**Solución:** Centralizar en un solo array en `lib/security.ts`, importar en `middleware.ts`.  
**Commit:** `9979edd`

---

### [FIX] X-Trace-ID faltante

**Archivo:** `middleware.ts`  
**Problema:** No hay correlación de requests. Si hay un error o ataque, no se puede trazar la cadena completa de eventos.  
**Solución:** Agregar `X-Trace-ID` header (UUID v4) en todas las responses del middleware.  
**Commit:** `9979edd`

---

### [FEAT] Cloudflare Worker v2 — Asistente AI Phase 1

**Directorio:** `workers/sociologia/`  
**Problema:** El Worker de IA no existe en este repositorio. No tiene control de versiones. Cualquier cambio es irreversible sin backup manual.  
**Solución:** Crear el Worker completo en este repo con Phase 1 mejoras:
- FTS5 en lugar de LIKE queries
- Document sandboxing
- System prompt v1.1 con grounding enforcement
- Injection detection multi-capa
- Token counting real
- Source citations en respuesta
- Telemetría básica  
**Commit:** `1a08f87`

---

## FASE 2+3 — WORKER REAL + EMBEDDINGS PIPELINE

---

### [FEAT] Worker v2 alineado con infraestructura real de Cloudflare

**Directorio:** `workers/sociologia/src/`  
**Problema:** El Worker v2 (Phase 1) usaba nombres de binding incorrectos (`env.KV` en lugar de `env.RATE_LIMIT`), tabla `doc_chunks` que no existe, y mecanismo de token premium incorrecto.  
**Causa:** Los tipos se diseñaron antes de consultar la infraestructura real de Cloudflare.  
**Solución:** Consultar Cloudflare MCP para obtener los IDs reales, luego corregir:
- `types.ts`: `RATE_LIMIT: KVNamespace` (binding real), `VECTORIZE?: VectorizeIndex` (opcional)
- `retrieval.ts`: Query FTS sobre tabla `documentos` real (no `doc_chunks`)
- `ratelimit.ts`: Lee `premium_master_token` desde KV (igual que v1)
- `wrangler.toml`: IDs reales de D1 `ea9cad56` y KV `2f279c63`  
**Commit:** `3828e1c`

---

### [FEAT] Pipeline de embeddings Phase 3 (Vectorize)

**Archivo:** `workers/sociologia/src/embed-worker.ts`  
**Descripción:** Generador de embeddings batch para poblar Cloudflare Vectorize:
- POST /embed con header `X-Admin-Key` para autenticación
- Procesa en batches de 10 documentos desde D1
- Guarda progreso en KV (`embed_progress`) para reanudabilidad
- Genera embeddings con `@cf/baai/bge-large-en-v1.5` (dimensión 1024)
- Hace upsert a Vectorize con id del documento + título como metadata  
**Estado:** Listo para despliegue. Requiere crear el índice Vectorize primero.  
**Commit:** `3828e1c`

---

## SESIÓN 2026-05-24 — Fix token premium + Worker v2

---

### [FIX] Token premium no funciona después del login (navegación suave)

**Archivo:** `components/AsistenteChat.tsx`
**Problema:** `AsistenteChat` vive en `app/layout.tsx` (layout global). El `useEffect` con `deps: []` llama `/api/asistente/token` solo una vez al montar el componente. Cuando el usuario:
1. Llega al sitio sin sesión → el efecto corre → endpoint devuelve `{token: null}` → `tokenPremium = null`
2. Navega a `/admin/login` → el layout NO se desmonta (misma raíz de layout)
3. Hace login → `router.push("/admin"); router.refresh()` → soft navigation → el componente NO se re-monta
4. `useEffect` nunca vuelve a correr → `tokenPremium` permanece `null`
5. El chat no envía `X-Premium-Token` → el Worker aplica rate limit normal

**Solución:** Agregar `usePathname` de `next/navigation` como dependencia del `useEffect`. Ahora el token se re-verifica en cada cambio de ruta, incluyendo el redirect post-login.
**Commit:** `5514ba1`

---

### [FIX] Causa raíz del mismatch KV: comillas en el valor almacenado

**Fecha:** 2026-05-24 (sesión 2)
**Contexto:** Después de múltiples intentos fallidos de sincronizar PREMIUM_TOKEN con KV, se descubrió que el valor en KV tenía comillas literales alrededor: `"b19d188c..."` en lugar de `b19d188c...`. Worker hace comparación exacta de strings, por lo que nunca coincidía.
**Solución:** Usuario corrigió el valor en KV dashboard. También eliminado PREMIUM_TOKEN de Vercel. Vercel computa el HMAC automáticamente desde ADMIN_SECRET.

---

### [FIX] Validación premium vía HMAC — elimina dependencia de KV

**Archivos:** `app/api/asistente/token/route.ts`, `workers/sociologia/src/ratelimit.ts`, `workers/sociologia/src/types.ts`
**Problema:** El token premium se validaba leyendo `premium_master_token` desde KV. Frágil: cualquier diferencia en whitespace/encoding hacía fallar el premium silenciosamente.
**Solución:** Cambiar a HMAC(ADMIN_SECRET, "premium-bypass-v1"):
- Vercel: `createHmac("sha256", ADMIN_SECRET).update("premium-bypass-v1").digest("hex")`
- Worker: `crypto.subtle.importKey()` + `crypto.subtle.sign()` — mismo cálculo con Web Crypto API
**Commit:** `5514ba1`

---

## SESIÓN 2026-05-25 (sesión 3) — SkillRegistry + Sync Supabase→D1 + UX

---

### [FEAT] SkillRegistry modular en Worker

**Archivos:** `workers/sociologia/src/skills/registry.ts`, `workers/sociologia/src/skills/sociological-analysis.ts`
**Descripción:** Implementación del SkillRegistry que existía solo como documentación (SKILL.md). El registro es modular (`.register(skill)` / `.execute(name, input, env)`). La skill `sociological-analysis` hace retrieval FTS5, llama al LLM con un prompt estructurado que fuerza citas y declara incertidumbre, y devuelve `{ analysis, frameworks_identified, key_concepts, citations, entities, confidence, grounding_ratio, uncertainty_flags }`. Nueva ruta `POST /skill` en el Worker.
**Commit:** `58a8d21`

---

### [FEAT] Sincronización Supabase → D1 (automática)

**Archivos:** `workers/sociologia/src/sync.ts`, `lib/d1Sync.ts`, `app/api/admin/publicaciones/[id]/route.ts`
**Problema:** El Worker de IA solo tenía acceso a los 1,288 documentos del corpus académico en D1, pero no a los artículos del propio sitio (almacenados en Supabase/PostgreSQL).
**Solución:**
- `sync.ts`: Endpoint `POST /sync` en el Worker, autenticado con HMAC(ADMIN_SECRET, "d1-sync-v1"). Hace strip de HTML, UPSERT/DELETE en `documentos` con `tipo='publicacion'`, y rebuild del índice FTS5.
- `lib/d1Sync.ts`: Cliente Next.js server-side que computa el HMAC y llama al Worker. Fallos no-bloqueantes.
- `app/api/admin/publicaciones/[id]/route.ts`: Después de cada `prisma.publicacion.update`, llama a `syncPublicacionToD1` según el estado `publicado`. Fire-and-forget.
**Commit:** `58a8d21`

---

### [FEAT] UX: contador de caracteres + botón "limpiar conversación"

**Archivo:** `components/AsistenteChat.tsx`
**Descripción:**
- Contador de caracteres visible cuando el usuario escribe. Se torna rojo al 90% del límite.
- Botón de papelera en el header del chat (visible cuando hay mensajes). Limpia `mensajes` al hacer click.
**Commit:** `58a8d21`

---

## SESIÓN 2026-05-25 (sesión 4) — Skill en chat principal + sync masivo + Git integration

---

### [FEAT] Skill integrada en flujo principal del chat (anti-alucinación)

**Archivo:** `workers/sociologia/src/index.ts`
**Problema:** El chat usaba un prompt libre en `construirMensajes()` que no forzaba al LLM a citar fuentes ni declarar incertidumbre. El LLM podía alucinaciones aunque hubiera documentos disponibles.
**Solución:** Reemplazar pasos 8-11 (construir prompt → LLM directo → validar → grounding) con `skillRegistry.execute("sociological-analysis", { query, context: docs, depth })`. La skill usa un prompt estructurado que obliga a:
- Solo usar el corpus dado
- Declarar secciones: ANÁLISIS / CONCEPTOS CLAVE / CITAS / INCERTIDUMBRE
- Los `uncertainty_flags` se exponen como `advertencia` visible al usuario
- Admin usa `depth=deep` para respuestas más extensas
**Commit:** `cc398bc`

---

### [FEAT] Límite de caracteres 1500 (era 500)

**Archivos:** `components/AsistenteChat.tsx`, `workers/sociologia/src/index.ts`
**Problema:** El límite de 500 chars era demasiado restrictivo para preguntas académicas con contexto. El textarea y el Worker ahora coinciden en 1500 chars.
**Commit:** `cc398bc`

---

### [FIX] package-lock.json desincronizado (next@14.2.3 vs next@14.2.29)

**Archivo:** `package-lock.json` (raíz)
**Problema:** El lock file del repo tenía `next@14.2.3` mientras que `package.json` exigía `next@14.2.29`. Cloudflare Git integration fallaba al correr `npm ci` desde la raíz del repo.
**Causa raíz:** La Git integration de Cloudflare intentaba instalar desde la raíz (Next.js) en lugar de `workers/sociologia/` (el Worker).
**Solución en dos partes:**
1. Configurar en Cloudflare dashboard: root directory = `workers/sociologia` → resuelve el deploy del Worker
2. Regenerar `package-lock.json` con `npm install --package-lock-only --ignore-scripts` → sincroniza next@14.2.29
**Commit:** `57781c2`

---

### [FEAT] Sync masivo + botón admin

**Archivos:** `app/api/admin/sync-d1-all/route.ts`, `app/admin/page.tsx`
**Descripción:** El sync automático (al publicar/despublicar) solo aplica a cambios futuros. Los artículos ya publicados necesitaban sync inicial.
- Endpoint `POST /api/admin/sync-d1-all`: itera `prisma.publicacion.findMany({ where: { publicado: true } })`, llama a `syncPublicacionToD1` por cada uno. Devuelve `{ total, exitosos, fallidos }`.
- Botón "Sincronizar artículos" en `/admin`: caja visible entre el header y la lista, con estado de carga y mensaje de resultado.
**Commits:** `2a0df77`, `70354be`

---

## SESIÓN 2026-05-25 (sesión 5) — Auditoría de seguridad completa + upgrade Next.js 15

---

### [SECURITY] Auditoría fase 1 — 6 correcciones

**Archivos:** `app/api/asistente/token/route.ts`, `workers/sociologia/src/skills/sociological-analysis.ts`, `lib/security.ts`, `app/api/admin/login/route.ts`, `.gitignore`
**Correcciones:**
1. Eliminado fallback a `PREMIUM_TOKEN` en endpoint de token premium — cerraba ruta de auth alternativa
2. Output validation en skill IA — detecta y bloquea leakage del system prompt
3. 6 patrones headless browser añadidos a `BOT_UA_PATTERNS` (HeadlessChrome, PhantomJS, Selenium, WebDriver, Puppeteer, Playwright)
4. 14 scan paths nuevos (`.git/config`, `/debug`, `/telescope`, `/api/env`, etc.)
5. Sesión admin reducida de 7 días → 24 horas
6. `.gitignore` protege `.mcp.json` y `.claude/settings.local.json`
**Commit:** `7cc31ab`

---

### [SECURITY] Upgrade Next.js 14.2.29 → 15.5.18 + React 19 (17 CVEs HIGH)

**Archivos:** `package.json`, 15 archivos de rutas dinámicas
**Problema:** `next@14.2.29` tenía 18 CVEs HIGH. El upgrade requirió migrar todos los `params` de rutas dinámicas a `Promise<{...}>` (cambio breaking en Next.js 15). `cookies()` también pasó a ser async.
**Archivos migrados:**
- 4 page components: `categorias/[slug]`, `publicaciones/[slug]`, `publicaciones/[slug]/pdf`, `recursos/[slug]`
- 3 admin pages: `admin/editar/[id]`, `admin/recursos/editar/[id]`, `comics/[slug]`
- 8 API routes handlers: publicaciones/[id], comics/[id], comics/[id]/paginas, comics/[id]/presigned-url, comentarios/[id], recursos/[id], recursos/[slug]/descargar, recursos/[slug]/html
- 3 cookies() await: login, logout, admin/publicaciones
**CVEs resueltos:** 17 HIGH. Queda 1 MODERATE en postcss (devDep, sin impacto en producción).
**Commit:** `46ba9ff`

---

### [SECURITY] Auditoría fase 2 — 3 correcciones

**Archivos:** `lib/security.ts`, `app/api/admin/upload-docx/route.ts`, `app/api/track/route.ts`
**Correcciones:**
1. IPs en `EventoSeguridad` ahora se hashean con SHA-256 (Web Crypto API, compatible con Edge Runtime) antes de guardar — privacidad de usuarios sin romper correlación de eventos
2. Magic bytes DOCX: valida firma ZIP (`PK\x03\x04`) antes de procesar con mammoth — previene procesamiento de archivos malformados disfrazados de .docx
3. Rate limit en `/api/track`: 60 req/15min por IP, fail-open para no bloquear tráfico legítimo
**Commit:** `95bbb1b`

---

### [FEAT] Limpieza corpus D1 — de 1,287 a 804 documentos

**Base de datos:** Cloudflare D1 `llm_sociolog`
**Operaciones realizadas:**
- Eliminados duplicados exactos (mismo texto, títulos con sufijos numéricos)
- Eliminados documentos mal formateados, ilegibles o con garbage text
- Eliminados documentos fuera del alcance temático (ciencias sociales latinoamericanas)
- Renombrados 28 títulos confusos/crípticos con nombres descriptivos
- FTS5 (`documentos_fts`) reconstruido tras la limpieza
**Resultado:** 483 documentos eliminados (38% del corpus). 804 restantes + 15 publicaciones del sitio.

---

## HISTORIAL DE COMMITS (se actualiza con cada commit)

| Fecha | Hash | Descripción | Estado |
|---|---|---|---|
| 2026-05-24 | ab4c10d | Add professional AI architecture design | ✅ |
| 2026-05-24 | 380a256 | Add ERRORS.md change tracking | ✅ |
| 2026-05-24 | 9979edd | security: fail-close login, centralize bot patterns, X-Trace-ID | ✅ |
| 2026-05-24 | 1a08f87 | feat: Cloudflare Worker v2 with Phase 1 AI improvements | ✅ |
| 2026-05-24 | 5f750f8 | feat: D1 setup script + legacy chunk migration | ✅ |
| 2026-05-24 | 8f99332 | docs: update ERRORS.md with Phase 1 commit history | ✅ |
| 2026-05-24 | 3828e1c | feat: Worker v2 real bindings + embeddings pipeline | ✅ |
| 2026-05-24 | dd62dab | feat: agregar AsistenteChat con acceso ilimitado para admin | ✅ |
| 2026-05-24 | c3cf746 | docs: reescribir README con arquitectura completa del proyecto | ✅ |
| 2026-05-24 | b6b0842 | feat: Asistente AI v2 — FTS5, seguridad, embeddings y despliegue automático | ✅ |
| 2026-05-24 | 3331fd9 | fix: exclude workers/ from Next.js TypeScript compilation | ✅ |
| 2026-05-24 | e5ad6bc | security: corregir 15 vulnerabilidades (auth bypass, injection, IP spoofing) | ✅ |
| 2026-05-24 | c26f995 | refactor: migrar agentes IA a GitHub Models (Llama 3.1 70B, sin costo) | ✅ |
| 2026-05-24 | f0d138f | fix: token premium via PREMIUM_TOKEN env var (compatible Worker v1) | ✅ |
| 2026-05-24 | d8bdbe7 | feat: CLAUDE.md memoria institucional + fix auth bypass /api/publicaciones | ✅ |
| 2026-05-24 | d7c4670 | fix: esScanPath startsWith() — artículos con "eval" en slug ya no dan 404 | ✅ |
| 2026-05-24 | 5514ba1 | fix: token premium post-login — HMAC + usePathname re-fetch | ✅ |
| 2026-05-24 | 0473151 | fix: embed-worker auth migra a HMAC — elimina dependencia de KV tokens | ✅ |
| 2026-05-24 | 64434b7 | docs: actualizar ERRORS.md con hash de commit 5514ba1 | ✅ |
| 2026-05-24 | 8cb640d | merge: fix token premium + Worker v2 con HMAC (feature branch → main) | ✅ |
| 2026-05-24 | 8d75108 | fix: compatibilidad v1/v2 — PREMIUM_TOKEN primero, HMAC como fallback | ✅ |
| 2026-05-24 | 3ed231a | chore: actualizar compatibility_date del Worker a 2025-09-23 | ✅ |
| 2026-05-24 | 8170347 | chore: forzar redeploy Vercel tras eliminar PREMIUM_TOKEN | ✅ |
| 2026-05-25 | c0a03d1 | chore: trigger Worker v2 deploy (nuevo CF_API_TOKEN) | ✅ |
| 2026-05-25 | 37f9ccc | chore: add .gitignore para build artifacts del Worker | ✅ |
| 2026-05-25 | a3b8332 | fix: remove nodejs_compat — Worker usa solo Web APIs | ✅ |
| 2026-05-25 | aad1718 | docs: Worker v2 desplegado en producción — actualizar CLAUDE.md y ERRORS.md | ✅ |
| 2026-05-25 | 58a8d21 | feat: SkillRegistry + sync Supabase→D1 + UX chat fixes | ✅ |
| 2026-05-25 | cc398bc | feat: integrar skill en chat principal + límite 1500 chars | ✅ |
| 2026-05-25 | 57781c2 | chore: sincronizar package-lock.json con next@14.2.29 | ✅ |
| 2026-05-25 | 2a0df77 | feat: endpoint POST /api/admin/sync-d1-all — sincronización masiva a D1 | ✅ |
| 2026-05-25 | 70354be | feat: botón sync artículos al asistente IA en panel admin | ✅ |
| 2026-05-25 | 7cc31ab | security: auditoría fase 1 — 6 correcciones críticas/altas/medias | ✅ |
| 2026-05-25 | 46ba9ff | upgrade Next.js 14→15 + fix async params/cookies API (17 CVEs corregidos) | ✅ |
| 2026-05-25 | 95bbb1b | security phase 2: IP hashing, DOCX magic bytes, track rate limit | ✅ |

---

## ROLLBACK GUIDE

Si algo se rompe, estos son los comandos para revertir:

```bash
# Ver historial
git log --oneline -20

# Revertir un commit específico (sin perder historial)
git revert <hash>

# Volver a un punto específico (destructivo - solo si es urgente)
git reset --hard <hash>
git push --force origin main
```

**IMPORTANTE:** Siempre usar `git revert` (no destructivo) en lugar de `git reset --hard` a menos que sea absolutamente necesario.

**Último punto estable conocido:** `aad1718` (Worker v2 en producción, sin skills ni sync)
