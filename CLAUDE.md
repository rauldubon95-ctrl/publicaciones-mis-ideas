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
**Rama de desarrollo activa:** `claude/kind-ptolemy-6ewhS` (sesión 13)

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| ✅ Next.js app (publicaciones, admin, métricas) | Producción | En Vercel, rama `main`, commit `74cf3c9`. Next.js 15.5.18 + React 19.1.0 |
| ✅ Cloudflare Worker v3 (FTS5 + SkillRegistry + Sync) | **PRODUCCIÓN** | Desplegado via Git integration. root dir: `workers/sociologia`. Auto-deploy en cada push a `main` que toque esa carpeta. |
| ✅ Skills: sociological, historical, political analysis | Producción | 3 skills activas en `workers/sociologia/src/skills/`. Toda consulta con docs usa prompt estructurado. |
| ✅ Sistema de premium token (admin sin límite) | Funcionando | HMAC(SESSION_SIGNING_SECRET \|\| ADMIN_SECRET, "premium-bypass-v1") — sin KV |
| ✅ SkillRegistry modular | Producción | `POST /skill` — ruta para análisis estructurado externo |
| ✅ Sync Supabase → D1 (automático) | Producción | Al publicar/despublicar desde admin → `lib/d1Sync.ts` → Worker `/sync` |
| ✅ Sync masivo (todos los artículos) | Producción | Botón en `/admin` → `POST /api/admin/sync-d1-all` |
| ✅ UX Chat: contador + papelera | Producción | Límite 1500 chars, contador rojo al 90%, botón para limpiar conversación |
| ❌ Vectorize (retrieval semántico) | No activo | Binding comentado en `wrangler.toml`. Requiere `wrangler vectorize create` |
| ✅ Agentes IA en GitHub Actions | En main | `review.mjs` y `prioritize.mjs` — GitHub Models (gratis) |
| ✅ Security hardening — Fase 1–4 | Producción | RLS 21 tablas Supabase, IPs hasheadas, magic bytes DOCX, PREMIUM_TOKEN eliminado, enlace /admin oculto del Header |
| ✅ Secretos separados — Hardening Fase 5 | Producción sesión 12 | `ADMIN_SECRET` dividido en `ADMIN_PASSWORD` + `SESSION_SIGNING_SECRET` + `D1_SYNC_SECRET`. `lib/secrets.ts` centraliza con fallback. |
| ✅ Stripe — eliminado del codebase | Sesión 12 | Código de Stripe borrado del repo. Variables `STRIPE_*` se pueden quitar de Vercel. |
| ✅ PayPal webhook con firma criptográfica | Producción sesión 12 | `verificarFirmaWebhookPayPal()` en `lib/paypal.ts`. `PAYPAL_WEBHOOK_ID` configurado en Vercel. Idempotencia via `WebhookEventoProcesado`. |
| ✅ Notificación por correo al admin — donaciones | Producción sesión 12 | Resend envía correo a `ADMIN_EMAIL` al capturar cada donación. |
| ✅ Monetización de contenido premium | Producción sesión 12 | Artículos de pago: muro de pago, compra via PayPal, magic link por correo, cookie de acceso 1 año. Panel `/admin/compras`. |
| ✅ Paginación dinámica home + /publicaciones | Producción | 4/página en home (searchParams), 8/página en /publicaciones. Componente `Paginacion.tsx` reutilizable. |
| ✅ Sección Servicios de Consultoría | Producción | `/servicios` + modal cotización + APIs CRUD admin + modelos Servicio/SolicitudCotizacion en Supabase |
| ✅ Sistema de suscripción por correo (Resend) | Producción sesión 9 | Double Opt-In, cancelación por token, plantillas HTML, rate limit, panel admin `/admin/suscriptores`. |
| ✅ Centro de Categorías Dinámico | Producción sesión 9 | Grid automático en home. Campos `icono`+`imagen` en `Categoria`. OG tags, paginación y sitemap. |
| ✅ Donaciones via PayPal Orders API v2 | Producción sesión 11 | Formulario propio con montos predefinidos. `landing_page: BILLING`, `locale: es_MX`. Webhook con firma. |
| ✅ Hardening rendimiento — Fase 6 | Producción sesión 11 | Rate limit 30 req/min en `/api/publicaciones`, `/api/servicios`, `/api/dashboard`. Paginación. Límite global 200 req/min Worker IA. |
| ✅ CLAUDE.md memoria institucional | Activo | Este archivo — actualizar en cada sesión |

---

## 3. Variables de entorno requeridas

### Vercel (Next.js)

| Variable | Descripción | Requerida |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) de Supabase | Sí |
| `DIRECT_URL` | PostgreSQL direct connection string de Supabase | Sí |
| `ADMIN_SECRET` | **LEGACY** — fallback si no están las variables separadas. Mantener hasta migrar completamente. | Legacy |
| `ADMIN_PASSWORD` | Contraseña que el humano escribe en `/admin/login`. | Sí (post-sesión 12) |
| `SESSION_SIGNING_SECRET` | Secreto largo (≥32 chars) que firma cookies admin y el token premium del asistente IA. Debe coincidir con el secret del Worker. | Sí (post-sesión 12) |
| `D1_SYNC_SECRET` | Secreto largo (≥32 chars) que autentica `/sync` y `/telemetria` del Worker. Debe coincidir con el secret del Worker. | Sí (post-sesión 12) |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio (ej: `https://...vercel.app`) | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase | Sí |
| `SUPABASE_URL` | Igual que `NEXT_PUBLIC_SUPABASE_URL` pero server-side | Sí (storage admin) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (no exponer al cliente) | Sí (storage admin) |
| `HEALTH_TOKEN` | Token para endpoint `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |
| `RESEND_API_KEY` | API Key de Resend para envío de correos (suscripciones, notificaciones, magic links) | Sí |
| `FROM_EMAIL` | Remitente de correos, ej: `Raúl Dubón <noreply@rauldubon.org>` | Sí |
| `ADMIN_EMAIL` | Correo del admin que recibe notificación de donaciones y compras. Default: `raul.dubon95@gmail.com`. | Recomendado |
| `PAYPAL_CLIENT_ID` | Client ID de la cuenta Business de PayPal (Orders API v2). Server-side únicamente. | Sí |
| `PAYPAL_CLIENT_SECRET` | Secret de la cuenta Business de PayPal. NUNCA con prefijo `NEXT_PUBLIC_`. | Sí |
| `PAYPAL_ENV` | `live` para producción, `sandbox` para pruebas. | Sí |
| `PAYPAL_WEBHOOK_ID` | Webhook ID de PayPal Dashboard. Sin esto, el webhook rechaza todos los eventos. | Sí |
| `PREMIUM_TOKEN` | **ELIMINADO** — removido el 2026-05-24. No reconfigurar. | No |
| `STRIPE_SECRET_KEY` | **ELIMINADO** sesión 12 — código de Stripe borrado del repo. Quitar de Vercel. | No |
| `STRIPE_WEBHOOK_SECRET` | **ELIMINADO** sesión 12 — quitar de Vercel. | No |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **ELIMINADO** sesión 12 — quitar de Vercel. | No |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` — ID en `workers/sociologia/wrangler.toml` |
| `RATE_LIMIT` | KV binding | Namespace `RATE_LIMIT` — ID en `workers/sociologia/wrangler.toml` |
| `AI` | Workers AI binding | Modelo `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | **LEGACY** — fallback si no están `SESSION_SIGNING_SECRET` y `D1_SYNC_SECRET`. |
| `SESSION_SIGNING_SECRET` | Worker secret | Valida token premium del chat IA. **Mismo valor que en Vercel.** |
| `D1_SYNC_SECRET` | Worker secret | Autentica `/sync` y `/telemetria`. **Mismo valor que en Vercel.** |

**CRÍTICO:** Si `D1_SYNC_SECRET` está en Vercel pero NO en el Worker, la telemetría de IA falla con 401. Los tres secrets deben coincidir en ambos lados.

### GitHub Secrets (Actions)

| Secret | Descripción |
|---|---|
| `CF_API_TOKEN` | API token de Cloudflare (con restricción de IP activa — NO funciona desde GitHub Actions) |
| `CF_ACCOUNT_ID` | Account ID de Cloudflare — configurado como GitHub Secret, nunca hardcodear aquí |

**Nota:** El deploy del Worker lo maneja la integración Git de Cloudflare (auto-deploy). `deploy-worker.yml` es redundante mientras CF_API_TOKEN tenga restricción de IP.

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

Actualmente hay **804 documentos** del corpus académico + los artículos del sitio sincronizados via `/sync` (con `tipo='publicacion'`).

---

## 5. Mecanismo de token premium (asistente IA)

El flujo actual (Worker v3 en producción):

1. Admin se loguea → cookie `admin_auth` se establece
2. `AsistenteChat.tsx` llama a `/api/asistente/token` en cada cambio de ruta
3. Ese endpoint verifica la cookie y computa `HMAC(SESSION_SIGNING_SECRET || ADMIN_SECRET, "premium-bypass-v1")`
4. El chat envía ese token en el header `X-Premium-Token`
5. El Worker valida con el mismo HMAC usando `env.SESSION_SIGNING_SECRET ?? env.ADMIN_SECRET`

**Si los secrets cambian:** actualizar en (a) Vercel env vars, (b) Worker secrets en Cloudflare dashboard. Ambos lados deben tener el mismo valor.

---

## 6. Cómo crear/ver artículos

Los nuevos artículos se guardan como borrador por defecto (`publicado: false`). Para que sean visibles públicamente ir a Admin → editar el artículo → activar "Visible al público". Al publicar, el artículo se sincroniza automáticamente a D1.

**Artículos premium:** activar el toggle "Artículo de pago (premium)" en el editor, configurar precio en USD (mínimo $1.00) y opcionalmente un resumen público. El admin siempre ve el contenido completo (aparece una barra azul informativa). Los visitantes ven el resumen y el muro de pago.

---

## 7. Rutas críticas

| Ruta | Propósito |
|---|---|
| `app/api/publicaciones/route.ts` | GET: lista pública. POST: crear artículo (requiere cookie admin) |
| `app/api/admin/publicaciones/[id]/route.ts` | PUT/DELETE admin de artículos + sync D1 automático |
| `app/api/admin/sync-d1-all/route.ts` | POST: sincroniza TODOS los artículos publicados a D1 |
| `app/api/admin/metricas/route.ts` | Dashboard de métricas (requiere auth) |
| `app/api/track/route.ts` | Registro de vistas (llamado desde TrackView) |
| `app/api/asistente/token/route.ts` | Genera token premium HMAC para admin |
| `app/api/comprar/route.ts` | POST público: inicia compra de artículo premium → crea PedidoContenido + orden PayPal |
| `app/comprar/exito/page.tsx` | Página de retorno de PayPal tras pago → captura orden, setea cookie, muestra confirmación |
| `app/leer/[token]/page.tsx` | Magic link: valida tokenAcceso → setea cookie → redirige al artículo |
| `app/api/donaciones/webhook/route.ts` | POST: webhook PayPal con verificación de firma. Discrimina donaciones vs compras de contenido. Idempotente via WebhookEventoProcesado. |
| `app/api/admin/compras/route.ts` | GET admin: lista PedidoContenido con filtros + total recaudado |
| `app/admin/compras/page.tsx` | Panel admin de compras de contenido premium |
| `app/admin/observabilidad/page.tsx` | Telemetría del asistente IA (llama a `/api/admin/telemetria`) |
| `app/api/admin/telemetria/route.ts` | Proxy autenticado → Worker `/telemetria` usando D1_SYNC_SECRET |
| `workers/sociologia/src/index.ts` | Punto de entrada del Worker. Rutas: `/` (chat), `/skill`, `/sync`, `/embed`, `/telemetria` |
| `workers/sociologia/src/retrieval.ts` | Búsqueda FTS5 + LIKE en D1 |
| `workers/sociologia/src/ratelimit.ts` | Rate limiting en KV + validación premium HMAC |
| `workers/sociologia/src/sync.ts` | Endpoint POST `/sync` — upsert/delete de artículos del sitio en D1 |
| `workers/sociologia/src/skills/registry.ts` | SkillRegistry — registro y ejecución de skills |
| `workers/sociologia/src/telemetry.ts` | Telemetría en KV + endpoint GET `/telemetria` |
| `lib/d1Sync.ts` | Cliente Next.js → Worker sync (HMAC + fetch, fire-and-forget) |
| `lib/secrets.ts` | Centraliza acceso a secretos con fallback a ADMIN_SECRET |
| `lib/accesoContenido.ts` | Verifica/setea cookie de acceso a artículo premium (httpOnly, 1 año) |
| `lib/paypal.ts` | Cliente PayPal: crear orden, capturar, verificar firma webhook |
| `lib/resend.ts` | Cliente Resend + plantillas HTML: confirmación, notificación publicación, notificación donación, magic link acceso premium |
| `components/MuroPago.tsx` | Muro de pago: muestra precio, formulario email/nombre, llama `/api/comprar`, redirige a PayPal |
| `app/admin/page.tsx` | Panel admin principal |
| `app/servicios/page.tsx` | Página pública de servicios de consultoría |
| `app/api/subscribe/route.ts` | POST público: registrar suscripción (rate limit + honeypot + doble opt-in) |
| `app/api/admin/suscriptores/route.ts` | GET admin: stats + lista de suscriptores |
| `app/admin/suscriptores/page.tsx` | Panel admin de suscriptores con analítica |
| `app/donar/page.tsx` | Página pública de donaciones |
| `app/donar/gracias/page.tsx` | Confirmación de donación — captura orden PayPal, robots noindex |
| `app/api/admin/donaciones/route.ts` | GET admin: lista donaciones con filtro + total recaudado |
| `app/admin/donaciones/page.tsx` | Panel admin de donaciones |

---

## 8. Prisma schema — modelos principales

```
Publicacion   → VistaPublicacion, DescargaPdf, Comentario, Reaccion, EmailEnvio, PedidoContenido
               campos premium: esPremium Boolean @default(false), precioCentavos Int?, resumenPublico String?
Categoria     → Publicacion (campos: +icono, +imagen)
Etiqueta      → PublicacionEtiqueta → Publicacion
Comic         → VistaComic
Recurso       → VistaRecurso
RateLimitDb   → rate limiting persistente para rutas Next.js
EventoSeguridad → log de eventos de seguridad
Servicio      → SolicitudCotizacion
SolicitudCotizacion → estado: PENDIENTE | REVISADO | ARCHIVADO
Subscription  → email, nombre, status, token, confirmedAt, unsubscribedAt
EmailEnvio    → asunto, publicacionId, totalEnviados, totalAbiertos
Donacion      → monto, moneda, paypalOrderId, estado (PENDIENTE/COMPLETADO/FALLIDO/CANCELADO)
PedidoContenido → publicacionId, emailComprador, nombreComprador, montoCentavos, moneda,
                  paypalOrderId (unique), estado, tokenAcceso (unique, cuid), ipHash,
                  creadoAt, completadoAt, ultimoAccesoAt
WebhookEventoProcesado → eventId (PK), proveedor, tipoEvento, procesadoAt — idempotencia de webhooks
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
| Más limpieza del corpus D1 | 804 documentos restantes. Aún hay documentos de baja calidad. | **Alta** |
| CSP con `unsafe-inline` en script-src | `next.config.mjs` tiene `script-src 'self' 'unsafe-inline'`. Fix requiere nonces via middleware Next.js. | **Alta** |
| `xlsx` vulnerabilidad HIGH sin fix | `app/api/admin/tableros/route.ts` usa `xlsx` (sheetJS). Prototype Pollution + ReDoS. Solo accesible por admin auth. Considerar reemplazar con `exceljs`. | Media |
| Vectorize desactivado | `[[vectorize]]` comentado en `wrangler.toml`. Requiere `wrangler vectorize create` + pipeline de embeddings. Sin esto, retrieval es solo FTS5+LIKE. | Media |
| Telemetría en KV (no D1) | `telemetry.ts` escribe en KV. Los datos solo duran 7 días. Un dashboard persistente requeriría D1. | Media |
| CF_API_TOKEN con restricción de IP | GitHub Actions no puede deployar el Worker. Crear nuevo token sin restricción de IP si se quiere restaurar deploy via Actions. | Baja |
| `config/prompts/v1.1.txt` desconectado | Worker usa SYSTEM_PROMPT hardcodeado en `prompts.ts`, no este archivo. | Baja |
| ARQUITECTURA.md mezcla producción y visión | §2-§18 describen arquitectura futura, no actual. Confunde a sesiones IA. | Documental |
| FormularioDonacion.tsx inactivo | Era para Stripe. Código presente pero no se usa. Se puede borrar en sesión futura. | Baja |

---

## 11. Reglas para sesiones IA futuras

1. **Worker v3 ESTÁ en producción** — Auto-deploya en cada push a `main` que modifique `workers/sociologia/**`.
2. **La tabla D1 real se llama `documentos`** — no `documents` ni `doc_chunks`. `tipo='articulo'` = corpus académico; `tipo='publicacion'` = artículos del sitio.
3. **No pushear a main sin confirmar con el usuario** — Vercel auto-deploya Y Cloudflare auto-deploya el Worker.
4. **Actualizar este archivo** cuando se agreguen variables de entorno, se cambie la arquitectura, o se complete una fase del roadmap.
5. **La rama de desarrollo activa** puede cambiar por sesión. Verificar con `git branch --show-current` al inicio.
6. **No hardcodear secretos en archivos** — usar siempre `${{ secrets.NOMBRE }}` en workflows y `process.env.NOMBRE` en código.
7. **SESSION_SIGNING_SECRET y D1_SYNC_SECRET deben coincidir en Vercel Y en el Worker.** Si solo se actualizan en uno, la telemetría y el token premium fallan.
8. **El admin siempre ve el contenido completo de artículos premium** (por diseño). Una barra azul informativa lo indica. Para probar el muro de pago, usar ventana de incógnito.
9. **El chat usa la skill en TODAS las respuestas con docs** — No llamar al LLM directamente desde `index.ts`. El prompt estructurado de la skill es el único punto de generación.
10. **Next.js 15 — params y cookies son async** — `params` es `Promise<{...}>` y debe ser `await`eado. `cookies()` también devuelve `Promise`. Toda función que los use debe ser `async`.
11. **Webhook PayPal es idempotente** — usa `WebhookEventoProcesado` para no procesar el mismo evento dos veces. Siempre verificar `verificarFirmaWebhookPayPal()` antes de procesar.
12. **El precio de artículos premium siempre viene del servidor** — nunca del cliente. `app/api/comprar/route.ts` lo lee de la DB.

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

El sync es automático al publicar/despublicar desde el panel admin. Para sincronizar todos los artículos a la vez:

1. Ir a `/admin` (logueado como admin)
2. Click en **"Sincronizar artículos"** en la sección "Asistente IA — sincronización"
3. Esperar respuesta: `"✓ N de N artículos sincronizados al asistente IA"`

El endpoint es `POST /api/admin/sync-d1-all` — requiere cookie `admin_auth` válida.

---

## 14. Progreso hacia la visión original

| Componente de la visión | Estado | Brecha |
|---|---|---|
| Retrieval FTS5 (keyword) | ✅ En producción | — |
| Retrieval semántico (Vectorize) | ❌ Pendiente | Requiere crear índice + pipeline de embeddings |
| Skill system modular | ✅ En producción | 3 skills activas (sociológica, histórica, política) |
| Skill integrada en chat principal | ✅ En producción | Reduce alucinaciones. Admin usa `depth=deep`. |
| Sync bidireccional con Supabase | ✅ En producción | — |
| Corpus curado de calidad | 🔄 En progreso | 804 docs (limpiado de 1,287). Continuar en próximas sesiones. |
| Multi-agent / orquestación | ❌ Solo docs | Visión a largo plazo |
| Dashboard de observabilidad | ✅ Funcional | `/admin/observabilidad`. Datos en KV, 7 días de historial. |
| Security hardening | ✅ Completo (fases 1–5) | RLS 21 tablas Supabase, secretos separados, webhook firmado, PREMIUM_TOKEN eliminado |
| Cambio de marca "Raúl Dubón" | ✅ Aplicado | Header, footer, metadata, PDF, home page, Worker CORS |
| Sistema de suscripción por correo | ✅ Producción (sesión 9) | Double Opt-In vía Resend |
| Centro de Categorías Dinámico | ✅ Producción (sesión 9) | Grid automático, SEO completo en `/categorias/[slug]` |
| Donaciones PayPal | ✅ Producción (sesión 11–12) | Orders API v2, webhook con firma, notificación al admin por correo |
| Monetización de contenido | ✅ Producción (sesión 12) | Artículos de pago, muro de pago, magic link, panel `/admin/compras` |
| Notificación admin por donación | ✅ Producción (sesión 12) | Correo vía Resend al capturar cada pago |

**Próximos pasos recomendados:**
1. Agregar íconos/emojis a las categorías desde la DB (campo `icono` en tabla `Categoria`)
2. Implementar nonces en CSP para eliminar `script-src 'unsafe-inline'`
3. Limpiar `FormularioDonacion.tsx` (inactivo, era para Stripe)

**Deuda de seguridad activa:** CSP `script-src 'unsafe-inline'` (ver auditoría sesión 8).

---

*Última actualización: 2026-06-01 (sesión 13 — fixes PayPal locale es_MX, aviso premium admin, telemetría secrets)*
*Commit activo en main: `74cf3c9`*
*Rama activa: `claude/kind-ptolemy-6ewhS`*

---

## 15. Sistema de monetización de contenido premium (sesión 12)

### Flujo completo de compra

1. Visitante llega a artículo premium → ve resumen público (o primeros 800 chars) + muro de pago (`MuroPago.tsx`)
2. Ingresa email + nombre → `POST /api/comprar` crea `PedidoContenido` PENDIENTE + orden PayPal con `custom_id="contenido:<pedidoId>"`
3. Redirige a PayPal (`approvalUrl`) → visitante paga
4. PayPal redirige a `/comprar/exito?pedido_id=...&token=<paypalOrderId>` → captura la orden, marca COMPLETADO, setea cookie `acc_<publicacionId[:16]>`
5. En paralelo, el webhook PayPal procesa `CHECKOUT.ORDER.APPROVED` → verifica firma → marca COMPLETADO (idempotente) → envía magic link por correo (`/leer/<tokenAcceso>`)
6. Magic link → `setearCookieAcceso()` → redirige al artículo completo

### Verificación de acceso
- `tieneAccesoComprado(publicacionId)` en `lib/accesoContenido.ts`
- Lee cookie `acc_<publicacionId[:16]>` → busca `PedidoContenido` por tokenAcceso → verifica `estado=COMPLETADO` y `publicacionId` correcto
- Cookie httpOnly, secure en producción, sameSite=lax, duración 1 año

### Admin siempre accede
- `isAdminAuthorized()` → si true, `requierePago = false` → contenido completo
- Barra azul informativa visible para el admin en el artículo

### Panel de compras
- `/admin/compras` — lista todos los PedidoContenido con filtros por estado
- Muestra total recaudado, compras completadas, artículo, comprador, fecha, monto

---

## 16. Estado de donaciones y pagos PayPal

### PayPal Orders API v2 — OPERATIVO
- Donaciones: `/donar` → `POST /api/donaciones/checkout` → orden PayPal → `/donar/gracias`
- Compras premium: `/api/comprar` → orden PayPal con `custom_id="contenido:<id>"` → `/comprar/exito`
- Webhook: `POST /api/donaciones/webhook` — distingue por `custom_id` si es donación o compra de contenido
- `locale: "es_MX"` — PayPal muestra la interfaz en español latinoamericano
- `landing_page: "BILLING"` — muestra formulario de tarjeta directamente

### Credenciales configuradas en Vercel ✅
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (Live, server-side únicamente)
- `PAYPAL_ENV=live`
- `PAYPAL_WEBHOOK_ID` — ID del webhook en PayPal Dashboard

### IMPORTANTE: credenciales Live vs Sandbox
- Las credenciales deben ser de la pestaña **"Live"** en developer.paypal.com
- Con credenciales Sandbox + `PAYPAL_ENV=live` → error 401
- Para probar sin dinero real: credenciales Sandbox + `PAYPAL_ENV=sandbox`

### Stripe — ELIMINADO
Stripe no opera en El Salvador para cuentas receptoras. Todo el código de Stripe fue eliminado del repo en sesión 12. Las variables `STRIPE_*` se pueden quitar de Vercel.

---

## 17. Hardening de rendimiento

- Rate limit 30 req/min por IP en: `/api/publicaciones`, `/api/servicios`, `/api/dashboard`
- Rate limit 20/hora por IP en: `/api/comprar`
- Paginación en `/api/publicaciones`: parámetros `?limit=` (máx 100) y `?page=`
- Worker IA: límite global 200 req/min via KV (`checkGlobalRateLimit` en `ratelimit.ts`)
- CSP actualizado para permitir PayPal: `script-src`, `frame-src`, `connect-src`, `img-src`
- `Permissions-Policy`: `payment` permite `https://www.paypal.com`
