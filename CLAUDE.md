# CLAUDE.md — Contexto de sesión para desarrollo asistido por IA

Este archivo es la fuente de verdad para cualquier sesión IA nueva.
Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. Qué es este proyecto

Plataforma académica personal de Raúl Dubón. Publicaciones, recursos, cómics y un asistente de IA sobre ciencias sociales latinoamericanas.

**Dominio:** `rauldubon.org` (comprado en Cloudflare — pendiente de conectar a Vercel)
**Marca:** "Raúl Dubón" (reemplazó "Mis Ideas" en sesión 8)

**Stack:**
- Frontend: Next.js 15.5.18 + React 19.1.0 (App Router) desplegado en Vercel
- Base de datos principal: PostgreSQL en Supabase, accedida vía Prisma
- Storage de imágenes: Supabase Storage (bucket `comics`)
- IA: Cloudflare Worker (`workers/sociologia/`) con D1 + KV + Workers AI

**Repositorio:** `rauldubon95-ctrl/publicaciones-mis-ideas`
**Rama de desarrollo activa:** `claude/friendly-planck-Nmy2A` (sesión 11)

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
| ✅ Sistema de suscripción por correo (Resend) | Rama feature sesión 9 | Double Opt-In, cancelación por token, plantillas HTML, rate limit, panel admin `/admin/suscriptores`. Requiere `RESEND_API_KEY` + `FROM_EMAIL` en Vercel. |
| ✅ Centro de Categorías Dinámico | Rama feature sesión 9 | Grid automático en home. Campos `icono`+`imagen` en `Categoria`. OG tags, paginación y sitemap automático en `/categorias/[slug]`. |
| ✅ Admin hardening — Fase 4 | Rama feature sesión 9 | Enlace `/admin` eliminado de `Header.tsx`. Acceso solo vía URL directa `/admin` + middleware HMAC. |
| ✅ Donaciones via PayPal Orders API v2 | Producción sesión 11 | Formulario propio con montos predefinidos. Backend crea orden, PayPal redirige al donante, se captura y registra en DB. `landing_page: NO_PREFERENCE` permite pagar con tarjeta O con cuenta PayPal. |
| ⚠️ Stripe — desactivado (no opera en El Salvador) | Código presente pero sin uso | La cuenta receptora necesita estar en un país soportado por Stripe. El código queda por si se obtiene entidad en país soportado. Las variables de Stripe siguen en Vercel pero no se usan. |
| ✅ Hardening rendimiento — Fase 5 | Producción sesión 11 | Rate limit 30 req/min en `/api/publicaciones`, `/api/servicios`, `/api/dashboard`. Paginación en `/api/publicaciones` (máx. 100). Límite global 200 req/min en Worker IA. |
| ✅ Analítica de audiencia — base preparada | Rama feature sesión 9 | Tabla `EmailEnvio` para tracking. Panel `/admin/suscriptores` con stats: activos, pendientes, crecimiento mensual. |

---

## 3. Variables de entorno requeridas

### Vercel (Next.js)

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) de Supabase | Sí |
| `DIRECT_URL` | PostgreSQL direct connection string de Supabase | Sí |
| `ADMIN_SECRET` | **LEGACY** — fallback si no están las variables separadas (`ADMIN_PASSWORD`, `SESSION_SIGNING_SECRET`, `D1_SYNC_SECRET`). Mantener hasta migrar completamente. | Legacy |
| `ADMIN_PASSWORD` | Contraseña que el humano escribe en `/admin/login`. Puede ser corta y memorable. | Sí (post-sesión 12) |
| `SESSION_SIGNING_SECRET` | Secreto aleatorio largo (≥32 chars) que firma cookies admin y el token premium del asistente IA. Debe coincidir con el secret del Worker. | Sí (post-sesión 12) |
| `D1_SYNC_SECRET` | Secreto aleatorio largo (≥32 chars) que autentica los endpoints `/sync` y `/telemetria` del Worker. Debe coincidir con el secret del Worker. | Sí (post-sesión 12) |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio (ej: `https://...vercel.app`) | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Sí |
| `SUPABASE_URL` | Igual que `NEXT_PUBLIC_SUPABASE_URL` pero server-side | Sí (storage admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (no exponer al cliente) | Sí (storage admin) |
| `PREMIUM_TOKEN` | **ELIMINADO** — removido el 2026-05-24. No reconfigurar. | No |
| `HEALTH_TOKEN` | Token para endpoint `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |
| `RESEND_API_KEY` | API Key de Resend para envío de correos (suscripciones y notificaciones) | Sí (sistema email) |
| `FROM_EMAIL` | Remitente de correos, ej: `Raúl Dubón <noreply@rauldubon.org>` | Sí (sistema email) |
| `ADMIN_EMAIL` | Correo del admin que recibe notificación cuando llega una donación. Default: `raul.dubon95@gmail.com`. | Recomendado |
| `STRIPE_SECRET_KEY` | **ELIMINADO** sesión 12 — código de Stripe borrado del repo. Quitar de Vercel. | No |
| `STRIPE_WEBHOOK_SECRET` | **ELIMINADO** sesión 12 — quitar de Vercel. | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **ELIMINADO** sesión 12 — quitar de Vercel. | No |
| `PAYPAL_CLIENT_ID` | Client ID de la cuenta Business de PayPal (Orders API v2). Server-side únicamente. | Sí (donaciones) |
| `PAYPAL_CLIENT_SECRET` | Secret de la cuenta Business de PayPal. NUNCA con prefijo `NEXT_PUBLIC_`. | Sí (donaciones) |
| `PAYPAL_ENV` | `live` para producción, `sandbox` para pruebas. Si no está definida, usa sandbox por defecto. | Sí (donaciones) |
| `PAYPAL_WEBHOOK_ID` | Webhook ID que da PayPal Dashboard al crear el webhook. Sin esto, el webhook rechaza todos los eventos. | Sí (post-sesión 12) |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` — ID en `workers/sociologia/wrangler.toml` |
| `RATE_LIMIT` | KV binding | Namespace `RATE_LIMIT` — ID en `workers/sociologia/wrangler.toml` |
| `AI` | Workers AI binding | Modelo `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | **LEGACY** — fallback si no están `SESSION_SIGNING_SECRET` y `D1_SYNC_SECRET`. |
| `SESSION_SIGNING_SECRET` | Worker secret | Valida token premium del chat IA y del endpoint `/embed`. Mismo valor que en Vercel. |
| `D1_SYNC_SECRET` | Worker secret | Autentica `/sync` y `/telemetria`. Mismo valor que en Vercel. |

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
| `app/api/subscribe/route.ts` | POST público: registrar suscripción (rate limit + honeypot + doble opt-in) |
| `app/api/subscribe/confirm/route.ts` | GET: confirmar suscripción por token → redirige a `/suscribir/confirmado` |
| `app/api/subscribe/unsubscribe/route.ts` | GET: cancelar suscripción por token → redirige a `/suscribir/cancelado` |
| `app/api/admin/suscriptores/route.ts` | GET admin: stats + lista de suscriptores + crecimiento mensual |
| `app/api/admin/suscriptores/notificar/route.ts` | POST admin: enviar notificación de nueva publicación a suscriptores activos |
| `app/admin/suscriptores/page.tsx` | Panel admin de suscriptores con analítica |
| `components/SubscriptionForm.tsx` | Formulario de suscripción con honeypot y doble confirmación |
| `components/CentroCategoriasGrid.tsx` | Grid dinámico de categorías (automático desde DB) |
| `lib/resend.ts` | Cliente Resend + plantillas HTML de confirmación y nueva publicación |
| `app/donar/page.tsx` | Página pública de donaciones — renderiza `BotonesPayPal` |
| `app/donar/gracias/page.tsx` | Página de confirmación — maneja retorno de PayPal via `?id={donacion_id}`, robots noindex |
| `app/api/donaciones/checkout/route.ts` | POST: construye URL de PayPal con `PAYPAL_DONATION_EMAIL` (rate limit + honeypot). NOTA: este endpoint era para el redirect simple; con el botón hospedado ya no se llama. |
| `app/api/donaciones/webhook/route.ts` | POST: webhook Stripe (código presente, sin uso activo — Stripe desactivado) |
| `app/api/admin/donaciones/route.ts` | GET admin: lista donaciones con filtro de estado + total recaudado |
| `app/admin/donaciones/page.tsx` | Panel admin de donaciones con tabla, filtros y stats |
| `components/BotonesPayPal.tsx` | Client component: carga el SDK de PayPal y renderiza el botón hospedado. Usa `NEXT_PUBLIC_PAYPAL_CLIENT_ID` y `NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID`. |
| `components/FormularioDonacion.tsx` | INACTIVO — era para Stripe. No se usa. No borrar hasta tener PayPal Orders API. |
| `lib/stripe.ts` | Singleton lazy de Stripe (presente, sin uso activo) |

---

## 8. Prisma schema — modelos principales

```
Publicacion   → VistaPublicacion, DescargaPdf, Comentario, Reaccion, EmailEnvio
Categoria     → Publicacion (campos sesión 9: +icono, +imagen)
Etiqueta      → PublicacionEtiqueta → Publicacion
Comic         → VistaComic
Recurso       → VistaRecurso
RateLimitDb   → rate limiting persistente para rutas Next.js
EventoSeguridad → log de eventos de seguridad
Servicio      → SolicitudCotizacion (campos: titulo, slug, descripcion, detalle, categoria, icono, activo, orden)
SolicitudCotizacion → estado: PENDIENTE | REVISADO | ARCHIVADO
Subscription  → (sesión 9) email, nombre, status, token, confirmedAt, unsubscribedAt
EmailEnvio    → (sesión 9) asunto, publicacionId, totalEnviados, totalAbiertos
Donacion      → (sesión 9) monto, moneda, stripeId, estado — arquitectura Stripe preparada
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
| ~~Revocación de sesiones admin~~ | **YA IMPLEMENTADO** — `sesionAdmin` table en Prisma con `jti`, `revocadaAt` y `expiraAt`. Logout hace UPDATE `revocadaAt`. `adminAuth.ts` verifica ambos. CLAUDE.md tenía info desactualizada. | ✅ Resuelto |
| CSP con `unsafe-inline` en script-src | `next.config.mjs` tiene `script-src 'self' 'unsafe-inline'`. Fix requiere nonces via middleware Next.js. `style-src` también tiene unsafe-inline por el `<style>` embebido en `pdf/page.tsx`. | **Alta** |
| `xlsx` vulnerabilidad HIGH sin fix | `app/api/admin/tableros/route.ts` usa `xlsx` (sheetJS). Prototype Pollution + ReDoS. Sin fix disponible en npm. Solo accesible por admin auth. Considerar reemplazar con `exceljs`. | Media |
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
| Security hardening | ✅ Completo (fase 1+2+3+4) | 17 CVEs Next.js, IPs hasheadas, magic bytes DOCX, PREMIUM_TOKEN eliminado, RLS 21 tablas Supabase, enlace `/admin` eliminado del Header público |
| Cambio de marca "Raúl Dubón" | ✅ Aplicado | Header, footer, metadata, PDF, home page. Worker CORS actualizado con rauldubon.org |
| Sistema de suscripción por correo | ✅ Aplicado (sesión 9) | Double Opt-In vía Resend. Ver variables `RESEND_API_KEY` y `FROM_EMAIL`. Ver §FASE 2 configuración DNS. |
| Centro de Categorías Dinámico | ✅ Aplicado (sesión 9) | Grid automático, campos `icono`+`imagen` en Categoria, SEO completo en `/categorias/[slug]` |
| Integración Stripe — Donaciones | ⚠️ Desactivado (sesión 11) | Stripe no opera en El Salvador para cuentas receptoras. Código presente, variables en Vercel, pero sin uso. |
| Integración PayPal — Donaciones | ✅ Activo (sesión 11) | Orders API v2 en producción. Formulario propio ($3/$5/$10/$25), backend crea orden, donante elige cuenta PayPal O tarjeta (`landing_page: NO_PREFERENCE`), se registra en DB. |

**Próximos pasos recomendados:**
1. Agregar íconos/emojis a las categorías desde la DB (campo `icono` en tabla `Categoria`)
2. Implementar nonces en CSP para eliminar `script-src 'unsafe-inline'`
3. Notificación por correo al admin cuando llega una nueva donación

**Deuda de seguridad activa:** CSP `script-src 'unsafe-inline'` (ver auditoría sesión 8). `xlsx` reemplazado por `exceljs` (sesión 9).

---

*Última actualización: 2026-05-31 (sesión 11 — PayPal Orders API v2 operativo, landing_page corregido)*
*Commit activo: `7910b73` (main — PayPal Orders API v2 con tarjeta y cuenta PayPal)*
*Rama activa: `claude/friendly-planck-Nmy2A`*

## 15. Estado de donaciones (sesión 11)

### Por qué se abandonó Stripe
Stripe no permite cuentas receptoras en El Salvador. El código de Stripe (checkout, webhook, admin) sigue presente en el repo pero sin uso activo. Las variables `STRIPE_*` siguen en Vercel pero no se llaman.

### Sistema actual: PayPal Orders API v2 ✅ OPERATIVO
- Formulario propio en `/donar` con montos $3/$5/$10/$25 (componente `FormularioDonacion.tsx`)
- Backend en `app/api/donaciones/checkout/route.ts` crea la orden vía `lib/paypal.ts`
- `landing_page: "NO_PREFERENCE"` — el donante puede elegir cuenta PayPal O tarjeta de crédito/débito
- Al completar, PayPal redirige a `/donar/gracias?donacion_id=...&token=...`
- El backend captura el pago y actualiza la `Donacion` a estado `COMPLETADO`
- Las donaciones aparecen en `/admin/donaciones` automáticamente

### Variables en Vercel (configuradas ✅)
- `PAYPAL_CLIENT_ID` — Client ID de la cuenta Business (server-side)
- `PAYPAL_CLIENT_SECRET` — Secret de la cuenta Business (server-side, NUNCA con NEXT_PUBLIC_)
- `PAYPAL_ENV=live` — apunta al servidor de producción real de PayPal

### Variables eliminadas de Vercel
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — eliminada (era del botón hospedado)
- `NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID` — eliminada (era del botón hospedado)
- `PAYPAL_DONATION_EMAIL` — eliminada (ya no se usa)

### IMPORTANTE: credenciales Live vs Sandbox
- Las credenciales en Vercel deben ser de la pestaña **"Live"** en developer.paypal.com
- Si se ponen credenciales Sandbox con `PAYPAL_ENV=live`, la autenticación falla con error 401
- Si se necesita probar sin dinero real: usar credenciales Sandbox + `PAYPAL_ENV=sandbox`

## 16. Hardening de rendimiento (sesión 11)
- Rate limit 30 req/min por IP en: `/api/publicaciones`, `/api/servicios`, `/api/dashboard`
- Paginación en `/api/publicaciones`: parámetros `?limit=` (máx 100) y `?page=`
- Worker IA: límite global 200 req/min via KV (`checkGlobalRateLimit` en `ratelimit.ts`)
- CSP actualizado para permitir PayPal: `script-src`, `frame-src`, `connect-src`, `img-src`
- `Permissions-Policy`: `payment` ahora permite `https://www.paypal.com`
