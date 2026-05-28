# CLAUDE.md — Contexto de sesión para desarrollo asistido por IA

Este archivo es la fuente de verdad para cualquier sesión IA nueva.
Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. Qué es este proyecto

Plataforma académica personal de Raúl Dubón. Publicaciones, recursos, cómics y un asistente de IA sobre ciencias sociales latinoamericanas.

**Stack:**
- Frontend: Next.js 15.5.18 + React 19.1.0 (App Router) desplegado en Vercel
- Base de datos principal: PostgreSQL en Supabase, accedida vía Prisma
- Storage de imágenes: Supabase Storage (bucket `comics`)
- IA: Cloudflare Worker (`workers/sociologia/`) con D1 + KV + Workers AI

**Repositorio:** `rauldubon95-ctrl/publicaciones-mis-ideas`
**Rama de desarrollo activa:** `main` (sin feature branch activa al cierre de sesión 2026-05-25)

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| ✅ Next.js app (publicaciones, admin, métricas) | Producción | En Vercel, rama `main`, commit `95bbb1b`. Next.js 15.5.18 + React 19.1.0 |
| ✅ Cloudflare Worker v3 (FTS5 + SkillRegistry + Sync) | **PRODUCCIÓN** | Desplegado via Git integration. root dir: `workers/sociologia`. Auto-deploy en cada push a `main` que toque esa carpeta. |
| ✅ Skill `sociological-analysis` en chat principal | Producción | Toda consulta con docs usa el prompt estructurado de la skill. Reduce alucinaciones. Admin usa `depth=deep`. |
| ✅ Sistema de premium token (admin sin límite) | Funcionando | HMAC(ADMIN_SECRET, "premium-bypass-v1") — sin KV, sin variables extra |
| ✅ SkillRegistry modular | Producción | `POST /skill` — ruta para análisis estructurado externo |
| ✅ Sync Supabase → D1 (automático) | Producción | Al publicar/despublicar desde admin → `lib/d1Sync.ts` → Worker `/sync` |
| ✅ Sync masivo (todos los artículos) | Producción | Botón en `/admin` → `POST /api/admin/sync-d1-all` |
| ✅ UX Chat: contador + papelera | Producción | Límite 1500 chars, contador rojo al 90%, botón para limpiar conversación |
| ❌ Vectorize (retrieval semántico) | No activo | Binding comentado en `wrangler.toml`. Requiere `wrangler vectorize create` |
| ✅ Agentes IA en GitHub Actions | En main | `review.mjs` y `prioritize.mjs` — GitHub Models (gratis) |
| ❌ Sistema de agentes multi-Worker | Solo documentación | ARQUITECTURA.md §6 es visión futura, no existe código |
| ✅ Fix esScanPath (404 en artículos) | Producción | `startsWith()` — slugs con "eval" ya no dan 404 |
| ✅ Fix auth bypass (POST /api/publicaciones) | Producción | `await verifySessionToken()` corregido |
| ✅ Security hardening — Fase 1 | Producción | PREMIUM_TOKEN eliminado, output validation IA, bot detection, scan paths, sesión 24h, .gitignore |
| ✅ Security hardening — Fase 2 | Producción | IPs hasheadas en EventoSeguridad, magic bytes DOCX, rate limit /api/track |
| ✅ Security hardening — Fase 3 | Producción | RLS en 18 tablas Supabase, políticas mínimas de acceso, función search_path fijo, bucket listing eliminado, IDs Cloudflare removidos de CLAUDE.md |
| ✅ Paginación dinámica home + /publicaciones | Rama feature | 4/página en home (searchParams), 8/página en /publicaciones. Componente `Paginacion.tsx` reutilizable. |
| ✅ Sección Servicios de Consultoría | Rama feature | `/servicios` + modal cotización + APIs CRUD admin + modelos Servicio/SolicitudCotizacion en Supabase |
| ✅ CLAUDE.md memoria institucional | Activo | Este archivo — actualizar en cada sesión |

---

## 3. Variables de entorno requeridas

### Vercel (Next.js)

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) de Supabase | Sí |
| `DIRECT_URL` | PostgreSQL direct connection string de Supabase | Sí |
| `ADMIN_SECRET` | Secreto para sesiones admin. HMAC-SHA256 de cookies, token premium y sync D1 | Sí |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio (ej: `https://...vercel.app`) | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Sí |
| `SUPABASE_URL` | Igual que `NEXT_PUBLIC_SUPABASE_URL` pero server-side | Sí (storage admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (no exponer al cliente) | Sí (storage admin) |
| `PREMIUM_TOKEN` | **ELIMINADO** — removido el 2026-05-24. No reconfigurar. | No |
| `HEALTH_TOKEN` | Token para endpoint `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` — ID en `workers/sociologia/wrangler.toml` |
| `RATE_LIMIT` | KV binding | Namespace `RATE_LIMIT` — ID en `workers/sociologia/wrangler.toml` |
| `AI` | Workers AI binding | Modelo `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | Mismo valor que en Vercel — valida token premium Y autentica `/sync` |

### GitHub Secrets (Actions)

| Secret | Descripción |
|---|---|
| `CF_API_TOKEN` | API token de Cloudflare (con restricción de IP activa — NO funciona desde GitHub Actions) |
| `CF_ACCOUNT_ID` | Account ID de Cloudflare — configurado como GitHub Secret, nunca hardcodear aquí |

**Nota:** El deploy del Worker ya no depende de GitHub Actions. La integración Git de Cloudflare (root: `workers/sociologia`) maneja el auto-deploy al pushear a `main`.

---

## 4. Schema D1 real (producción)

La base de datos Cloudflare D1 se llama `llm_sociolog`. La tabla real es:

```sql
CREATE TABLE documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  slug TEXT,
  texto TEXT NOT NULL,
  tipo TEXT DEFAULT 'articulo',   -- 'articulo' = corpus académico, 'publicacion' = artículos del sitio
  palabras TEXT,
  fuente TEXT
);

CREATE VIRTUAL TABLE documentos_fts USING fts5(
  titulo, texto, palabras,
  content='documentos', content_rowid='id'
);
```

**IMPORTANTE:** Los archivos en `migrations/d1/` describen una arquitectura futura con tablas `documents` y `doc_chunks`. Son incompatibles con la DB en producción. No ejecutar esos scripts contra `llm_sociolog`.

Actualmente hay **804 documentos** del corpus académico (limpiados en sesión 5: de 1,287 → 804, se eliminaron duplicados y documentos mal formateados) + los artículos del sitio sincronizados via `/sync` (con `tipo='publicacion'`). FTS5 reconstruido tras la limpieza.

---

## 5. Mecanismo de token premium (asistente IA)

El flujo actual (Worker v3 en producción):

1. Admin se loguea → cookie `admin_auth` se establece
2. `AsistenteChat.tsx` llama a `/api/asistente/token` **en cada cambio de ruta** (usa `usePathname` como dependencia)
3. Ese endpoint verifica la cookie y computa `HMAC(ADMIN_SECRET, "premium-bypass-v1")`
4. El chat envía ese token en el header `X-Premium-Token`
5. El Worker valida: `HMAC(ADMIN_SECRET, "premium-bypass-v1")` usando Web Crypto API — sin KV

**Si `ADMIN_SECRET` cambia:** actualizar en (a) Vercel env vars, (b) Worker secret en Cloudflare. No hay KV ni PREMIUM_TOKEN que sincronizar.

---

## 6. Cómo crear/ver artículos

Los nuevos artículos se guardan como borrador por defecto (`publicado: false`). Para que sean visibles públicamente ir a Admin → editar el artículo → activar "Visible al público". Al publicar, el artículo se sincroniza automáticamente a D1 para que el asistente pueda leerlo.

---

## 7. Rutas críticas

| Ruta | Propósito |
|---|---|
| `app/api/publicaciones/route.ts` | GET: lista pública. POST: crear artículo (requiere cookie admin) |
| `app/api/admin/publicaciones/` | CRUD admin de artículos + sync D1 automático en PUT |
| `app/api/admin/sync-d1-all/route.ts` | POST: sincroniza TODOS los artículos publicados a D1. Requiere auth. Botón en `/admin`. |
| `app/api/admin/metricas/route.ts` | Dashboard de métricas (requiere auth) |
| `app/api/track/route.ts` | Registro de vistas (llamado desde TrackView) |
| `app/api/asistente/token/route.ts` | Genera token premium HMAC para admin |
| `workers/sociologia/src/index.ts` | Punto de entrada del Worker. Rutas: `/` (chat), `/skill`, `/sync`, `/embed` |
| `workers/sociologia/src/retrieval.ts` | Búsqueda FTS5 + LIKE en D1 |
| `workers/sociologia/src/ratelimit.ts` | Rate limiting en KV + validación premium HMAC |
| `workers/sociologia/src/sync.ts` | Endpoint POST `/sync` — upsert/delete de artículos del sitio en D1 |
| `workers/sociologia/src/skills/registry.ts` | SkillRegistry — registro y ejecución de skills |
| `workers/sociologia/src/skills/sociological-analysis.ts` | Skill principal: prompt estructurado, frameworks, citas, incertidumbre |
| `lib/d1Sync.ts` | Cliente Next.js → Worker sync (HMAC + fetch, fire-and-forget) |
| `app/admin/page.tsx` | Panel admin con botón "Sincronizar artículos" para sync masivo |
| `app/servicios/page.tsx` | Página pública de servicios de consultoría — server component |
| `components/ServiciosConFormulario.tsx` | Grid de tarjetas + modal de cotización — client component |
| `app/api/servicios/route.ts` | GET público: lista servicios activos con cache |
| `app/api/cotizaciones/route.ts` | POST público: enviar solicitud con rate limit + honeypot + sanitización |
| `app/api/admin/servicios/route.ts` | GET/POST admin: listar y crear servicios |
| `app/api/admin/servicios/[id]/route.ts` | GET/PUT/DELETE admin: CRUD individual de servicios |
| `app/api/admin/cotizaciones/route.ts` | GET admin: listar solicitudes con filtro de estado |
| `app/api/admin/cotizaciones/[id]/route.ts` | PATCH/DELETE admin: actualizar estado o eliminar solicitud |
| `app/admin/servicios/page.tsx` | Admin CRUD de servicios (crear/editar/ocultar/eliminar con modal) |
| `app/admin/cotizaciones/page.tsx` | Admin gestión de solicitudes con filtros y cambio de estado |
| `components/Paginacion.tsx` | Componente reutilizable de paginación con elipsis y accesibilidad |

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
Servicio      → SolicitudCotizacion (campos: titulo, slug, descripcion, detalle, categoria, icono, activo, orden)
SolicitudCotizacion → estado: PENDIENTE | REVISADO | ARCHIVADO
```

---

## 9. Workflows de GitHub Actions

| Workflow | Trigger | Propósito | IA utilizada |
|---|---|---|---|
| `deploy-worker.yml` | Push a `main` con cambios en `workers/sociologia/**` | Intenta deploy del Worker (falla por CF_API_TOKEN con restricción de IP) | — |
| `code-review.yml` | PR o cada lunes 8:00 UTC | Revisa código y crea Issues con etiquetas | GitHub Models (Llama 3.1 70B) — **gratis** |
| `prioritize.yml` | Cada lunes 9:00 UTC | Prioriza Issues abiertos, crea reporte semanal | GitHub Models (Llama 3.1 70B) — **gratis** |

**Nota:** El deploy real del Worker lo maneja la integración Git de Cloudflare (auto-deploy). `deploy-worker.yml` es redundante mientras CF_API_TOKEN tenga restricción de IP.

---

## 10. Deuda técnica conocida (no resolver sin revisar aquí primero)

| Item | Detalle | Prioridad |
|---|---|---|
| Más limpieza del corpus D1 | 804 documentos restantes. Aun hay documentos de baja calidad. Continuar en sesiones siguientes con criterios más finos. | **Alta** |
| Revocación de sesiones admin | Tokens HMAC estáticos: `HMAC(ADMIN_SECRET, "admin-session-v1")` produce el mismo token siempre. No hay forma de revocar una sesión sin cambiar `ADMIN_SECRET`. Considerar `jti` + tabla de sesiones activas. | Media |
| CSP con `unsafe-inline` | `next.config.mjs` tiene `script-src 'self' 'unsafe-inline'`. Requiere migrar estilos inline (pdf/page.tsx tiene `<style>` embebido). | Media |
| Vectorize desactivado | `[[vectorize]]` comentado en `wrangler.toml`. Requiere `wrangler vectorize create` + pipeline de embeddings (`embed-worker.ts` ya existe). Sin esto, retrieval es solo FTS5+LIKE. | Media |
| Telemetría en KV (no D1) | `telemetry.ts` escribe en KV. El dashboard de observabilidad planificado requiere D1. | Media |
| CF_API_TOKEN con restricción de IP | GitHub Actions no puede deployar el Worker. Crear nuevo token sin restricción de IP si se quiere restaurar deploy via Actions. Por ahora, Git integration de Cloudflare lo cubre. | Baja |
| `config/prompts/v1.1.txt` desconectado | Worker usa SYSTEM_PROMPT hardcodeado en `prompts.ts`, no este archivo. | Baja |
| ARQUITECTURA.md mezcla producción y visión | §2-§18 describen arquitectura futura, no actual. Confunde a sesiones IA. | Documental |
| Solo 1 skill implementada | `sociological-analysis` es la única skill. La visión contempla múltiples skills especializadas. | Futura |

---

## 11. Reglas para sesiones IA futuras

1. **Worker v3 ESTÁ en producción** — Desplegado via integración Git de Cloudflare (root: `workers/sociologia`). Auto-deploya en cada push a `main` que modifique `workers/sociologia/**`. Verificar con Cloudflare MCP si hay dudas.
2. **La tabla D1 real se llama `documentos`** — no `documents` ni `doc_chunks`. `tipo='articulo'` = corpus académico; `tipo='publicacion'` = artículos del sitio.
3. **No pushear a main sin confirmar con el usuario** — Vercel auto-deploya Y Cloudflare auto-deploya el Worker.
4. **Actualizar este archivo** cuando se agreguen variables de entorno, se cambie la arquitectura, o se complete una fase del roadmap.
5. **ERRORS.md** es el registro histórico de commits — actualizarlo después de cada commit importante.
6. **La rama de desarrollo activa** puede cambiar por sesión. Verificar con `git branch --show-current` al inicio.
7. **No hardcodear secretos en archivos** — usar siempre `${{ secrets.NOMBRE }}` en workflows y `process.env.NOMBRE` en código.
8. **Si `ADMIN_SECRET` cambia**, actualizar en: (a) Vercel env vars, (b) Worker secret en Cloudflare. No hay KV ni PREMIUM_TOKEN que tocar.
9. **El chat usa la skill en TODAS las respuestas con docs** — No llamar al LLM directamente desde `index.ts`. El prompt estructurado de la skill es el único punto de generación.
10. **Next.js 15 — params y cookies son async** — En rutas dinámicas, `params` es `Promise<{...}>` y debe ser `await`eado. `cookies()` también devuelve una `Promise` y debe ser `await`eada. Toda función que recibe `params` o llama a `cookies()` debe ser `async`.

---

## 12. Comandos útiles

```bash
# Verificar estado de la rama
git log --oneline -10
git status

# Verificar que el Worker compila antes de pushear
cd workers/sociologia && npx tsc --noEmit

# Deploy manual del Worker (solo si hay CF_API_TOKEN válido sin restricción de IP)
cd workers/sociologia && npx wrangler deploy

# Ver logs del Worker en tiempo real
cd workers/sociologia && npx wrangler tail
```

---

## 13. Sync de artículos a D1

El sync es automático al publicar/despublicar desde el panel admin. Para sincronizar todos los artículos a la vez (por ejemplo, al deplogar por primera vez o tras cambios masivos):

1. Ir a `/admin` (logueado como admin)
2. Click en **"Sincronizar artículos"** en la sección "Asistente IA — sincronización"
3. Esperar respuesta: `"✓ N de N artículos sincronizados al asistente IA"`

El endpoint es `POST /api/admin/sync-d1-all` — requiere cookie `admin_auth` válida.

---

## 14. Progreso hacia la visión original

La visión en ARQUITECTURA.md planteaba un sistema RAG completo con retrieval semántico, múltiples skills, agentes multi-Worker, y un corpus curado de alta calidad.

| Componente de la visión | Estado | Brecha |
|---|---|---|
| Retrieval FTS5 (keyword) | ✅ En producción | — |
| Retrieval semántico (Vectorize) | ❌ Pendiente | Requiere crear índice + pipeline de embeddings |
| Skill system modular | ✅ En producción | Solo 1 skill. Faltan skills de análisis histórico, político, etc. |
| Skill integrada en chat principal | ✅ En producción | La skill ya reduce alucinaciones en el chat |
| Sync bidireccional con Supabase | ✅ En producción | — |
| Corpus curado de calidad | 🔄 En progreso | 804 docs (limpiado de 1,287). Continuar en próximas sesiones. |
| Multi-agent / orquestación | ❌ Solo docs | Visión a largo plazo |
| Dashboard de observabilidad | ❌ Pendiente | Telemetría existe en KV; dashboard no construido |
| Security hardening | ✅ Completo (fase 1+2+3) | 17 CVEs Next.js corregidos, IPs hasheadas, magic bytes DOCX, rate limit track, PREMIUM_TOKEN eliminado, sesión 24h, RLS 18 tablas Supabase, bucket listing bloqueado |

**Próximo paso recomendado:** Continuar limpieza del corpus D1 (804 docs restantes) y resolver la deuda de revocación de sesiones. Para la sección de servicios: agregar los servicios desde `/admin/servicios`.

---

*Última actualización: 2026-05-28 (sesión 7 — security hardening fase 3: RLS habilitado en 9 tablas + políticas adecuadas, políticas para 6 tablas sin cobertura, función update_actualizado_at con search_path fijo, política de listado de bucket comics eliminada, IDs de Cloudflare removidos de CLAUDE.md, manejo de errores en code-review.yml)*
*Commit activo: (sesión 7 — ver rama `claude/magical-ritchie-FKB4d`)*
*Rama activa: `claude/magical-ritchie-FKB4d`*
