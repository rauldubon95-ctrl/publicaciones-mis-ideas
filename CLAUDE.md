# CLAUDE.md — Contexto de sesión para desarrollo asistido por IA

Este archivo es la fuente de verdad para cualquier sesión IA nueva.
Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. Qué es este proyecto

Plataforma académica personal de Raúl Dubón. Publicaciones, recursos, cómics y un asistente de IA sobre ciencias sociales latinoamericanas.

**Dominio:** `rauldubon.org` (comprado en Cloudflare — pendiente de conectar a Vercel)
**Marca:** "Raúl Dubón" — aplicada en layout, Header, Footer, AsistenteChat, Worker CORS, metadata.

**Stack:**
- Frontend: Next.js 15.5.18 + React 19.1.0 (App Router) desplegado en Vercel
- Base de datos principal: PostgreSQL en Supabase, accedida vía Prisma
- Storage: Supabase Storage — bucket `comics` (imágenes cómics) + bucket `libros` (PDFs y portadas)
- IA: Cloudflare Worker (`workers/sociologia/`) con D1 + KV + Workers AI

**Repositorio:** `rauldubon95-ctrl/publicaciones-mis-ideas`
**Rama de desarrollo activa:** ver `git branch --show-current` al inicio de cada sesión

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| ✅ Next.js app | Producción | Vercel, `main`, commit `8d75b88`. Next.js 15.5.18 + React 19.1.0 |
| ✅ Cloudflare Worker `sociologia` | Producción | Auto-deploy via Git integration. root dir: `workers/sociologia`. 3 skills activas. |
| ✅ Skills: sociológica, histórica, política | Producción | `sociological-analysis`, `historical-analysis`, `political-analysis` en SkillRegistry |
| ✅ Sync Supabase → D1 | Producción | Automático al publicar/despublicar + botón sync masivo en admin |
| ✅ Token premium (admin sin límite IA) | Producción | HMAC(SESSION_SIGNING_SECRET \|\| ADMIN_SECRET, "premium-bypass-v1") |
| ✅ Secretos separados | Producción sesión 12 | `ADMIN_PASSWORD` + `SESSION_SIGNING_SECRET` + `D1_SYNC_SECRET`. `lib/secrets.ts` con fallback a `ADMIN_SECRET`. |
| ✅ Telemetría IA | Producción | KV, 7 días historial. Panel `/admin/observabilidad`. Requiere `D1_SYNC_SECRET` igual en Vercel y Worker. |
| ✅ Monetización artículos premium | Producción sesión 12 | `MuroPago.tsx`, PayPal, magic link correo, cookie `acc_<id[:16]>` 1 año |
| ✅ Libros en venta | Producción sesión 13 | `MuroLibro.tsx`, PayPal, magic link `/leer/libro/[token]`, cookie `lib_<id[:16]>` 1 año |
| ✅ PayPal Orders API v2 — Donaciones | Producción | `FormularioDonacion.tsx`: montos $3/$5/$10/$25 + personalizado. Webhook firmado. |
| ✅ PayPal Orders API v2 — Artículos | Producción sesión 12 | `custom_id="contenido:<pedidoId>"` en webhook. |
| ✅ PayPal Orders API v2 — Libros | Producción sesión 13 | `custom_id="libro:<pedidoId>"` en webhook. |
| ✅ Notificación admin por donación/compra | Producción | Resend envía correo a `ADMIN_EMAIL` al capturar cada pago. |
| ✅ Webhook PayPal con firma criptográfica | Producción sesión 12 | `verificarFirmaWebhookPayPal()`. Idempotencia via `WebhookEventoProcesado`. |
| ✅ Sección Libros | Producción sesión 13 | Grid público, página individual, CRUD admin, upload PDF+portada a Supabase Storage |
| ✅ Paginación | Producción | `Paginacion.tsx`: home (4/pág) + `/publicaciones` (8/pág) |
| ✅ Servicios de Consultoría | Producción | `/servicios` + modal cotización + CRUD admin |
| ✅ Suscripción por correo | Producción | Double Opt-In, Resend, panel `/admin/suscriptores` |
| ✅ Categorías dinámicas | Producción | Grid automático, `icono`+`imagen`, SEO en `/categorias/[slug]` |
| ✅ Security hardening fases 1–5 | Producción | RLS 21 tablas Supabase, IPs hasheadas, secretos separados, middleware, scan paths |
| ✅ Agentes IA GitHub Actions | Producción | `code-review.yml` + `prioritize.yml` — GitHub Models (gratis) |
| ✅ Botones compartir redes sociales | Producción sesión 15 | `BotonesCompartir.tsx` en `/publicaciones/[slug]`. WhatsApp, Facebook, X, LinkedIn, copiar enlace. Share intents nativos, sin API keys. |
| ✅ SEO/GEO correcciones | Producción sesión 16 | `lib/seo.ts` central. Canonical propio por página (fin del bug heredado). JSON-LD Person/WebSite/Article/Book. og:image fallback. robots.txt permite ChatGPT-User/OAI-SearchBot/PerplexityBot/ClaudeBot, bloquea entrenamiento. Sitemap incluye libros. Noindex en rutas transaccionales. Artículos relacionados automáticos. |
| ✅ og:image objeto explícito | Producción sesión 17 | `app/layout.tsx`: `images` como `[{url,width:1200,height:630,alt,type}]`. Facebook deja de marcar "propiedad inferida". |
| ✅ Botones compartir universales | Producción sesión 17 | `BotonesCompartir` acepta `path` (no `slug` hardcoded). Integrado en libros, recursos, dashboards. JSON-LD `CreativeWork` en recursos. Pendiente integrar en dashboard individual junto al refactor server+client. |
| ✅ Respuesta a cotizaciones | Producción sesión 17 | `RespuestaCotizacion` + estado `RESPONDIDA` + `respondidaAt`. Endpoint `POST /api/admin/cotizaciones/[id]/responder` (rate-limit 30/h, máx 5 respuestas/cot). UI con form inline + historial. Envía Resend. |
| ✅ Monetización recursos HTML | Producción sesión 17 | `MuroRecurso.tsx`, PayPal, magic link `/leer/recurso/[token]`, cookie `rec_<id[:16]>` 1 año. Endpoints `/api/recursos/[slug]/html` y `/descargar` devuelven 402 si premium sin acceso. Admin ve completo + barra azul. |
| ✅ Monetización dashboards Excel | Producción sesión 17 | `MuroDashboard.tsx`, PayPal, magic link `/leer/dashboard/[token]`, cookie `dash_<id[:16]>` 1 año. GET `/api/dashboard/[id]` omite `archivoUrl`/`preview` y devuelve `requiereAcceso:true` si premium sin acceso. Proxy `/api/dashboard/[id]/descargar` (302 con acceso, 402 sin). Admin ve completo + barra azul. |
| ✅ PayPal Orders API v2 — Recursos | Producción sesión 17 | `custom_id="recurso:<pedidoId>"` en webhook. |
| ✅ PayPal Orders API v2 — Dashboards | Producción sesión 17 | `custom_id="dashboard:<pedidoId>"` en webhook. |
| ❌ Stripe | Eliminado sesión 12 | Código borrado. Campo `stripeId` en `Donacion` es legacy — ahora guarda `paypalOrderId`. |
| ❌ Multi-worker / orquestación | Pendiente | Ver §17. Solo existe 1 worker hoy. |
| ❌ Vectorize (retrieval semántico) | Pendiente | Binding comentado en `wrangler.toml`. Requiere `wrangler vectorize create`. |

---

## 3. Variables de entorno requeridas

### Vercel (Next.js)

| Variable | Descripción | Estado |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) Supabase | ✅ Configurada |
| `DIRECT_URL` | PostgreSQL direct connection string Supabase | ✅ Configurada |
| `ADMIN_SECRET` | **LEGACY** — fallback si no están las nuevas variables separadas | Legacy |
| `ADMIN_PASSWORD` | Contraseña que el humano escribe en `/admin/login` | ✅ Sesión 12 |
| `SESSION_SIGNING_SECRET` | Firma cookies admin + token premium IA. Debe coincidir con Worker. | ✅ Sesión 12 |
| `D1_SYNC_SECRET` | Autentica `/sync` y `/telemetria` del Worker. Debe coincidir con Worker. | ✅ Sesión 12 |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyecto Supabase | ✅ Configurada |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key Supabase | ✅ Configurada |
| `SUPABASE_URL` | URL Supabase server-side | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (solo server) | ✅ Configurada |
| `RESEND_API_KEY` | API Key Resend (correos: suscripciones, notificaciones, magic links) | ✅ Configurada |
| `FROM_EMAIL` | Remitente, ej: `Raúl Dubón <noreply@rauldubon.org>` | ✅ Configurada |
| `ADMIN_EMAIL` | Correo que recibe notificaciones de donaciones/compras. Default: `raul.dubon95@gmail.com` | ✅ Configurada |
| `PAYPAL_CLIENT_ID` | Client ID Business PayPal (server-side) | ✅ Configurada |
| `PAYPAL_CLIENT_SECRET` | Secret Business PayPal. NUNCA `NEXT_PUBLIC_`. | ✅ Configurada |
| `PAYPAL_ENV` | `live` producción / `sandbox` pruebas | ✅ `live` |
| `PAYPAL_WEBHOOK_ID` | ID webhook en PayPal Dashboard | ✅ Sesión 12 |
| `HEALTH_TOKEN` | Token para `/api/health` con métricas completas | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |
| `PREMIUM_TOKEN` | **ELIMINADO** 2026-05-24. No reconfigurar. | ❌ |
| `STRIPE_*` | **ELIMINADOS** sesión 12. Quitar de Vercel. | ❌ |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` — ID en `wrangler.toml` |
| `RATE_LIMIT` | KV binding | Rate limiting + telemetría |
| `AI` | Workers AI binding | `@cf/meta/llama-3.1-8b-instruct` |
| `ADMIN_SECRET` | Worker secret | **LEGACY** — fallback |
| `SESSION_SIGNING_SECRET` | Worker secret | Valida token premium. **Mismo valor que Vercel.** ✅ |
| `D1_SYNC_SECRET` | Worker secret | Autentica `/sync` y `/telemetria`. **Mismo valor que Vercel.** ✅ |

---

## 4. Schema D1 real (producción)

Cloudflare D1: `llm_sociolog`. Tabla activa:

```sql
CREATE TABLE documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  slug TEXT,
  texto TEXT NOT NULL,
  tipo TEXT DEFAULT 'articulo',   -- 'articulo' = corpus, 'publicacion' = artículos del sitio
  palabras TEXT,
  fuente TEXT
);
CREATE VIRTUAL TABLE documentos_fts USING fts5(titulo, texto, palabras, content='documentos', content_rowid='id');
```

**804 documentos** del corpus académico + artículos del sitio sincronizados (`tipo='publicacion'`).

**NO ejecutar** los scripts de `migrations/d1/` — describen arquitectura futura incompatible con la DB de producción.

---

## 5. Mecanismo de token premium (asistente IA)

1. Admin se loguea → cookie `admin_auth`
2. `AsistenteChat.tsx` llama `/api/asistente/token` en cada cambio de ruta
3. Endpoint verifica cookie → computa `HMAC(SESSION_SIGNING_SECRET || ADMIN_SECRET, "premium-bypass-v1")`
4. Chat envía token en header `X-Premium-Token`
5. Worker valida con mismo HMAC usando `env.SESSION_SIGNING_SECRET ?? env.ADMIN_SECRET`

---

## 6. Artículos: normales y premium

**Normales:** borrador por defecto. Admin → editar → activar "Visible al público" → sync automático a D1.

**Premium:** toggle "Artículo de pago" + precio USD (mínimo $1.00) + resumen público opcional. Al visitar el artículo:
- **Admin:** ve contenido completo + barra azul informativa ("estás viendo como admin")
- **Visitante sin pago:** ve resumen público (o primeros 800 chars) + `MuroPago.tsx`
- **Visitante con pago:** accede via cookie `acc_<publicacionId[:16]>` o magic link `/leer/<token>`

---

## 7. Libros: gratis y de pago (sesión 13)

**Gratis** (`precioCentavos = 0` o `null`): botón "Descargar PDF" visible para todos.

**De pago** (`precioCentavos > 0`): Al visitar `/libros/[slug]`:
- **Admin:** ve botón de descarga + barra azul informativa
- **Visitante sin pago:** ve descripción + `MuroLibro.tsx` (email + nombre → PayPal)
- **Visitante con pago:** ve botón de descarga (cookie `lib_<libroId[:16]>` o magic link `/leer/libro/<token>`)

### Flujo de compra de libro
1. `MuroLibro.tsx` → `POST /api/libros/comprar` → crea `PedidoLibro` PENDIENTE + orden PayPal `custom_id="libro:<pedidoId>"`
2. PayPal aprueba → redirige a `/libros/comprar/exito?pedido_id=...&token=<paypalOrderId>`
3. `/libros/comprar/exito` captura orden → marca COMPLETADO → setea cookie `lib_<libroId[:16]>`
4. Webhook PayPal (en paralelo) → detecta prefijo `"libro:"` → marca COMPLETADO (idempotente) → envía magic link correo + notificación admin
5. Magic link `/leer/libro/<tokenAcceso>` → setea cookie → redirige al libro

### Tabla PedidoLibro — SQL para Supabase (ejecutar si no existe)
```sql
CREATE TABLE "PedidoLibro" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "libroId" TEXT NOT NULL,
  "emailComprador" TEXT NOT NULL,
  "nombreComprador" TEXT,
  "montoCentavos" INTEGER NOT NULL,
  "moneda" TEXT NOT NULL DEFAULT 'USD',
  "paypalOrderId" TEXT UNIQUE,
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "tokenAcceso" TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completadoAt" TIMESTAMP(3),
  "ultimoAccesoAt" TIMESTAMP(3),
  CONSTRAINT "PedidoLibro_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PedidoLibro_libroId_fkey" FOREIGN KEY ("libroId") REFERENCES "Libro"("id") ON DELETE CASCADE
);
CREATE INDEX "PedidoLibro_emailComprador_idx" ON "PedidoLibro"("emailComprador");
CREATE INDEX "PedidoLibro_estado_idx" ON "PedidoLibro"("estado");
CREATE INDEX "PedidoLibro_libroId_estado_idx" ON "PedidoLibro"("libroId", "estado");
CREATE INDEX "PedidoLibro_creadoAt_idx" ON "PedidoLibro"("creadoAt");
ALTER TABLE "PedidoLibro" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adm_pedidolibro" ON "PedidoLibro" FOR ALL USING (true) WITH CHECK (true);
```

---

## 8. Rutas críticas

### Next.js — Páginas públicas

| Ruta | Propósito |
|---|---|
| `/` | Home paginado (4/pág) |
| `/publicaciones` | Listado paginado (8/pág) |
| `/publicaciones/[slug]` | Artículo individual (normal o premium) |
| `/categorias/[slug]` | Categoría con artículos |
| `/recursos` | Recursos descargables |
| `/comics` | Tiras cómicas |
| `/libros` | Grid de libros publicados |
| `/libros/[slug]` | Página individual de libro (descarga o muro de pago) |
| `/libros/comprar/exito` | Retorno de PayPal tras compra de libro |
| `/recursos/comprar/exito` | Retorno de PayPal tras compra de recurso premium (sesión 17) |
| `/dashboard` | Listado público de tableros Excel |
| `/dashboard/[id]` | Tablero individual (gratis o muro de pago). Param es slug. |
| `/dashboard/comprar/exito` | Retorno de PayPal tras compra de dashboard premium (sesión 17) |
| `/donar` | Donaciones vía PayPal (`FormularioDonacion.tsx`) |
| `/servicios` | Servicios de consultoría |
| `/comprar/exito` | Retorno de PayPal tras compra de artículo premium |
| `/leer/[token]` | Magic link artículo. **Route Handler** (sesión 20): valida token → setea cookie en la respuesta → redirige |
| `/leer/libro/[token]` | Magic link libro. **Route Handler** (sesión 20): valida token → cookie → redirige |
| `/leer/recurso/[token]` | Magic link recurso. **Route Handler** (sesión 20): valida token → cookie → redirige |
| `/leer/dashboard/[token]` | Magic link dashboard. **Route Handler** (sesión 20): valida token → cookie → redirige |
| `/suscribir/*` | Formulario y confirmaciones de suscripción |

### Next.js — Admin (todas requieren cookie `admin_auth`)

| Ruta | Propósito |
|---|---|
| `/admin` | Dashboard principal con accesos rápidos |
| `/admin/nueva` | Crear publicación |
| `/admin/editar/[id]` | Editar publicación (incl. configuración premium) |
| `/admin/comics` + `/nueva` + `/editar/[id]` | CRUD de cómics |
| `/admin/recursos` + `/nueva` + `/editar/[id]` | CRUD de recursos |
| `/admin/libros` + `/nueva` + `/editar/[id]` | CRUD de libros (PDF + portada) |
| `/admin/servicios` | CRUD de servicios de consultoría |
| `/admin/cotizaciones` | Solicitudes de clientes + responder vía Resend (sesión 17) |
| `/admin/donaciones` | Historial de donaciones PayPal |
| `/admin/compras` | Historial de compras de artículos premium |
| `/admin/ventas-libros` | Historial de ventas de libros |
| `/admin/ventas-recursos` | Historial de ventas de recursos HTML premium (sesión 17) |
| `/admin/ventas-dashboards` | Historial de ventas de dashboards Excel premium (sesión 17) |
| `/admin/suscriptores` | Lista de correo + analítica |
| `/admin/metricas` | Dashboard de vistas, descargas, reacciones |
| `/admin/tableros` | Subir/publicar plantillas Excel + edición inline de premium/precio/resumen (sesión 17) |
| `/admin/seguridad` | Log de eventos de seguridad |
| `/admin/observabilidad` | Telemetría del asistente IA (7 días) |

### Next.js — APIs relevantes

| Ruta | Propósito |
|---|---|
| `app/api/comprar/route.ts` | POST: inicia compra artículo premium → PedidoContenido + orden PayPal |
| `app/api/libros/comprar/route.ts` | POST: inicia compra libro → PedidoLibro + orden PayPal |
| `app/api/libros/[slug]/descargar/route.ts` | GET: descarga PDF (verifica pago si libro es de pago) |
| `app/api/recursos/comprar/route.ts` | POST: inicia compra recurso → PedidoRecurso + orden PayPal (sesión 17) |
| `app/api/recursos/[slug]/html/route.ts` | GET: sirve HTML para iframe. 402 si premium sin acceso (sesión 17) |
| `app/api/recursos/[slug]/descargar/route.ts` | GET: descarga HTML. 402 si premium sin acceso (sesión 17) |
| `app/api/dashboard/comprar/route.ts` | POST: inicia compra dashboard → PedidoDashboard + orden PayPal (sesión 17) |
| `app/api/dashboard/[id]/route.ts` | GET: tablero. Si premium && !admin && !acceso → omite `archivoUrl`/`preview` + `requiereAcceso:true` (sesión 17) |
| `app/api/dashboard/[id]/descargar/route.ts` | GET: proxy gateado al Excel. 302 al bucket con acceso, 402 sin (sesión 17) |
| `app/api/donaciones/webhook/route.ts` | POST: webhook PayPal firmado. Discrimina `contenido:`, `libro:`, `recurso:`, `dashboard:`, donación. Idempotente. |
| `app/api/donaciones/checkout/route.ts` | POST: crea orden PayPal para donación |
| `app/api/admin/cotizaciones/[id]/responder/route.ts` | POST admin: responde cotización vía Resend (rate-limit 30/h, máx 5 respuestas/cot) (sesión 17) |
| `app/api/admin/compras/route.ts` | GET admin: lista PedidoContenido + total recaudado |
| `app/api/admin/compras/[id]/reenviar/route.ts` | POST admin (sesión 20): reenvía el enlace de acceso al email del pedido (artículo premium, solo COMPLETADO, rate-limit 30/h) |
| `app/api/admin/ventas-libros/route.ts` | GET admin: lista PedidoLibro + total recaudado |
| `app/api/admin/ventas-libros/[id]/reenviar/route.ts` | POST admin (sesión 20): reenvía el correo con el enlace de descarga al email del pedido (solo COMPLETADO, rate-limit 30/h). Para compradores que perdieron el acceso. |
| `app/api/admin/ventas-recursos/route.ts` | GET admin: lista PedidoRecurso + total recaudado (sesión 17) |
| `app/api/admin/ventas-recursos/[id]/reenviar/route.ts` | POST admin (sesión 20): reenvía el enlace de acceso al email del pedido (recurso premium, solo COMPLETADO, rate-limit 30/h) |
| `app/api/admin/ventas-dashboards/route.ts` | GET admin: lista PedidoDashboard + total recaudado (sesión 17) |
| `app/api/admin/ventas-dashboards/[id]/reenviar/route.ts` | POST admin (sesión 20): reenvía el enlace de acceso al email del pedido (tablero premium, solo COMPLETADO, rate-limit 30/h) |
| `app/api/admin/libros/route.ts` | GET + POST admin: listar y crear libros |
| `app/api/admin/libros/[id]/route.ts` | PUT + DELETE admin: editar y eliminar libro |
| `app/api/admin/libros/upload/route.ts` | POST admin: subir PDF o portada a Supabase Storage bucket `libros` |
| `app/api/admin/telemetria/route.ts` | GET admin: proxy autenticado → Worker `/telemetria` |
| `app/api/admin/sync-d1-all/route.ts` | POST: sincroniza todos los artículos publicados a D1 |
| `app/api/track/route.ts` | POST: registra vista de artículo |
| `app/api/subscribe/route.ts` | POST: registrar suscripción email |

### Cloudflare Worker (`workers/sociologia/`)

| Endpoint | Propósito |
|---|---|
| `POST /` | Chat IA: RAG + LLM + skills |
| `POST /skill` | Análisis académico estructurado (externo) |
| `POST /sync` | Upsert/delete artículo en D1 (autenticado con `D1_SYNC_SECRET`) |
| `POST /embed` | Generar embeddings (admin, Phase 3) |
| `GET /telemetria` | Métricas de uso IA (autenticado con `D1_SYNC_SECRET`) |

---

## 9. Prisma schema — modelos activos

```
Publicacion     → campos premium: esPremium Boolean, precioCentavos Int?, resumenPublico String?
                  relaciones: VistaPublicacion, DescargaPdf, Comentario, Reaccion, EmailEnvio, PedidoContenido
Categoria       → campos: icono String?, imagen String?
Etiqueta        → PublicacionEtiqueta → Publicacion
Comic           → VistaComic
RecursoHtml     → campos premium (sesión 17): esPremium Boolean, precioCentavos Int?, resumenPublico String?
                  relaciones: VistaRecurso[], PedidoRecurso[]
Libro           → titulo, slug (unique), descripcion, paginas?, precioCentavos?, urlPdf, imagenPortada?,
                  publicado, creadoAt, actualizadoAt
                  relaciones: DescargaLibro[], PedidoLibro[]
Tablero         → titulo, slug (unique), descripcion?, categoria?, archivoUrl, archivoNombre, preview,
                  publicado, orden, creadoAt, actualizadoAt
                  + campos premium (sesión 17): esPremium, precioCentavos?, resumenPublico?
                  relaciones: PedidoDashboard[]
DescargaLibro   → libroId, creadoAt, pais?, dispositivo?
PedidoLibro     → libroId, emailComprador, nombreComprador?, montoCentavos, moneda, paypalOrderId? (unique),
                  estado (PENDIENTE/COMPLETADO/FALLIDO/CANCELADO), tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?
PedidoRecurso   → (sesión 17) recursoId, emailComprador, nombreComprador?, montoCentavos, moneda,
                  paypalOrderId? (unique), estado, tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?
PedidoDashboard → (sesión 17) tableroId, emailComprador, nombreComprador?, montoCentavos, moneda,
                  paypalOrderId? (unique), estado, tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?
RateLimitDb     → rate limiting persistente
EventoSeguridad → log de seguridad
SesionAdmin     → jti, revocadaAt, expiraAt (revocación de sesiones)
Servicio        → SolicitudCotizacion
SolicitudCotizacion → + estado RESPONDIDA, + respondidaAt?, + respuestas RespuestaCotizacion[] (sesión 17)
RespuestaCotizacion → (sesión 17) cotizacionId (FK CASCADE), asunto, cuerpoHtml, cuerpoTexto,
                  enviadoPor, resendMessageId?, estadoEnvio (PENDIENTE/ENVIADO/FALLIDO),
                  errorMensaje?, creadoAt
Subscription    → email, nombre, status, token, confirmedAt, unsubscribedAt
EmailEnvio      → asunto, publicacionId, totalEnviados, totalAbiertos
Donacion        → stripeId (campo legacy — guarda paypalOrderId), estado, monto, moneda
PedidoContenido → publicacionId, emailComprador, montoCentavos, paypalOrderId (unique),
                  estado, tokenAcceso (unique cuid), creadoAt, completadoAt, ultimoAccesoAt
WebhookEventoProcesado → eventId (PK), proveedor, tipoEvento — idempotencia de webhooks
```

**Nota:** El campo `stripeId` en `Donacion` es un nombre legacy. Actualmente guarda el `paypalOrderId`. No renombrar sin migración.

---

## 10. Workflows GitHub Actions

| Workflow | Trigger | Propósito |
|---|---|---|
| `deploy-worker.yml` | Push a `main` con cambios en `workers/sociologia/**` | Intenta deploy del Worker (falla por CF_API_TOKEN con IP restringida — Cloudflare Git integration lo cubre) |
| `code-review.yml` | PR o lunes 8:00 UTC | Revisa código, crea Issues — GitHub Models gratis |
| `prioritize.yml` | Lunes 9:00 UTC | Prioriza Issues, reporte semanal — GitHub Models gratis |

---

## 11. Deuda técnica conocida

| Item | Detalle | Prioridad |
|---|---|---|
| ~~CSP `unsafe-inline`~~ (**CERRADO sesión 19 — M2**) | `script-src` ya no usa `'unsafe-inline'`: nonce por petición vía `middleware.ts` (`construirCSP` + `'strict-dynamic'`), CSP en request+response. `JsonLd.tsx` async lee `x-nonce`. `next.config.mjs` ya no define CSP estático. Verificación operativa en navegador pendiente. Ver §18. | ~~Alta~~ |
| Más limpieza corpus D1 | 804 docs, aún hay documentos de baja calidad | Alta |
| ~~Buckets Supabase públicos~~ (sesión 17 — **MITIGADO sesión 18**) | Los endpoints `/api/libros/[slug]/descargar` y `/api/dashboard/[id]/descargar` ya hacen **stream** del archivo (service role) en vez de redirigir a la URL pública; la URL del bucket nunca se entrega al cliente. Recursos premium ya no usan bucket (HTML en DB + RLS cerrado). Buckets siguen públicos pero **ya no son enumerables**. Residual BAJO: iframe Office Online de dashboards. Ver §18. | ~~Media~~ → Baja |
| ~~`PAYPAL_WEBHOOK_ID` no validado~~ (sesión 17, **CERRADO** PR #20) | `/api/health` con `HEALTH_TOKEN` válido reporta `config.paypal_webhook_id` y otras envs críticas como booleans. Verificación operativa pendiente solo en Vercel env vars. | ~~Baja~~ |
| ~~Sin middleware-level guard para `/api/admin/*`~~ (sesión 17, **CERRADO** PR #21) | `middleware.ts` rechaza 401 JSON cualquier `/api/admin/*` sin cookie `admin_auth`. `isAdminAuthorized()` en cada endpoint sigue siendo la verificación real. | ~~Baja~~ |
| Compartir social en `/dashboard/[id]` | Pendiente. Es client component sin metadata SEO. Refactor server+client para `BotonesCompartir` + canonical + og:image. | Baja |
| Factorizar `MuroPago`/`MuroLibro`/`MuroRecurso`/`MuroDashboard` | ~95% código compartido. Crear `components/MuroPagoBase.tsx` parametrizable. **PR aislada**, sin tocar nada más. | Baja |
| ~~`xlsx` vulnerabilidad~~ (**N/A — verificado sesión 18**) | `app/api/admin/tableros/route.ts` usa **`exceljs`**, no `xlsx`. `xlsx` no es dependencia del proyecto. Sin acción. | ~~Media~~ |
| Vectorize desactivado | Retrieval es solo FTS5+LIKE. Requiere `wrangler vectorize create` + pipeline embeddings. | Media |
| Telemetría en KV (no D1) | Datos de IA duran solo 7 días. Dashboard persistente requeriría D1. | Media |
| Campo `stripeId` en Donacion | Nombre legacy: hoy guarda paypalOrderId. Renombrar requiere migración Supabase + Prisma. | Baja |
| CF_API_TOKEN con restricción IP | GitHub Actions no puede deployar Worker. Cloudflare Git integration lo cubre por ahora. | Baja |
| `config/prompts/v1.1.txt` desconectado | Worker usa SYSTEM_PROMPT en `prompts.ts`, no este archivo. | Baja |
| `cuerpoHtml` vacío en `RespuestaCotizacion` (sesión 17) | Por simplicidad guardamos `""`. La plantilla HTML se reconstruye desde `cuerpoTexto` si hace falta. Llenar es trivial sin migración. | Baja |
| URL `/dashboard/[id]` con param que en realidad es slug | Confunde al leer (el folder es `[id]` pero el valor es slug). Renombrar a `[slug]` cambia el path interno, no rompe URLs públicas, pero perdería historial git. Cosmético. | Baja |
| Multi-worker / orquestación | Ver §17 — pendiente | Futura |

---

## 12. Reglas para sesiones IA futuras

1. **Worker `sociologia` está en producción** — Auto-deploy al pushear a `main` tocando `workers/sociologia/**`.
2. **Tabla D1 real: `documentos`** — `tipo='articulo'` = corpus, `tipo='publicacion'` = artículos del sitio.
3. **No pushear a `main` sin confirmar con el usuario** — Vercel Y Cloudflare auto-despliegan.
4. **Actualizar este archivo** en cada sesión.
5. **Verificar rama activa** al inicio: `git branch --show-current`.
6. **SESSION_SIGNING_SECRET y D1_SYNC_SECRET deben coincidir** en Vercel Y en el Worker. Son **dos tablas de secrets independientes** — configurarlo en Vercel no lo propaga a Cloudflare. Si `/admin/observabilidad` muestra "Worker respondió 500: No configurado", el secret falta en Cloudflare Dashboard → Workers → `sociologia` → Settings → Variables and Secrets. **No es bug del código** — síntoma real confirmado en sesión 17.
7. **El admin siempre ve el contenido completo** de artículos premium Y libros de pago (diseño intencional). Barra azul lo indica. Para probar el muro, usar ventana de incógnito.
8. **El precio siempre viene del servidor** — nunca del cliente. `/api/comprar` y `/api/libros/comprar` lo leen de la DB.
9. **Webhook PayPal es idempotente** — usa `WebhookEventoProcesado`. Discrimina por prefijo `custom_id`: `"contenido:"` = artículo, `"libro:"` = libro, `"recurso:"` = recurso HTML, `"dashboard:"` = tablero Excel, sin prefijo = donación.
10. **Next.js 15: `params` y `cookies()` son async** — deben ser `await`eados. **Setear cookies (`cookies().set()` / `cookieStore.set()`) SOLO es legal en Route Handlers (`route.ts`) y Server Actions, NUNCA durante el render de una página/Server Component** (lanza "Cookies can only be modified in a Server Action or Route Handler" → 500). Por eso los enlaces mágicos `/leer/*` son Route Handlers que setean la cookie **en la respuesta de redirección** (`res.cookies.set(...)`, no vía `next/headers`, que puede perderse al devolver un `NextResponse` propio). Las páginas de éxito NO setean cookie: enrutan el botón por `/leer/*`. Lección del incidente de sesión 20.
11. **`FormularioDonacion.tsx` es el componente activo de donaciones** — no `BotonesPayPal`. Montos $3/$5/$10/$25 + personalizado.
12. **3 skills activas en el Worker**: `sociological-analysis`, `historical-analysis`, `political-analysis`.
13. **Las tablas `PedidoLibro`, `PedidoRecurso`, `PedidoDashboard`, `RespuestaCotizacion` deben existir en Supabase** — SQL en `migrations/sql/`. Si falla con "tabla no encontrada", no se ha ejecutado aún.
14. **Cookies de acceso por contenido** (sesión 17): `acc_<id[:16]>` artículos, `lib_<id[:16]>` libros, `rec_<id[:16]>` recursos, `dash_<id[:16]>` dashboards. Todas `httpOnly`, `secure` prod, `sameSite: lax`, 1 año.
15. **Helpers de acceso** en `lib/`: `accesoContenido.ts`, `accesoLibro.ts`, `accesoRecurso.ts`, `accesoDashboard.ts`. Patrón uniforme `tieneAcceso<X>()` + `setearCookieAcceso<X>()`.
16. **Premium en recursos y dashboards funciona igual que libros**: admin ve todo + barra azul; visitante sin pago ve resumenPublico (o descripción) + Muro; con pago ve completo.
17. **Endpoints `/api/recursos/<slug>/html|descargar` devuelven 402** si recurso premium sin acceso. **`/api/dashboard/<id>/descargar` devuelve 402 o redirige 302** según acceso. **`/api/dashboard/<id>` GET devuelve metadata sin `archivoUrl`/`preview` + `requiereAcceso:true`** si premium sin acceso (no 402 — el cliente lo necesita para renderizar el muro con precio).
18. **Cotizaciones**: estado `RESPONDIDA` activo. `/api/admin/cotizaciones/[id]/responder` enforcea máx 5 respuestas/cot. El cuerpo viaja como texto plano; los `\n` se preservan en el correo.
19. **`MuroPago/MuroLibro/MuroRecurso/MuroDashboard` son copias** — ~95% idénticos. Factorización es deuda técnica explícita. **No** la hagas en una PR que toque otra cosa: necesita su propia PR aislada.

---

## 13. Comandos útiles

```bash
git log --oneline -10 && git status

# TypeCheck Next.js
npx tsc --noEmit

# TypeCheck Worker
cd workers/sociologia && npx tsc --noEmit

# Logs Worker en tiempo real
cd workers/sociologia && npx wrangler tail
```

---

## 14. Sync de artículos a D1

Automático al publicar/despublicar. Para sincronizar todos:
1. `/admin` → "Sincronizar artículos" → `POST /api/admin/sync-d1-all`

---

## 15. PayPal — configuración actual

- `locale: "es-MX"` → interfaz en español latinoamericano ✅ (formato BCP-47 con guión; `es_MX` con guión bajo es rechazado por PayPal Orders v2)
- `landing_page: "BILLING"` → formulario de tarjeta directo
- Donaciones, artículos, libros, recursos y dashboards usan la misma función `crearOrdenPayPal()` con `custom_id` diferente
- Webhook discrimina por prefijo en `custom_id`: `"contenido:"` artículo, `"libro:"` libro, `"recurso:"` recurso HTML, `"dashboard:"` tablero Excel, sin prefijo = donación
- 4 prefijos × 3 estados PayPal (COMPLETED/DENIED/REFUNDED) = 12 ramas en el switch del webhook. Idempotencia con `WebhookEventoProcesado`.

---

## 16. Progreso de la plataforma

| Componente | Estado |
|---|---|
| Publicaciones, recursos, cómics, admin | ✅ Producción |
| Categorías dinámicas con SEO | ✅ Producción |
| Servicios de consultoría + cotizaciones | ✅ Producción |
| Suscripción por correo (Double Opt-In) | ✅ Producción |
| Donaciones PayPal con webhook firmado | ✅ Producción |
| Artículos premium con muro de pago PayPal | ✅ Producción |
| Libros en PDF con muro de pago PayPal | ✅ Producción sesión 13 |
| Recursos HTML con muro de pago PayPal | ✅ Producción sesión 17 |
| Dashboards Excel con muro de pago PayPal | ✅ Producción sesión 17 |
| Respuesta a cotizaciones (máx 5/cot) desde admin | ✅ Producción sesión 17 |
| Asistente IA con 3 skills académicas | ✅ Producción |
| Telemetría IA en /admin/observabilidad | ✅ Producción |
| Security hardening completo (fases 1–5) | ✅ Producción |
| Retrieval semántico (Vectorize) | ❌ Pendiente |
| Multi-worker / orquestación de agentes | ❌ Pendiente |
| Botones compartir en redes sociales | ✅ Producción sesión 15 (extendido a libros/recursos sesión 17) |
| SEO/GEO (canonical, JSON-LD, robots.txt, sitemap) | ✅ Producción sesión 16 |

---

## 17. Arquitectura multi-worker — planificación

### Estado actual (1 worker)
Solo existe `workers/sociologia/`. Hace todo: RAG, skills, sync, telemetría, embeddings.

### Visión: sistema de agentes multi-worker

```
Cliente (Next.js)
       │
       ▼
┌─────────────────────────┐
│  Orchestrator Worker    │  ← nuevo: enruta y agrega respuestas
│  (workers/orquestador/) │
└─────────────────────────┘
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│sociologia│ │ futuro:  │ │  futuro:     │
│(existente│ │datos/    │ │  resumen/    │
│)         │ │análisis  │ │  síntesis    │
└──────────┘ └──────────┘ └──────────────┘
```

### Lo que falta para empezar
1. **Autenticación worker-a-worker** — HMAC con un `INTER_WORKER_SECRET`
2. **Schema de request/response estandarizado** para orquestación
3. **Orchestrator Worker** (nuevo `workers/orquestador/`) que reciba queries complejas, las descomponga, llame a skills y agregue respuestas

---

## 18. PENDIENTES ACCIONABLES PARA PRÓXIMA SESIÓN

> **Inicio de sesión: lee este bloque primero.** La sesión 18 fue una auditoría
> de seguridad y resiliencia completa. Se cerró todo lo crítico/alto y la mayoría
> de lo medio. Queda **M2 (CSP sin `unsafe-inline`)** + remates de resiliencia.
> Detalle + SQL de rollback de cada cambio en `docs/auditoria-seguridad-2026-06-02.md`.

### ✅ Cerrado en sesión 18 (todo en producción)

- **C1 (CRÍTICO)** — La clave pública `anon` de Supabase podía leer/escribir
  `PedidoLibro/PedidoRecurso/PedidoDashboard/RespuestaCotizacion` vía PostgREST
  (bypass de paywall por `tokenAcceso`, fuga de PII, manipulación de pedidos).
  Se eliminaron las políticas RLS permisivas `FOR ALL USING(true)`. La app usa
  Prisma (conexión directa), no la anon key, así que no rompió nada.
- **H2** — La anon key leía el HTML de recursos premium (`RecursoHtml`) y permitía
  escritura anónima en `Libro`/`DescargaLibro`. Políticas eliminadas.
- **H3** — El bucket `comics` permitía INSERT/DELETE anónimo en `storage.objects`.
  Eliminadas (la subida real usa presigned URLs). Enumeración de `datos` cerrada (L2).
- **H1** — `/api/libros/[slug]/descargar` y `/api/dashboard/[id]/descargar` ya
  **NO** redirigen (302) al bucket público: el server descarga con service role y
  hace **stream** (`lib/supabase-admin.ts` → `descargarDesdeBucket`). La URL
  permanente nunca llega al cliente. (Tamaños actuales ≤2.5MB, muy por debajo del
  límite de respuesta de Vercel; ojo si algún día subes un PDF >~4.5MB.)
- **M1** — Timeouts (`AbortController`) en todas las llamadas externas
  (PayPal/Resend/Worker/D1). Helper `lib/timeout.ts` (`fetchConTimeout` 12s,
  `conTimeout` para Resend 10s). No cambia el camino feliz.
- **M4** — `req.json()` con try/catch en `/api/publicaciones` y `/api/admin/tableros/[id]`.
- **M3** — Falsa alarma: el código usa `exceljs`, `xlsx` no es dependencia.
- **Caching (Fase 3.3)** — `home, publicaciones, categorias, libros, comics,
  recursos, dashboard, servicios` cachean su consulta con `unstable_cache`
  (revalida 5 min, tags). Se mantienen `force-dynamic` a propósito (ver caveat
  Preview abajo). Propagación de cambios de contenido: hasta 5 min.
- **M2 (sesión 19)** — CSP **sin `unsafe-inline`** en `script-src`. Nonce
  criptográfico por petición generado en `middleware.ts` (`generarNonce`, Web
  Crypto + `btoa`). El CSP se construye dinámicamente (`construirCSP`) con
  `'nonce-<nonce>' 'strict-dynamic'` y se inyecta **tanto en las request headers
  como en las response headers** (Next.js lee el nonce del header CSP de la
  *request* para propagarlo a sus scripts de framework y a `next/script`/PayPal;
  `x-nonce` queda como conveniencia para `JsonLd.tsx`, que ahora es async y lo lee
  vía `headers()`). `next.config.mjs` **ya no** define el header CSP estático
  (lo hace el middleware). Mergeado a `main` directo (build local compiló OK; el
  fallo de `next build` local es solo `RESEND_API_KEY` ausente en el contenedor,
  no en Vercel).

### 🟡 Residual BAJO — Office Online iframe (dashboards)

`app/dashboard/[id]/page.tsx` incrusta `view.officeapps.live.com/op/embed.aspx?src=<archivoUrl público>`.
Un comprador con acceso puede copiar esa URL del Excel. Cerrarlo del todo =
privatizar `datos` + servir el iframe con signed URL (frágil con Office Online).
Como el bucket ya no es enumerable, la URL no es descubrible sin tener acceso.
Decisión de producto: aceptar el residual o reemplazar el visor.

### ✅ M2 — CSP sin `unsafe-inline` (CERRADO sesión 19)

Resuelto con nonces por petición (ver bloque "Cerrado" arriba). `script-src`
ahora es `'self' 'nonce-<nonce>' 'strict-dynamic' https://www.paypal.com`, sin
`'unsafe-inline'`. **Verificación operativa pendiente en producción**: abrir el
sitio y confirmar en la consola que no hay violaciones de CSP, que el SDK de
PayPal carga (`/donar` o un muro de pago) y que el `<script application/ld+json>`
lleva atributo `nonce`. Si algo fallara, el rollback es revertir el merge de la
rama `claude/m2-csp-nonces` (restaura el CSP estático con `unsafe-inline`).

> **Nota sobre `strict-dynamic`:** anula el allowlist de hosts (`'self'`,
> `https://www.paypal.com`) en navegadores CSP3. Funciona porque PayPal se carga
> vía `next/script` (`components/BotonesPayPal.tsx`), al que Next.js le propaga el
> nonce automáticamente al leerlo del header CSP de la request. Si en el futuro se
> añade un `<script src>` plano (sin `next/script` ni nonce), quedará bloqueado:
> usar `next/script` o añadirle el nonce manualmente.

### 🟡 Resiliencia (Fase 3, opcional)

- La home ya resiste hipos de DB gracias a `unstable_cache` (sirve datos cacheados).
- Falta `/api/health/deep` que chequee DB + Worker + Storage para detección de caídas.

### ⚠️ Caveat de entorno descubierto en sesión 18

El **entorno Preview de Vercel** parece NO tener `DATABASE_URL` (o no la misma que
Production). Síntoma: un build de preview que intente **prerender** de una página
con consulta Prisma falla con `Tenant or user not found`. **Producción NO tiene
este problema** (su `DATABASE_URL` funciona). Por eso el caching usa `unstable_cache`
con `force-dynamic` (sin prerender) en vez de ISR puro. Si en el futuro se quiere
ISR estático, primero **configurar `DATABASE_URL` en el entorno Preview** de Vercel.

### PROMPT para la próxima sesión IA

```
Continúa la resiliencia de rauldubon.org. Las sesiones 18–19 ya cerraron toda
la seguridad crítica/alta/media: RLS anon, streaming de archivos de pago,
timeouts externos, caching y M2 (CSP sin unsafe-inline con nonces por request).
Lee §18 de CLAUDE.md y docs/auditoria-seguridad-2026-06-02.md.

Primero (operativo, 2 min): verifica en producción que M2 no rompió nada —
abre el sitio, consola del navegador sin violaciones de CSP, que el SDK de
PayPal cargue (/donar o un muro de pago) y que el <script application/ld+json>
lleve atributo nonce. Si algo falla, revertir el merge de claude/m2-csp-nonces.

Tarea principal (Fase 3, resiliencia): añadir /api/health/deep que chequee
DB (Prisma) + Worker (sociologia) + Storage (Supabase) con timeouts, devolviendo
un JSON con el estado de cada dependencia. Proteger con HEALTH_TOKEN como
/api/health. Útil para detección de caídas.

Reglas: rama nueva, NO mergear a main sin mi OK explícito. Al terminar,
actualizar CLAUDE.md y este §18.
```

---

*Última actualización: 2026-06-03 (sesión 20 — INCIDENTE de pagos resuelto: los enlaces mágicos `/leer/*` y las páginas de éxito seteaban cookies durante el render de una página (prohibido en Next 15 → 500). Reparado: los 4 `/leer/*` ahora son Route Handlers que setean la cookie en la respuesta de redirección; las 4 páginas de éxito ya no setean cookie y envían el correo del enlace al completar el pago + enrutan el botón por `/leer/*`. Limpieza: eliminados los 4 `setearCookieAcceso*` (quedaron sin uso tras el refactor; sus call-sites se inlinearon en los Route Handlers). Nueva función admin "Reenviar enlace" en los **4 tipos** de venta (libros, artículos/compras, recursos, dashboards): botón en cada panel + endpoint `POST /api/admin/<panel>/[id]/reenviar` (reenvía al email del pedido, solo COMPLETADO, rate-limit 30/h, no devuelve el token). Rama de respaldo del incidente: `fix/incidente-pagos-sesion20`. Commits directos a `main`: `3dda7a0`, `df38836` (incidente), `9c680eb` (reenviar libros + limpieza) + commit de extensión a los otros 3 tipos. Pendiente: Fase 3 `/api/health/deep`.)*
*Sesión 19 — M2 cerrado: CSP sin `unsafe-inline` mediante nonces por petición [`middleware.ts` genera el nonce y construye el CSP dinámico en request+response; `JsonLd.tsx` async lee `x-nonce`; `next.config.mjs` ya no define CSP estático].*
*Sesión 18 — auditoría de seguridad: RLS anon cerrado [C1 crítico + H2 + H3], enumeración `datos` [L2], streaming de archivos de pago [H1/P1], timeouts externos [M1], hardening `req.json` [M4], caching con `unstable_cache` [Fase 3.3]. Caveat: el entorno Preview de Vercel no tiene `DATABASE_URL` — usar `unstable_cache`+`force-dynamic`, no ISR puro.*
*Commit activo en main: actualizar tras commit de sesión 20*
