# CLAUDE.md — Contexto de sesión para desarrollo asistido por IA

Este archivo es la fuente de verdad para cualquier sesión IA nueva.
Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. Qué es este proyecto

Plataforma académica personal de Raúl Dubón. Publicaciones, recursos, cómics y un asistente de IA sobre ciencias sociales latinoamericanas.

**Stack:**
- Frontend: Next.js 14.2.29 (App Router) desplegado en Vercel
- Base de datos principal: PostgreSQL en Supabase, accedida vía Prisma
- Storage de imágenes: Supabase Storage (bucket `comics`)
- IA: Cloudflare Worker (`workers/sociologia/`) con D1 + KV + Workers AI

**Repositorio:** `rauldubon95-ctrl/publicaciones-mis-ideas`
**Rama de desarrollo activa:** `main` (feature branch `claude/friendly-curie-Oj91h` — sesión 2026-05-25)

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| ✅ Next.js app (publicaciones, admin, métricas) | Producción | En Vercel, rama `main` |
| ✅ Cloudflare Worker v2 (FTS5, seguridad, telemetría) | **PRODUCCIÓN** | Desplegado el 2026-05-25 via dashboard. FTS5 + HMAC + telemetría activos. |
| ✅ Sistema de premium token (admin sin límite) | Funcionando con Worker v2 | HMAC(ADMIN_SECRET) directo — ya no depende de KV. Ver sección 5. |
| ❌ Vectorize (retrieval semántico) | No activo | Binding comentado en wrangler.toml — requiere crear índice con wrangler |
| ✅ Agentes IA en GitHub Actions | En main | `.github/scripts/review.mjs` y `prioritize.mjs` — usan GitHub Models (gratis) |
| ✅ Sistema de Skills / SkillRegistry | Implementado en Worker v2 | `workers/sociologia/src/skills/` — ruta POST `/skill`, skill `sociological-analysis` activo |
| ❌ Sistema de agentes multi-Worker | Solo documentación | ARQUITECTURA.md §6 es visión futura, no existe código |
| ✅ Fix esScanPath (404 en artículos) | Producción | `startsWith()` — artículos con "eval" en slug ya no dan 404 |
| ✅ Fix auth bypass (POST /api/publicaciones) | Producción | `await verifySessionToken()` corregido |
| ✅ CLAUDE.md memoria institucional | Activo | Este archivo — actualizar en cada sesión |

---

## 3. Variables de entorno requeridas

### Vercel (Next.js)

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) de Supabase | Sí |
| `DIRECT_URL` | PostgreSQL direct connection string de Supabase | Sí |
| `ADMIN_SECRET` | Secreto para sesiones admin. HMAC-SHA256 de cookies | Sí |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio (ej: `https://...vercel.app`) | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Sí |
| `SUPABASE_URL` | Igual que `NEXT_PUBLIC_SUPABASE_URL` pero server-side | Sí (storage admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (no exponer al cliente) | Sí (storage admin) |
| `PREMIUM_TOKEN` | **ELIMINADO** — Fue removido de Vercel el 2026-05-24. No reconfigurar. | No |
| `HEALTH_TOKEN` | Token para endpoint `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` (ID: `ea9cad56-9b03-4af7-b15b-4e923bbc66c7`) |
| `RATE_LIMIT` | KV binding | `RATE_LIMIT` (ID: `2f279c63ddbf45f19aaf55a02d290b47`) |
| `AI` | Workers AI binding | Modelo `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | Mismo valor que en Vercel — valida token premium Y sync D1 |

### GitHub Secrets (Actions)

| Secret | Descripción |
|---|---|
| `CF_API_TOKEN` | API token de Cloudflare para deploy del Worker |
| `CF_ACCOUNT_ID` | Account ID de Cloudflare (`bd4339c839af269af51cdc263cd45588`) |

---

## 4. Schema D1 real (producción)

La base de datos Cloudflare D1 se llama `llm_sociolog`. La tabla real es:

```sql
CREATE TABLE documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  slug TEXT,
  texto TEXT NOT NULL,
  tipo TEXT DEFAULT 'articulo',
  palabras TEXT,
  fuente TEXT
);

CREATE VIRTUAL TABLE documentos_fts USING fts5(
  titulo, texto, palabras,
  content='documentos', content_rowid='id'
);
```

**IMPORTANTE:** Los archivos en `migrations/d1/` describen una arquitectura futura con tablas `documents` y `doc_chunks`. Son incompatibles con la DB en producción. No ejecutar esos scripts contra `llm_sociolog`.

Actualmente hay **1,288 documentos** indexados en producción.

---

## 5. Mecanismo de token premium (asistente IA)

El flujo actual (Worker v1 desplegado + KV sync):

1. Admin se loguea → cookie `admin_auth` se establece
2. `AsistenteChat.tsx` llama a `/api/asistente/token` **en cada cambio de ruta** (usa `usePathname` como dependencia)
3. Ese endpoint verifica la cookie y computa `HMAC(ADMIN_SECRET, "premium-bypass-v1")`
4. El chat envía ese token en el header `X-Premium-Token`
5. El Worker v1 lo compara contra `env.RATE_LIMIT.get("premium_master_token")` en KV

**Estado actual del KV:** `premium_master_token` = `HMAC(ADMIN_SECRET, "premium-bypass-v1")` — sincronizado manualmente el 2026-05-24. Si `ADMIN_SECRET` cambia, hay que actualizar el KV también.

**Worker v2 desplegado (2026-05-25):** El paso 5 ahora usa HMAC directo con `ADMIN_SECRET`. La clave `premium_master_token` en KV ya es obsoleta (se puede eliminar). El `ADMIN_SECRET` debe estar configurado como Worker secret en Cloudflare.

**Bugs resueltos (2026-05-24):**
- **Bug navegación**: `useEffect` solo corría al montar — ahora usa `usePathname` como dependencia
- **Bug KV con comillas**: El valor en KV tenía comillas alrededor (`"b19d..."` en lugar de `b19d...`) — causa raíz del mismatch durante semanas
- **PREMIUM_TOKEN eliminado de Vercel**: Ya no hay variable estática que sincronizar — Vercel computa HMAC automáticamente

---

## 6. Cómo crear/ver artículos (bug conocido)

**Bug:** Los nuevos artículos se guardan como borrador por defecto (`publicado: false`). La página pública `/publicaciones/[slug]` solo muestra artículos con `publicado: true`. Si el artículo no carga, ir a Admin → editar el artículo → activar "Visible al público".

---

## 7. Rutas críticas

| Ruta | Propósito |
|---|---|
| `app/api/publicaciones/route.ts` | GET: lista pública. POST: crear artículo (requiere cookie admin) |
| `app/api/admin/publicaciones/` | CRUD admin de artículos |
| `app/api/admin/metricas/route.ts` | Dashboard de métricas (requiere auth) |
| `app/api/track/route.ts` | Registro de vistas (llamado desde TrackView) |
| `app/api/asistente/token/route.ts` | Genera token premium para admin |
| `workers/sociologia/src/index.ts` | Punto de entrada del Worker de IA |
| `workers/sociologia/src/retrieval.ts` | Búsqueda FTS5 + LIKE en D1 |
| `workers/sociologia/src/ratelimit.ts` | Rate limiting en KV + validación premium |
| `workers/sociologia/src/sync.ts` | Endpoint POST `/sync` — recibe artículos de Next.js y los escribe en D1 |
| `workers/sociologia/src/skills/registry.ts` | SkillRegistry — registro y ejecución de skills |
| `workers/sociologia/src/skills/sociological-analysis.ts` | Skill de análisis sociológico estructurado |
| `lib/d1Sync.ts` | Cliente Next.js → Worker sync (llamado desde admin al publicar/despublicar) |

---

## 8. Prisma schema — modelos principales

```
Publicacion   → VistaPublicacion, DescargaPdf, Comentario, Reaccion
Categoria     → Publicacion (relación)
Etiqueta      → PublicacionEtiqueta → Publicacion
Comic         → VistaComic
Recurso       → VistaRecurso
RateLimitDb   → rate limiting persistente para rutas Next.js
EventoSeguridad → log de eventos de seguridad
```

---

## 9. Workflows de GitHub Actions

| Workflow | Trigger | Propósito | IA utilizada |
|---|---|---|---|
| `deploy-worker.yml` | Push a `main` con cambios en `workers/sociologia/**` | Despliega el Worker a Cloudflare | — |
| `code-review.yml` | PR o cada lunes 8:00 UTC | Revisa código y crea Issues con etiquetas | GitHub Models (Llama 3.1 70B) — **gratis** |
| `prioritize.yml` | Cada lunes 9:00 UTC | Prioriza Issues abiertos, crea reporte semanal | GitHub Models (Llama 3.1 70B) — **gratis** |

**Cómo funcionan los agentes (gratis):**
- Usan `GITHUB_TOKEN` (automático en Actions, sin configuración extra)
- Endpoint: `https://models.inference.ai.azure.com/chat/completions`
- No requieren `ANTHROPIC_API_KEY` ni ninguna API key de pago
- El `GITHUB_TOKEN` sirve para tanto la API de GitHub como GitHub Models

---

## 10. Deuda técnica conocida (no resolver sin revisar aquí primero)

| Item | Detalle | Prioridad |
|---|---|---|
| Vectorize desactivado | `[[vectorize]]` comentado en `wrangler.toml`. Requiere crear índice con `wrangler vectorize create` | Media |
| Sync D1 no retroactivo | `lib/d1Sync.ts` solo sincroniza artículos al publicar/despublicar. Los ya publicados no están en D1. Ver §13 para sync inicial. | Alta |
| Telemetría en KV (no D1) | `telemetry.ts` escribe en KV. El dashboard de observabilidad planificado requiere D1 | Media |
| CSP con `unsafe-inline` | `next.config.mjs` tiene `script-src 'self' 'unsafe-inline'`. Contradice "CSP estricta" | Baja |
| `config/prompts/v1.1.txt` desconectado | El Worker usa SYSTEM_PROMPT hardcodeado en `prompts.ts`, no este archivo | Baja |
| ARQUITECTURA.md mezcla producción y visión | §2-§18 describen arquitectura futura, no actual | Documental |
| Worker no redesplegado | SkillRegistry + sync requieren redeploy del Worker — actualmente solo en git, no en Cloudflare | Alta |

---

## 11. Reglas para sesiones IA futuras

1. **Worker v2 ESTÁ desplegado** — Desplegado el 2026-05-25 via editor del dashboard de Cloudflare. Verificar con `workers_get_worker_code scriptName=sociologia` si hay dudas.
2. **La tabla D1 real se llama `documentos`**, no `documents` ni `doc_chunks`.
3. **No pushear a main sin confirmar con el usuario** — los deploys a Vercel son automáticos. El Worker NO despliega automático por el problema de CF_API_TOKEN.
4. **Actualizar este archivo** cuando se agreguen variables de entorno, se cambie la arquitectura, o se complete una fase del roadmap.
5. **ERRORS.md** es el registro histórico de commits — actualizarlo después de cada commit importante.
6. **La rama de desarrollo activa** puede cambiar por sesión. Verificar con `git branch --show-current` al inicio.
7. **No hardcodear secretos en archivos** — usar siempre `${{ secrets.NOMBRE }}` en workflows y `process.env.NOMBRE` en código.
8. **CF_API_TOKEN en GitHub tiene restricción de IP** — El token existente solo funciona desde la PC del usuario. Para que GitHub Actions despliegue el Worker, el usuario debe crear un nuevo API token de Cloudflare SIN restricción de IP (desmarcar "Client IP Address Filtering" al crearlo) y actualizarlo en GitHub Secrets.
9. **Si ADMIN_SECRET cambia**, actualizar también: (a) KV `premium_master_token` con el nuevo HMAC, (b) Worker secret en Cloudflare, (c) Vercel env var `ADMIN_SECRET`.

---

## 13. Sync inicial de artículos ya publicados a D1

Después de desplegar el Worker con `sync.ts`, hay que sincronizar los artículos ya publicados en Supabase. El mecanismo automático solo aplica a futuros cambios. Para sincronizar los existentes, ejecutar desde la API admin o via script:

```bash
# Ejemplo via curl (requiere cookie de sesión admin):
curl -X PUT /api/admin/publicaciones/{id} -d '{"publicado":true,...}'
# Repetir por cada artículo publicado — o hacer un script de migración.
```

O bien, crear un endpoint temporal `GET /api/admin/sync-d1-all` que itere sobre todas las publicaciones `publicado: true` y llame a `syncPublicacionToD1` para cada una.

**El sync usa:** HMAC(ADMIN_SECRET, "d1-sync-v1") en header `X-Sync-Token`.

---

## 12. Comandos útiles

```bash
# Ver Worker desplegado actualmente
# Usar Cloudflare MCP: workers_get_worker_code scriptName=sociologia

# Verificar estado de la rama
git log --oneline -10
git status

# Deploy manual del Worker (requiere CF_API_TOKEN en entorno)
cd workers/sociologia && npx wrangler deploy

# Ver logs del Worker en tiempo real
cd workers/sociologia && npx wrangler tail
```

---

*Última actualización: 2026-05-25 (sesión 3 — SkillRegistry + sync Supabase→D1 + UX chat)*
*Rama activa: `claude/friendly-curie-Oj91h`*
