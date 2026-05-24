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
**Rama de desarrollo activa:** `claude/elegant-bardeen-HHEmr`

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| Next.js app (publicaciones, admin, métricas) | ✅ Producción | En Vercel, rama `main` |
| Cloudflare Worker v1 (retrieval básico) | ✅ Producción | Worker `sociologia`, LIKE query |
| Cloudflare Worker v2 (FTS5, seguridad, telemetría) | ⚠️ Código listo, NO desplegado | Rama feature sin mergear |
| Sistema de premium token (admin sin límite) | ⚠️ Parcial | Ver sección 5 |
| Vectorize (retrieval semántico) | ❌ No activo | Binding comentado en wrangler.toml |
| Agentes IA en GitHub Actions | ✅ Código listo | Requiere mergear feature branch |
| Sistema de Skills / SkillRegistry | ❌ Solo documentación | SKILL.md existe, sin implementación |
| Sistema de agentes multi-Worker | ❌ Solo documentación | ARQUITECTURA.md §6 es visión futura |

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
| `PREMIUM_TOKEN` | Token estático para bypass de rate limit del admin en el Worker | Sí (asistente IA) |
| `HEALTH_TOKEN` | Token para endpoint `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` (ID: `ea9cad56-9b03-4af7-b15b-4e923bbc66c7`) |
| `RATE_LIMIT` | KV binding | `RATE_LIMIT` (ID: `2f279c63ddbf45f19aaf55a02d290b47`) |
| `AI` | Workers AI binding | Modelo `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | Mismo valor que en Vercel — valida el token premium |

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

El flujo completo para que el admin tenga acceso ilimitado al chat:

1. Admin se loguea → cookie `admin_auth` se establece
2. `AsistenteChat.tsx` llama a `/api/asistente/token`
3. Ese endpoint verifica la cookie y devuelve `process.env.PREMIUM_TOKEN`
4. El chat envía ese token en el header `X-Premium-Token`
5. El Worker lo compara contra `RATE_LIMIT.get("premium_master_token")` en KV

**Para que funcione:** El valor de `PREMIUM_TOKEN` en Vercel debe ser exactamente igual al valor guardado como `premium_master_token` en el KV namespace `RATE_LIMIT` de Cloudflare.

Si el Worker v2 está desplegado (rama mergeada), la validación es diferente: el Worker computa `HMAC(ADMIN_SECRET, "premium-bypass-v1")` y lo compara con el header. En ese caso, `ADMIN_SECRET` en Vercel y en el Worker deben ser iguales.

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

| Workflow | Trigger | Propósito |
|---|---|---|
| `deploy-worker.yml` | Push a `main` con cambios en `workers/sociologia/**` | Despliega el Worker a Cloudflare |
| `code-review.yml` | PR o cada lunes 8:00 UTC | Agente IA revisa código y crea Issues |
| `prioritize.yml` | Cada lunes 9:00 UTC | Agente IA prioriza Issues abiertos |

---

## 10. Deuda técnica conocida (no resolver sin revisar aquí primero)

| Item | Detalle | Prioridad |
|---|---|---|
| Vectorize desactivado | `[[vectorize]]` comentado en `wrangler.toml`. Requiere crear índice con `wrangler vectorize create` | Media |
| Telemetría en KV (no D1) | `telemetry.ts` escribe en KV. El dashboard de observabilidad planificado requiere D1 | Media |
| CSP con `unsafe-inline` | `next.config.mjs` tiene `script-src 'self' 'unsafe-inline'`. Contradice "CSP estricta" | Baja |
| `config/prompts/v1.1.txt` desconectado | El Worker usa SYSTEM_PROMPT hardcodeado en `prompts.ts`, no este archivo | Baja |
| ARQUITECTURA.md mezcla producción y visión | §2-§18 describen arquitectura futura, no actual | Documental |

---

## 11. Reglas para sesiones IA futuras

1. **Nunca asumir que el Worker v2 está desplegado** — verificar con Cloudflare MCP o mirando el código fuente del Worker antes de hacer cambios.
2. **La tabla D1 real se llama `documentos`**, no `documents` ni `doc_chunks`.
3. **No mergear a main sin confirmar con el usuario** — los deploys a Vercel y al Worker son automáticos en push a main.
4. **Actualizar este archivo** cuando se agreguen variables de entorno, se cambie la arquitectura, o se complete una fase del roadmap.
5. **ERRORS.md** es el registro histórico de commits — actualizarlo después de cada commit importante.
6. **La rama de desarrollo activa** puede cambiar por sesión. Verificar con `git branch --show-current` al inicio.
7. **No hardcodear secretos en archivos** — usar siempre `${{ secrets.NOMBRE }}` en workflows y `process.env.NOMBRE` en código.

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

*Última actualización: 2026-05-24*
*Rama: `claude/elegant-bardeen-HHEmr`*
