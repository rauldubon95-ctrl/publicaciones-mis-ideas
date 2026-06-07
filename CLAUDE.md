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
| ✅ Next.js app | Producción | Vercel, `main`. **Next.js 16.2.7** (migrado sesión 24; Turbopack por defecto) + React 19.2.x. El middleware ahora es **`proxy.ts`** (renombrado oficial de Next 16; misma lógica CSP/nonce + guard `/api/admin` + anti-bot, runtime Node). |
| ✅ Cloudflare Worker `sociologia` | Producción | Auto-deploy via Git integration. root dir: `workers/sociologia`. 3 skills activas. Modelo de chat migrado sesión 22 a `@cf/meta/llama-3.1-8b-instruct-fast` (el anterior, `llama-3.1-8b-instruct`, descontinuado por Cloudflare el 2026-05-30). Constante única `CHAT_MODEL` en `src/config.ts`. |
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
| `HEALTH_TOKEN` | Token para `/api/health` y `/api/health/deep` con métricas completas | Recomendado |
| `CRON_SECRET` | Autentica el vigilante `/api/cron/health-check`. Vercel lo envía solo al cron diario. Sin él, el endpoint rechaza todo (401). Sesión 21. | Recomendado |
| `INTERNAL_EVENT_TOKEN` | Token interno para `/api/seguridad/evento` | Recomendado |
| `PREMIUM_TOKEN` | **ELIMINADO** 2026-05-24. No reconfigurar. | ❌ |
| `STRIPE_*` | **ELIMINADOS** sesión 12. Quitar de Vercel. | ❌ |

### Cloudflare Worker (`workers/sociologia/`)

| Variable/Binding | Tipo | Descripción |
|---|---|---|
| `DB` | D1 binding | `llm_sociolog` — ID en `wrangler.toml` |
| `RATE_LIMIT` | KV binding | Rate limiting + telemetría |
| `AI` | Workers AI binding | Chat: `@cf/meta/llama-3.1-8b-instruct-fast` (sesión 22; modelo central en `workers/sociologia/src/config.ts` → `CHAT_MODEL`). Embeddings: `@cf/baai/bge-large-en-v1.5` (Vectorize off). |
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

**Anti-reshare (sesión 20):** el acceso al PDF de pago **caduca a los 30 días** de la compra y permite **hasta 5 descargas** por pedido (constantes `VENTANA_ACCESO_DIAS`/`LIMITE_DESCARGAS` en `lib/accesoLibro.ts`). Campos `PedidoLibro.expiraAccesoAt` (se fija al completar el pago en la página de éxito y en el webhook) y `descargas` (lo incrementa atómicamente `consumirDescargaLibro` en el endpoint de descarga; el admin no consume tope). `expiraAccesoAt == null` = pedido **legacy** (comprado antes de la política): acceso permanente sin tope, para no romper a quien ya pagó. El magic link y `tieneAccesoLibro` rechazan si caducó; el endpoint de descarga redirige con `?acceso=caducado|limite` y la página del libro muestra un aviso. **El botón admin "Reenviar enlace" reinicia `descargas=0` y renueva `expiraAccesoAt`** (restaurar acceso a un comprador legítimo).

**Anti-reshare extendido (sesión 21):** la política se replicó al resto del contenido de pago con una **asimetría intencional** (constantes/helpers compartidos en `lib/accesoComun.ts`: `VENTANA_ACCESO_DIAS`, `LIMITE_DESCARGAS`, `nuevaExpiracionAcceso`, `dentroDeVentana`, `ResultadoDescarga`):
- **Libros** — leer == descargar → la ventana + tope rigen el acceso completo (como antes).
- **Recursos y dashboards** — la **LECTURA en pantalla queda permanente** (visor HTML / tabla + visor Office); **solo la descarga del archivo** caduca (30 d) + tope (5). Helpers `consumirDescargaRecurso`/`consumirDescargaDashboard`; los `tieneAccesoRecurso`/`tieneAccesoDashboard` de lectura NO cambian. Los endpoints `/api/recursos/[slug]/descargar` y `/api/dashboard/[id]/descargar` consumen y redirigen con `?acceso=caducado|limite` (la página muestra aviso; el comprador sigue leyendo en pantalla).
- **Artículos** — no hay archivo → **solo caduca la LECTURA** a 30 d (`tieneAccesoComprado` valida vigencia; `/leer/[token]` rechaza si caducó; aviso en `/publicaciones/[slug]`). Sin tope de descargas (`PedidoContenido` lleva `expiraAccesoAt` pero NO `descargas`).
- En los **4 tipos** se fija `expiraAccesoAt` al completar el pago (página de éxito + webhook) y **"Reenviar enlace"** renueva la ventana (y reinicia `descargas=0` donde aplica). `expiraAccesoAt=null` = legacy permanente. SQL: `migrations/sql/20260605_anti_reshare_recursos_dashboards_articulos.sql` (ya aplicada en Supabase, proyecto `yjgkhqapqiezvsrqoynl`; RLS intacto, 0 políticas).

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
| `/privacidad` | Aviso de privacidad (sesión 21). Enlazado en el Footer. |
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
| `app/api/health/deep/route.ts` | GET (sesión 20): health profundo — sondea DB+Worker+Storage con timeouts. `HEALTH_TOKEN`. 200 sano / 503 degradado. Lógica compartida en `lib/healthChecks.ts` (sesión 21) |
| `app/api/cron/health-check/route.ts` | GET (sesión 21): vigilante interno. Vercel Cron diario (vercel.json) → ejecuta `chequearDependencias()` → si algo falla, correo de alerta al admin (Resend). Auth con `CRON_SECRET`. Detecta fallos PARCIALES (no caída total → para eso, monitor externo). |
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
                  creadoAt, completadoAt?, ultimoAccesoAt?,
                  descargas (Int @default 0), expiraAccesoAt? (caducidad; null=legacy sin caducidad) [sesión 20]
PedidoRecurso   → (sesión 17) recursoId, emailComprador, nombreComprador?, montoCentavos, moneda,
                  paypalOrderId? (unique), estado, tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?,
                  descargas (Int @default 0), expiraAccesoAt? (caducidad SOLO de la descarga; null=legacy) [sesión 21]
PedidoDashboard → (sesión 17) tableroId, emailComprador, nombreComprador?, montoCentavos, moneda,
                  paypalOrderId? (unique), estado, tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?,
                  descargas (Int @default 0), expiraAccesoAt? (caducidad SOLO de la descarga; null=legacy) [sesión 21]
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
                  estado, tokenAcceso (unique cuid), creadoAt, completadoAt, ultimoAccesoAt,
                  expiraAccesoAt? (caducidad de la LECTURA; sin descargas — no hay archivo; null=legacy) [sesión 21]
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
| `dependabot.yml` (config, no workflow) | Mensual | Abre PRs con dependencias nuevas (web + worker + actions). Revisar con `docs/playbook-actualizacion-dependencias.md`. Sesión 21. |

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
| ~~4 vulnerabilidades npm moderadas~~ (**CERRADO sesión 23**) | Eran transitivas: `postcss` (vía `next`) + `uuid` (vía `exceljs`). Resueltas con `overrides` en `package.json` (sin tocar Next ni exceljs, sin `audit fix --force`): override anidado `next > postcss` `^8.5.10` + `uuid` `^11.1.1`. `npm audit` = 0. Verificado: exceljs usa `{v4}` (estable en uuid v11) sin buffer. Si algún `npm update`/major futuro reintroduce alertas, mismo patrón. | ~~Media~~ |
| IP cruda en rate-limit (sesión 21) | `RateLimitDb.clave` = `"IP:ruta"` guarda IP real (transitoria, fin anti-abuso legítimo). El resto de IPs van cifradas (`ipHash`). Purista: hashear también la clave. | Baja |
| Archivos `_test_*.png` en bucket `comics` (sesión 21) | **Causa raíz CORREGIDA sesión 24**: `app/api/admin/setup-storage/route.ts` subía `_test_${Date.now()}.png` y al limpiar llamaba `Date.now()` otra vez → borraba un nombre distinto y dejaba el real huérfano. Ahora el nombre se calcula una vez (`nombrePrueba`) y se reutiliza. Quedan **12 archivos viejos** (70 bytes c/u) en la raíz del bucket que hay que borrar **a mano desde el Dashboard de Supabase** (Storage exige la Storage API + service role; no se puede por SQL ni desde el contenedor IA, que no tiene la clave). | Baja |
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
11. **`FormularioDonacion.tsx` es el componente activo de donaciones** (`BotonesPayPal.tsx` se eliminó en sesión 27 por estar sin uso). Montos $3/$5/$10/$25 + personalizado. Todos los pagos usan redirección a PayPal (Orders API), sin SDK JS en el cliente.
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
> `https://www.paypal.com`) en navegadores CSP3. **Actualización sesión 27:** ya
> NO se carga ningún SDK JS de PayPal en el cliente — los pagos (donaciones,
> artículos, libros, recursos, dashboards) usan el patrón de **redirección**
> (`window.location.href = data.url` de los endpoints `*/comprar`/`/checkout`,
> Orders API). El componente `BotonesPayPal.tsx` (viejo enfoque "hosted buttons"
> vía `next/script`) **se eliminó por estar sin uso (0 imports)**. El
> `script-src ... https://www.paypal.com` queda en el CSP como inofensivo. Si en
> el futuro se añade un `<script src>` plano (sin `next/script` ni nonce),
> quedará bloqueado por `strict-dynamic`: usar `next/script` o añadirle el nonce.

### ✅ Resiliencia (Fase 3) — CERRADO sesión 20

- La home ya resiste hipos de DB gracias a `unstable_cache` (sirve datos cacheados).
- **`/api/health/deep`** (sesión 20): sondea DB (Prisma `SELECT 1`) + Worker (`/telemetria` GET → 401 = vivo) + Storage (Supabase `listBuckets`), cada uno con timeout 5s y latencia. Solo lectura, protegido con `HEALTH_TOKEN` (sin token válido → 200 mínimo). Devuelve `200` si todo sano o `503` si algo falla, con detalle por dependencia. Útil para alertas de uptime.

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

*Última actualización: 2026-06-05 (sesión 21 — **rama `claude/affectionate-curie-OycfO`, TODO MERGEADO A MAIN** [commits `d22d154`, `59fd6d7`, `b9bf583` + este de docs; punto de restauración previo: `e2b48cd`]. **B — anti-reshare extendido** a recursos, dashboards y artículos premium, con asimetría intencional: en recursos/dashboards la lectura en pantalla queda permanente y solo la **descarga del archivo** caduca (30 d) + tope (5); en artículos (sin archivo) caduca **solo la lectura**. Constantes/helpers compartidos en nuevo `lib/accesoComun.ts` (`accesoLibro.ts` ahora los reexporta). Nuevos `consumirDescargaRecurso`/`consumirDescargaDashboard`; `tieneAccesoComprado` valida vigencia. Migración Supabase additive `anti_reshare_recursos_dashboards_articulos` (proyecto `yjgkhqapqiezvsrqoynl`) — **RLS verificado intacto, 0 políticas, C1 no reabierto**; SQL en `migrations/sql/20260605_anti_reshare_recursos_dashboards_articulos.sql`. **D — Resend perezoso**: `getResend()` lazy → `next build` deja de fallar sin `RESEND_API_KEY`. **Métrica Storage corregida**: `/admin/metricas` ahora suma los 3 buckets recorriendo subcarpetas (antes solo la raíz de `comics` → contaba basura `_test_*` e ignoraba `libros`/`datos`). Uso real ~38.6 MB/1 GB. **Vigilante interno**: `/api/cron/health-check` (Vercel Cron diario, `vercel.json`) → `lib/healthChecks.ts` (extraído de `/api/health/deep`) → correo de alerta Resend si DB/Worker/Storage fallan; auth `CRON_SECRET`. Detecta fallos PARCIALES (caída total → monitor externo). **Privacidad**: nueva `/privacidad` (aviso redactado según lo que recoge el sitio) + enlace en Footer. **Dependabot** (`.github/dependabot.yml`, mensual, web+worker+actions) + **`docs/playbook-actualizacion-dependencias.md`** (proceso quirúrgico). `tsc`+`build` limpios en cada merge. PENDIENTES del usuario: configurar `CRON_SECRET` (+ opcional `HEALTH_TOKEN`) en Vercel; ~~migración modelo IA `@cf/meta/llama-3.1-8b-instruct`~~ (**HECHA en sesión 22**, ver pie abajo). Frentes conceptuales sin cubrir: E (seguridad a fondo), F (despliegue).)*
*Sesión 22 — **Migración del modelo de IA del Worker** [rama `claude/upbeat-ride-bguIl`, **NO mergeada a main todavía** — esperando OK del usuario porque el merge dispara el auto-deploy del Worker en Cloudflare]. Cloudflare descontinuó `@cf/meta/llama-3.1-8b-instruct` el 2026-05-30 (ya vencido). Reemplazo elegido por prioridad de **coste gratis**: `@cf/meta/llama-3.1-8b-instruct-fast` — misma familia Llama 3.1 8B (variante "fast" que sigue vigente), la más barata en neuronas (~40 neuronas/consulta → ~250 consultas/día dentro del regalo gratis de 10.000 neuronas/día), mismo formato de respuesta (los encabezados `**ANÁLISIS:**`/`**CITAS:**` que parsea el código no cambian), contexto 128k tokens (antes 8k). **Refactor**: nombre del modelo centralizado en `workers/sociologia/src/config.ts` → `export const CHAT_MODEL` (antes estaba duplicado en `index.ts` + las 3 skills). `index.ts` y las 3 skills ahora importan `CHAT_MODEL`. `npx tsc --noEmit` + `npx wrangler deploy --dry-run` limpios. Embeddings (`@cf/baai/bge-large-en-v1.5`) NO se tocaron (Vectorize sigue off; secundario). **PENDIENTE tras el OK de merge**: verificar en producción que el chat responde bien con RAG + las 3 skills, y que `/admin/observabilidad` sigue recibiendo telemetría (requiere `D1_SYNC_SECRET` igual en Vercel y Worker). Opciones de mayor calidad descartadas por coste: Llama 3.3 70B (~40 consultas/día gratis) y GLM-4.7 Flash.)*
*Sesión 23 — **Cierre de las 4 vulnerabilidades npm moderadas** [rama `claude/fix-vulnerabilidades-npm`, **NO mergeada a main hasta OK del usuario + Preview verde**]. Técnica conservadora con `overrides` en `package.json` (sin tocar Next ni exceljs, sin `npm audit fix --force` que degradaría a Next 9/exceljs 3): override anidado `next > postcss: ^8.5.10` (el postcss de nivel raíz ya estaba en 8.5.15; solo el interno de Next seguía en 8.4.31 — XSS GHSA-qx2v-qp2m-jg93, solo build) + `uuid: ^11.1.1` global (exceljs traía 8.3.2 — bounds check GHSA-w5hq-g745-h8pq). **Verificado que el override de uuid NO rompe exceljs**: importa `const {v4} = require('uuid')` (export estable en v11) y llama `uuidv4()` sin buffer (el parámetro vulnerable → la app ni siquiera era explotable). El override de postcss requirió reinstalación limpia (`rm -rf node_modules package-lock.json && npm install`) porque npm no aplica overrides a deps clavadas en exacto en instalación incremental. **Diff mínimo**: package.json +6 líneas, lockfile 41 líneas, cero deriva de otras deps. Gates: `npm audit`=0, `tsc` limpio, `next build` exitoso. Falta: confirmar Preview de Vercel verde antes de mergear. Rollback = revertir el commit del fix. Criterio cumplido: producción no cae (doble red local + Preview).)*
*Sesión 24 — **Limpieza + majors aplazados** [todo MERGEADO A MAIN con OK del usuario + Preview/logs verdes]. (1) **Bug `_test_*.png`**: `app/api/admin/setup-storage/route.ts` recalculaba `Date.now()` al limpiar → dejaba huérfana la imagen de prueba (commit `b4d5dcf`). Corregido (nombre calculado una vez). Los 12 archivos viejos los borró el usuario a mano desde el Dashboard de Supabase (verificado: 0 restantes, 11 cómics intactos). (2) **Next 15→16** (commit `0a0e6c7`): `next ^16.2.0` (Turbopack por defecto); `middleware.ts` → **`proxy.ts`** (`export function proxy`, renombrado oficial de Next 16, runtime Node — relaja restricciones Edge; CSP/nonce + guard `/api/admin` + anti-bot SIN cambios funcionales); `app/globals.css` mueve el `@import` de fuentes al inicio (parser CSS estricto de Turbopack lo exige); `tsconfig.json` auto-actualizado por Next 16 (`jsx: react-jsx` + tipos turbopack); `eslint-config-next` se queda en v15 a propósito (la v16 exige ESLint 9/flat-config = otro major; el lint ya no corre en el build). `tsc`+`build`+`audit`(0) limpios. **Verificación**: Preview no renderiza páginas con DB (limitación conocida §18: Preview sin `DATABASE_URL` → `PrismaClientInitializationError`; NO es bug de Next 16); se verificó PayPal/CSP en Preview con `/donar` y `/privacidad` (sin DB) + **logs de producción: todas las rutas, incl. home y DB, responden 200, 0 errores**. NOTA para sesiones IA: el contenedor IA NO puede hacer `curl` a `rauldubon.org` (política de red `host_not_allowed`); verificar producción vía `mcp__Vercel__get_runtime_logs`, no curl. (3) **Tailwind 3→4** (commit `49d96ce`): migrado con el codemod oficial `@tailwindcss/upgrade`. `tailwindcss ^4.3.0` + nuevo `@tailwindcss/postcss`; `autoprefixer` eliminado (v4 lo hace interno); `postcss.config.mjs` usa `@tailwindcss/postcss`. **`tailwind.config.ts` ELIMINADO**: en v4 la config vive en el CSS y el contenido se detecta automáticamente. `app/globals.css`: `@tailwind base/components/utilities` → `@import "tailwindcss"`; paleta `brand` + fuentes a `@theme` (CSS vars `--color-brand-*`, `--font-sans/serif`); clases propias (`.btn-*/.card/.badge/.input`) a `@utility`; **capa de compat del color de borde** (gray-200) añadida por el codemod para conservar el look v3. **AJUSTE MANUAL CLAVE**: el codemod borró el `tailwind.config.ts` que cargaba el plugin de tipografía → reinstaurado con `@plugin "@tailwindcss/typography";` en globals.css (sin esto las clases `prose` de artículos/recursos/dashboard/privacidad/PDF quedaban sin formato) + bump a `@tailwindcss/typography ^0.5.16` (compat v4). 42 `.tsx` con renombres seguros 1-a-1 (`rounded`→`rounded-sm`, `outline-none`→`outline-hidden`, `shadow`→`shadow-sm`, `flex-shrink-0`→`shrink-0`). **Verificación**: `tsc`+`build`(Turbopack)+`audit`(0) limpios; CSS generado (75 KB) contiene brand-700/.prose/utilidades/Lora/compat-bordes; usuario verificó `/privacidad` (prose) y `/donar` (forms/botones) en Preview; logs de producción verdes. **Riesgo residual**: cambios visuales por defecto de v4 que el codemod no cubre (placeholder, cursor de botón, hover en táctil) — revisión visual del sitio completo en producción. MAJORS que SIGUEN aplazados tras esta sesión: react-markdown 9→10, @types/node 20→25, wrangler 3→4, typescript 5→6 (worker). Nota: el `lint` script sigue como `next lint` (removido en Next 16) pero no corre en el build; migrar a `eslint .` cuando se haga ESLint 9.)*
*Sesión 21 (cont.) — **Actualización de dependencias ejecutando el playbook** [commits `9b3e365`, `b043605`, `9a906cb`, `f27091a`, todo en `main`]. `npm update` dentro de rango (web): react/react-dom 19.1→19.2.7, @supabase/supabase-js 2.106→2.107, postcss al día + parches; `@types/react`/`@types/react-dom` subidos a v19 (coincidían con react 19). Worker: `@cloudflare/workers-types`+typescript dentro de rango (wrangler se queda en 3.x). GitHub Actions `checkout`/`setup-node` v4→**v6** en los 3 workflows. Verificado: `tsc`+`build`+`tsc` worker limpios, **Preview de la rama READY** antes de mergear. **MAJORS APLAZADOS** (hacer en sesión dedicada con el playbook; Dependabot los ignora): Next 15→16, Tailwind 3→4, react-markdown 9→10, @types/node 20→25, wrangler 3→4, typescript 5→6 (worker). Las 4 vulnerabilidades npm moderadas persisten (viven dentro de `next`/`exceljs`; se cierran al hacer esos majors). **Dependabot afinado**: regla `ignore` de semver-major en ambos ecosistemas npm (`.github/dependabot.yml`) → solo propone parches/menores. Se cerraron los 11 PRs de su primera corrida (2 rotos: Next16/Tailwind4; el resto ya aplicado o aplazado). **Footer**: el enlace `/privacidad` pasó de `zinc-300` (casi invisible) a `zinc-500`+subrayado (visible). Bandeja de PRs limpia (0 abiertos). Dominio `rauldubon.org` confirmado conectado a Vercel.)*
*Sesión 20 — INCIDENTE de pagos resuelto: los enlaces mágicos `/leer/*` y las páginas de éxito seteaban cookies durante el render de una página (prohibido en Next 15 → 500). Reparado: los 4 `/leer/*` ahora son Route Handlers que setean la cookie en la respuesta de redirección; las 4 páginas de éxito ya no setean cookie y envían el correo del enlace al completar el pago + enrutan el botón por `/leer/*`. Limpieza: eliminados los 4 `setearCookieAcceso*` (quedaron sin uso tras el refactor; sus call-sites se inlinearon en los Route Handlers). Nueva función admin "Reenviar enlace" en los **4 tipos** de venta (libros, artículos/compras, recursos, dashboards): botón en cada panel + endpoint `POST /api/admin/<panel>/[id]/reenviar` (reenvía al email del pedido, solo COMPLETADO, rate-limit 30/h, no devuelve el token). Rama de respaldo del incidente: `fix/incidente-pagos-sesion20`. Commits directos a `main`: `3dda7a0`, `df38836` (incidente), `9c680eb` (reenviar libros + limpieza), `fdd838c` (reenviar artículos/recursos/dashboards). **Anti-reshare de libros PDF**: caducidad 30 días + tope 5 descargas por pedido (`PedidoLibro.expiraAccesoAt`/`descargas`, migración Supabase `pedidolibro_caducidad_y_tope_descargas`; lógica en `lib/accesoLibro.ts` → `consumirDescargaLibro`; legacy con `expiraAccesoAt=null` = acceso permanente; "Reenviar enlace" reinicia tope y renueva ventana). Ver §7. **Fase 3 (resiliencia) cerrada:** `/api/health/deep` sondea DB+Worker+Storage con timeouts (solo lectura, `HEALTH_TOKEN`, 200/503). Auditoría de seguridad+resiliencia completa.)*
*Sesión 19 — M2 cerrado: CSP sin `unsafe-inline` mediante nonces por petición [`middleware.ts` genera el nonce y construye el CSP dinámico en request+response; `JsonLd.tsx` async lee `x-nonce`; `next.config.mjs` ya no define CSP estático].*
*Sesión 18 — auditoría de seguridad: RLS anon cerrado [C1 crítico + H2 + H3], enumeración `datos` [L2], streaming de archivos de pago [H1/P1], timeouts externos [M1], hardening `req.json` [M4], caching con `unstable_cache` [Fase 3.3]. Caveat: el entorno Preview de Vercel no tiene `DATABASE_URL` — usar `unstable_cache`+`force-dynamic`, no ISR puro.*
*Commit activo en main: sesión 20 — reenvío de enlaces (4 tipos) + anti-reshare de libros PDF (caducidad + tope de descargas) + este commit de docs*
*Sesión 27 — **Panel de Monetización + Novedades en home + limpieza de zombie** [rama `claude/monetizacion-novedades`]. Implementa 2 de las 3 funciones del roadmap (la membresía premium queda para después). (1) **Panel de Monetización unificado**: nueva página `/admin/monetizacion` (client) + endpoint agregador `/api/admin/monetizacion` que reúne los 5 flujos (artículos/libros/recursos/dashboards/donaciones) con Prisma → KPI global (total recaudado + nº transacciones), tarjetas por tipo (enlazan al detalle), y feed unificado de transacciones recientes con filtro por tipo. **En `/admin` se reemplazaron los 5 iconos de venta por 1 solo "Monetización"** (declutter); los paneles de detalle (`/admin/compras`, `/admin/ventas-*`, `/admin/donaciones`) siguen existiendo y se enlazan desde la vista unificada. NOTA: `Donacion` usa `monto` (no `montoCentavos`) y `correo`/`nombre` (no `emailComprador`). (2) **Novedades en la home**: nuevo modelo `Novedad` (titulo, textoCorto?, url, tipo [articulo/conferencia/aviso], activo, orden, `expiraAt`, creadoAt) — migración Supabase `novedades` **aplicada a prod** con RLS deny-by-default (sin políticas; SQL en `migrations/sql/20260606_novedades.sql`). CRUD admin en `/admin/novedades` + endpoints `/api/admin/novedades` (GET/POST) y `/[id]` (PUT/DELETE), con validación de URL http(s) y tipos. Render en `components/NovedadesSidebar.tsx` (server, enlaces externos `rel="noopener nofollow"`). **Home (`app/page.tsx`)**: `getNovedades` (solo página 1, activas y no caducadas, máx 5); layout de **2 columnas solo si hay novedades** → **cero cambio visual hasta que se añada una**. **FIX inmediato sesión 27 (cont.):** (a) `getNovedades` pasó de `unstable_cache` (revalidate 300) a **consulta directa sin caché** → un aviso recién creado aparece al instante (antes ≤5 min; el usuario reportó "añadí uno y no aparece"). Query diminuta (≤5 filas, indexada) y la home ya es dinámica → coste nulo. (b) El panel pasó de **solo escritorio** (`hidden lg:block`) a visible también en móvil: sidebar slim a la izquierda en `lg+`, y **bloque compacto arriba** (`lg:hidden`) en pantallas chicas. Verificado en DB que la novedad estaba OK (activa, no caducada); el problema era 100% front (caché + breakpoint). (3) **Limpieza de zombie**: eliminado `components/BotonesPayPal.tsx` (viejo "hosted buttons" vía `next/script`, **0 imports** — confirmado por grep; los pagos usan redirección Orders API, no SDK cliente). Corregidas las menciones desactualizadas en CLAUDE.md (regla #11 + nota §M2 strict-dynamic que afirmaban que PayPal cargaba vía ese componente). El escaneo de `components/` y `lib/` no encontró otros zombies. `config/prompts/system/` se dejó intacto (deuda documentada, adyacente al worker). Gates: `tsc`+`build`(Turbopack) limpios. Verificación: Preview no sirve páginas con DB (caveat §18) → se valida con build local + logs de producción tras merge.*
*ROADMAP próxima(s) sesión(es) — **3 funciones acordadas con el usuario (sesión 26)**. NOTA sesión 27: (1) novedades y (2) monetización YA IMPLEMENTADAS; queda (3) membresía. (1) **Panel lateral de novedades en la home (izquierda)**: columna delgada para "anuncios" curados — enlaces a artículos académicos externos (solo redirección, no contenido alojado) + avisos tipo "estoy en tal conferencia". Requisito clave: **NO saturar**. Propuesta: nuevo modelo admin `Anuncio`/`Novedad` (titulo, textoCorto?, url externa, tipo [articulo-externo/conferencia/aviso], activo, `expiraAt` para auto-caducar, orden); render en sidebar slim en desktop que en móvil colapsa debajo del contenido (responsive = no satura pantallas chicas); limitar a 3-5 activos; enlaces externos `rel="noopener nofollow"`. CRUD admin. La auto-caducidad por fecha es lo que evita la saturación. (2) **Unificar paneles de venta en uno**: hoy hay iconos separados en `/admin` (ventas-libros, ventas-recursos, ventas-dashboards, compras [artículos], donaciones). El usuario quiere **un solo icono "Monetización"** que abra una vista única con TODO lo que monetiza. Propuesta: nueva página `/admin/monetizacion` con KPI global (total recaudado por tipo + suma) + feed unificado de transacciones recientes con filtros (tipo, fecha) + export CSV para contabilidad; reutiliza los endpoints `/api/admin/ventas-*` + compras + donaciones (additive, bajo riesgo); reemplaza los 5 iconos por 1 (declutter del grid admin). (3) **Membresía / suscripción (escalado, OPCIONAL)**: suscripción gratis = la lista de correo actual (se queda gratis); **membresía de pago** vía PayPal Subscriptions (recurrente, MRR). Desbloquea contenido que el usuario irá añadiendo: una **biblioteca virtual** members-only y —como gran gancho premium— el **asistente IA con Vectorize** (retrieval semántico, hoy off en `wrangler.toml`). Orden sugerido: (a) Vectorize primero (mejora la IA, candidata a perk premium), (b) plomería de suscripción/estado de membresía, (c) sección biblioteca members-only. Reutiliza el motor de pagos + cookies de acceso + patrones de CRUD ya existentes. Mantener: grandfathering de compradores de pago único; precio mensual vs anual. Todo esto se reutiliza de infraestructura ya construida; NADA toca lo que ya funciona.*
*Sesión 26 (cont.) — **Paginación del panel admin + factorización de los 4 Muros** [ramas `claude/admin-paginacion` y `claude/factor-muros`, **MERGEADAS A MAIN** con OK del usuario → producción verde (logs: `/admin`, `/api/admin/publicaciones`, `/recursos/*`, `/` todos 200, 0 errores)]. Nota: el Preview de Vercel NO pudo verificar estas páginas porque no tiene `DATABASE_URL` (confirmado en logs: hasta la home falla con `PrismaClientInitializationError` en Preview — es el caveat §18, no un bug). Se verificó con build local verde + logs de producción. (1) **Paginación**: `GET /api/admin/publicaciones` ahora `?page`+`?pageSize` (máx 50) y devuelve `{items,total,page,pageSize}` con skip/take; `/admin` con botones Anterior/Siguiente (20/pág). Solo visible cuando hay >20 publicaciones (≤20 = una página, sin botones; comportamiento correcto). (2) **Muros**: nuevo `components/MuroPagoBase.tsx` con toda la lógica/markup; `MuroPago/MuroLibro/MuroRecurso/MuroDashboard` quedan como envoltorios de ~24 líneas (597→287 líneas, call sites intactos, cero cambio visual). PR aislada (regla #19).*
*Sesión 26 — **Resiliencia técnica + seguridad menor (sin romper producción)** [rama `claude/hopeful-cray-IiAr7`, MERGEADA a main → producción]. Resuelve los pendientes técnicos de la auditoría sesión 25 que NO requieren cambios de producto. (1) **Anti-OOM en descargas**: `app/api/libros/[slug]/descargar` y `app/api/dashboard/[id]/descargar` cambian `Buffer.from(await blob.arrayBuffer())` → `blob.stream()` (Content-Length de `blob.size`): elimina la segunda copia del archivo en RAM (pico ~½). **CORRECCIÓN de doc**: el §18 H1 decía "stream" pero en realidad bufferizaba; ahora es literal. Y `app/api/recursos/[slug]/descargar` **NO usa bucket** — sirve `recurso.contenido` (HTML desde la DB), así que nunca tuvo problema de OOM (el informe sesión 25 decía "3 rutas"; son 2). (2) **Resiliencia**: `/api/admin/metricas` envuelve sus 18 queries + recorrido recursivo de Storage en `unstable_cache` (revalida 120 s, tag `metricas`; la auth queda fuera del caché) → de 3-8 s por visita a casi instantáneo; `/api/admin/publicaciones` pasa de `include` (traía el `contenido` completo de cada artículo) a `select` de solo los 7 campos que usa el panel → payload mínimo, misma forma de respuesta (array). (3) **Seguridad**: M1 — `lib/paypal.ts` deja de loguear/propagar el `body` de errores de PayPal (solo status); W1 — eliminada la política RLS `insercion_publica_cotizacion` (INSERT anónimo `WITH CHECK true` en `SolicitudCotizacion`, vector de spam vía PostgREST). La app crea cotizaciones con Prisma (bypassa RLS), no dependía de la policy. SQL en `migrations/sql/20260606_w1_drop_insert_anon_cotizacion.sql`, **aplicada a prod**; advisor de seguridad confirma WARN `rls_policy_always_true` cerrado (queda solo INFO deny-by-default). (4) **DECISIÓN**: NO se tocó el rate-limit del Worker (`workers/sociologia/src/ratelimit.ts`). La "caché en memoria + fallback KV" que sugería el agente NO encaja en Workers: la memoria es por-isolate (no compartida entre los cientos de isolates) → subcontaría el límite y debilitaría el control; el fail-close ante caída de KV es la decisión segura correcta. Gates: `tsc`+`build`(Turbopack)+`audit`(0) limpios. PENDIENTES que requieren decisión de producto/UI (no hechos): paginación real del panel admin (necesita UI; el `select` ya mitiga el coste), factorizar los 4 Muros, BreadcrumbList/Organization JSON-LD, Vectorize, suscripción recurrente PayPal (MRR), GEO.*
*Sesión 25 — **Auditoría integral + blindaje de cadena de suministro + quick wins** [**MERGEADO A MAIN** con OK del usuario + Preview READY verde → desplegado a producción]. (1) **Informe 360°** en `docs/auditoria-integral-2026-06-06.md` (seguridad, vulnerabilidades, supply chain, estrés/escala, rendimiento, arquitectura, microservicio, SEO, escalado+monetización). Datos en vivo: Supabase advisors + Vercel logs (0 errores/7d) + `npm audit`=0. Veredicto: seguro y maduro; 0 críticos/altos. (2) **Cadena de suministro**: `vercel.json` install `npm install`→**`npm ci`** (instala exactamente el lockfile); nuevo **`.npmrc`** (engine-strict, save-exact, fund off; NO ignore-scripts global — rompería esbuild/prisma); **cooldown de 7 días** en Dependabot (npm web+worker) anti-versión-secuestrada; nuevo workflow **`.github/workflows/supply-chain.yml`** (gate en PR: `npm ci --ignore-scripts` + `npm audit --audit-level=high` bloqueante + `npm audit signatures` informativo, web+worker). (3) **Quick wins SEO/perf**: fuentes migradas de `@import` Google a **`next/font`** (Inter+Lora self-hosted, −300-500ms TTFB; `globals.css` apunta `--font-sans/serif` a `var(--font-inter/lora)`); **og:image fallback** en publicaciones/recursos/cómics/libros vía nuevo helper `ogImagenes()` en `lib/seo.ts` (cómics y libros sin portada ahora emiten preview; twitter card siempre `summary_large_image`). (4) **Índices FK** (advisor Supabase): migración `migrations/sql/20260606_indices_foreign_keys.sql` **aplicada a prod** (`Publicacion.categoriaId`, `PublicacionEtiqueta.etiquetaId`, `DescargaLibro.libroId` — este último tenía deriva schema↔DB) + `@@index` en `schema.prisma`. **DECISIÓN: NO se quitaron los `force-dynamic`** que recomendaba el agente SEO — el §18 advierte que el Preview de Vercel no tiene `DATABASE_URL` y el prerender fallaría; el build local confirmó que funciona *porque* siguen dinámicos. Prerrequisito para ISR: configurar `DATABASE_URL` en Preview primero. Gates: `tsc`+`build`(Turbopack)+`audit`(0) limpios. PENDIENTES sugeridos al usuario (en el informe §10): stream/signed-URL en descargas (riesgo OOM #1 a escala), cache de `/api/admin/metricas`, paginar `/api/admin/publicaciones`, factorizar los 4 Muros, suscripción recurrente PayPal (MRR) + GEO. Frentes de monetización detallados en §9 del informe.*
