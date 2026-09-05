# CLAUDE.md — Contexto de sesión para desarrollo asistido por IA

Este archivo es la fuente de verdad para cualquier sesión IA nueva.
Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. Qué es este proyecto

Plataforma académica personal de Raúl Dubón. Publicaciones, recursos, cómics y un asistente de IA sobre ciencias sociales latinoamericanas.

**Dominio:** `rauldubon.org` (comprado en Cloudflare, conectado a Vercel — confirmado sesión 21)
**Marca:** "Raúl Dubón" — aplicada en layout, Header, Footer, AsistenteChat, Worker CORS, metadata.

**Stack (verificado sesión 34, 2026-09-05):**
- Frontend: **Next.js 16.2.9** + **React 19.2.8** (App Router, Turbopack) desplegado en Vercel
- Runtime Node: **24.x** (subido desde 20.x en sesión 31; Node 20 se depreca 2026-10-01)
- CSS: **Tailwind 4.3.1** (sin `tailwind.config.ts`; tokens en `@theme` dentro de `globals.css`; plugin de typography)
- Base de datos principal: PostgreSQL en Supabase, accedida vía Prisma 5.14
- Storage: Supabase Storage — bucket `comics` (imágenes cómics + PDFs) + bucket `libros` (PDFs y portadas) + bucket `datos` (dashboards Excel)
- IA: Cloudflare Worker (`workers/sociologia/`) con D1 + KV + Workers AI. Wrangler 4.118 (subido desde 3.80 en sesión 31)
- Visor PDF: `pdfjs-dist@^4.10.38` (Mozilla, con fix CVE-2024-4367)

**Repositorio:** `rauldubon95-ctrl/publicaciones-mis-ideas`
**Rama de desarrollo activa:** ver `git branch --show-current` al inicio de cada sesión

---

## 2. Estado actual por componente

| Componente | Estado | Notas |
|---|---|---|
| ✅ Next.js app | Producción | Vercel, `main`. **Next.js 16.2.9** (migrado a la línea 16 en sesión 24; Turbopack por defecto) + React 19.2.x + **Tailwind 4.3.1**. El middleware ahora es **`proxy.ts`** (renombrado oficial de Next 16; misma lógica CSP/nonce + guard `/api/admin` + anti-bot, runtime Node). |
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

> **Auditado sesión 34 (2026-09-05) contra el código real.** Solo lista lo que
> queda pendiente. El histórico de deuda cerrada se resume debajo.

### Pendiente

| Item | Detalle | Prioridad |
|---|---|---|
| Más limpieza corpus D1 | 804 documentos en `documentos` (D1 `llm_sociolog`). Sigue habiendo textos de baja calidad. Impacta directo en la calidad del asistente. | Alta |
| Vectorize desactivado | Retrieval sigue en FTS5 + LIKE (`workers/sociologia/src/retrieval.ts`). El binding `[[vectorize]]` está comentado en `wrangler.toml` línea 17. Requiere `wrangler vectorize create sociologia-embeddings` + pipeline de embeddings + backfill del corpus. **Prerrequisito para membresía premium.** | Media |
| Asistente IA sin razonamiento multi-paso | El Worker hace una sola pasada RAG→skill→LLM por request. Para consultas complejas ("compara X e Y") el usuario pidió encadenar pasos. Ver §17. | Media (objetivo del usuario) |
| Telemetría en KV (no D1) | Datos duran 7 días. Dashboard persistente requeriría escribir a `documentos_telemetria` en D1. Aceptable mientras el uso sea bajo. | Media |
| IP cruda en rate-limit | `RateLimitDb.clave` = `"IP:ruta"` guarda IP real (transitoria, fin anti-abuso legítimo). El resto de IPs van cifradas (`ipHash`). Purista: hashear también la clave. Sin exposición externa. | Baja |
| Campo `stripeId` en `Donacion` | Nombre legacy: hoy guarda `paypalOrderId`. Renombrar requiere migración Supabase + Prisma + toque en 4 archivos. Solo cosmético. | Baja |
| CF_API_TOKEN con restricción IP | GitHub Action `deploy-worker.yml` no puede deployar Worker desde CI (falla en el token). Cloudflare Git integration lo cubre. Sin remedio hasta que la IP del runner esté fija. | Baja |
| Office Online iframe en `/dashboard/[id]` | Un comprador con acceso puede copiar la URL del Excel del iframe (`view.officeapps.live.com/op/embed.aspx?src=...`). El bucket ya no es enumerable → URL no descubrible sin acceso. Cerrarlo del todo = privatizar `datos` + signed URLs (frágil con Office Online). Decisión de producto. | Baja |
| Residual estético del rediseño (sesión 32) | Cambios de default v4 de Tailwind no cubiertos por codemod (placeholder, cursor botón, hover en táctil). Revisión visual del sitio completo en producción está aún sin hacer sistemáticamente. | Baja |
| Portada automática de cómics-PDF | Sesión 32 introdujo PDFs como cómics. Portada es placeholder editorial hasta que se implemente extracción de página 1 con `pdfjs-dist` server-side + campos nuevos en `Comic`. | Baja |
| URL `/dashboard/[id]` con param que en realidad es slug | Confunde al leer (folder `[id]` pero valor es slug). Renombrar cambia el path interno, no rompe URLs públicas. Solo cosmético. | Baja |
| Multi-worker / orquestación | Ver §17. Solo existe 1 worker. Pendiente hasta tener casos reales de consultas multi-paso. | Futura |

### Cerrado (histórico condensado)

- **CSP sin `unsafe-inline`** (sesión 19 M2) — nonce por request en `proxy.ts` + `strict-dynamic`.
- **RLS anon abierta** (sesión 18 C1/H2/H3) — políticas `FOR ALL USING(true)` eliminadas; buckets sin INSERT/DELETE anónimo.
- **Streaming de archivos de pago** (sesión 18 H1, refinado sesión 26) — `/api/libros/[slug]/descargar` y `/api/dashboard/[id]/descargar` hacen `blob.stream()`; la URL del bucket nunca llega al cliente.
- **Timeouts + hardening `req.json`** (sesión 18 M1/M4) — `fetchConTimeout` en llamadas externas.
- **4 vulnerabilidades npm moderadas** (sesión 23) — `overrides` postcss + uuid.
- **Migración Next 15→16** (sesión 24) — `middleware.ts` → `proxy.ts`, Turbopack por defecto.
- **Migración Tailwind 3→4** (sesión 24) — sin `tailwind.config.ts`, tokens en `@theme`.
- **Modelo IA descontinuado** (sesión 22) — migración a `llama-3.1-8b-instruct-fast`, constante `CHAT_MODEL` central.
- **Anti-reshare** (sesiones 20/21) — caducidad 30 días + tope 5 descargas en las 4 rutas de pago con asimetría (libros = leer+descargar; recursos/dashboards = solo descarga; artículos = solo lectura).
- **Incidente cookies en render** (sesión 20) — `/leer/*` pasaron a Route Handlers.
- **Vigilante interno** (sesión 21) — `/api/cron/health-check` diario con Resend.
- **Botones "Reenviar enlace"** (sesión 20) — en los 4 paneles admin de ventas.
- **Health profundo** (sesión 20) — `/api/health/deep` sondea DB + Worker + Storage.
- **Caching admin** (sesión 26) — `unstable_cache` en `/api/admin/metricas` + `select` mínimo en `/api/admin/publicaciones`.
- **Paginación admin** (sesión 26) — `/admin` pagina 20/pág con `?page`+`?pageSize`.
- **Factorización de los 4 muros** (sesión 26) — `components/MuroPagoBase.tsx` centraliza lógica.
- **Auditoría integral 360°** (sesión 25) — informe en `docs/auditoria-integral-2026-06-06.md`; `next/font` self-hosted, índices FK, `npm ci` + cooldown Dependabot + gate supply-chain en CI.
- **Hardening exhaustivo** (sesión 28) — C1 (token premium con TTL 1h), H1-H4 (proxy criptográfico, secreto único, WORKER_URL en env, rate-limit por email), M1-M5, B1-B5.
- **`config/prompts/v1.1.txt`** (sesión 28) — eliminado (0 imports).
- **`BotonesPayPal.tsx`** (sesión 27) — eliminado (0 imports).
- **Novedades + Monetización unificados** (sesión 27) — modelo `Novedad`, panel `/admin/monetizacion`, feed y KPI globales.
- **Compartir social en `/dashboard/[id]`** (sesión 27) — `BotonesCompartir` integrado con `path`.
- **SEO técnico** (sesión 27) — sitemap con fechas reales, `BreadcrumbList`/`Organization`/`CreativeWork` JSON-LD, enlazado interno en Footer.
- **Incidente PayPal** (sesión 29) — `payment_source.paypal.experience_context` + fix `rel: payer-action`. Ver §15.
- **Rediseño editorial + visor PDF** (sesión 32, `7986196`/`7daba74`) — Home 2-col + PublicacionCard con portada generada por categoría + `PdfReader` con `pdfjs-dist`. `worker-src 'self' blob:` en CSP. Cómics soportan PDFs sin cambio de schema.
- **Conversión de moneda referencial** (sesión 33, `cae71b0`) — 9 monedas, selector en Header, cookie `moneda_ref`, cache 24h de tasas, fail-safe con snapshot. Cero cambio en el cobro USD.
- **Node 20.x → 24.x** (sesión 31, `08ad805`) — engines actualizados; cierra depreciación Vercel 2026-10-01.
- **wrangler 3.80 → 4.118 + workers-types 4→5** (sesión 31, `7281fdc`) — cierra las 6 vulnerabilidades del worker; gate supply-chain vuelve verde. **Deuda de sesión 29 CERRADA.**
- **sharp override ^0.35** (sesión 31, `cdebdfa`) — cierra 2 CVEs de libvips dentro de Next 16.
- **npm audit fix** (sesión 31, `d95e493`) — postcss/brace-expansion/@tailwindcss/postcss.
- **Bloqueo de scans con backslash + descubrimiento MCP/UCP** (sesión 31, `c10b217`) — `esScanPath` detecta `\`/`%5c`; añade `.well-known/mcp` y familia.
- **`cuerpoHtml` vacío en `RespuestaCotizacion`** (sesión 34) — llenado con el HTML real que se envía (`htmlRespuestaCotizacion(...)`).

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
19. **`MuroPago/MuroLibro/MuroRecurso/MuroDashboard`** comparten lógica/markup vía `components/MuroPagoBase.tsx` (factorizado sesión 26); los 4 son envoltorios delgados que pasan configuración (endpoint, idField, textos, degradado).

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
- **`payment_source.paypal.experience_context`** (sesión 29, antes `application_context` — deprecado): `landing_page: "GUEST_CHECKOUT"` pide explícitamente el flujo de invitado con tarjeta (el `"BILLING"` de `application_context` solo elige qué pantalla mostrar *dentro* del flujo que PayPal decida; `GUEST_CHECKOUT` en el objeto moderno es la señal fuerte de "no empujes a loguearse"). `shipping_preference: "NO_SHIPPING"` — todo el contenido es digital, no pide dirección de envío. **Confirmado en producción (sesión 29): ya no empuja a iniciar sesión**, el comprador ve el formulario de tarjeta directo.
- **Enlace de aprobación — `rel` correcto** (sesión 29, incidente en producción): al migrar a `payment_source.paypal`, PayPal deja de devolver el link con `rel: "approve"` (el de `application_context` legacy) y devuelve `rel: "payer-action"` en su lugar. `crearOrdenPayPal()` solo buscaba `"approve"` → no encontraba el enlace → **las 4 rutas de compra devolvían 502 "Error al conectar con PayPal" durante ~10 minutos en producción real** hasta el fix. Ahora `lib/paypal.ts` acepta ambos `rel` (`payer-action` primero, `approve` como fallback legacy). **Lección**: al tocar la forma del `body` que se le manda a `POST /v2/checkout/orders`, revisar también la forma de la *respuesta* — PayPal cambia el `rel` de los links según qué objeto top-level se use (`payment_source` vs `application_context`).
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

### PEDIDO del usuario (sesión 29, sin implementar aún)
Quiere "mejorar el agente con sus flujos de trabajo" — aclarado por pregunta directa:
combina **dos** de las piezas de arriba, no las 3:
- **Razonamiento multi-paso dentro de una consulta** (opción "más skills/pasos"): hoy
  el Worker hace una sola pasada RAG→LLM por request. La idea es que para consultas
  complejas encadene pasos (ej. buscar → analizar con una skill → citar) antes de
  devolver la respuesta final, en vez de una sola llamada al modelo.
- **Orquestación multi-worker** (punto 3 de arriba): el mecanismo que permitiría
  repartir esos pasos entre Workers especializados en vez de que todo viva en
  `sociologia`.
Explícitamente **descartó** el producto "Cloudflare Workflows" (ejecución durable
de pasos con reintentos) — no es lo que tiene en mente.
**Siguiente paso real**: antes de tocar código, diseñar con el usuario qué consultas
necesitan de verdad varios pasos (ej. "compara el pensamiento de X y Y sobre Z" vs.
una pregunta simple que ya resuelve el RAG actual) — el multi-paso solo vale la pena
si hay casos reales que la arquitectura actual no cubre bien. Empezar esa sesión
preguntando por 2-3 ejemplos concretos de consultas que hoy el asistente responde mal
por falta de pasos intermedios.

---

## 18. PENDIENTES ACCIONABLES — actualizado sesión 34 (2026-09-05)

> **Inicio de sesión: lee este bloque primero.** El sitio y el Worker están
> estables. Todo lo crítico/alto de seguridad y resiliencia está cerrado
> (ver §11 "Cerrado" para el histórico). El objetivo declarado del usuario es
> **mejorar el asistente de IA** — ese es el próximo bloque de trabajo.

### 🎯 Prioridad 1 — Mejorar el asistente de IA (objetivo del usuario)

El Worker `workers/sociologia/` funciona bien pero tiene margen:
- **Retrieval**: sigue en FTS5 + LIKE (`retrieval.ts`). Vectorize está
  comentado en `wrangler.toml`. Habilitar retrieval semántico mejora
  las consultas donde la palabra exacta no aparece en el texto.
- **Multi-paso**: hoy es una sola pasada RAG→skill→LLM. El usuario pidió
  encadenar pasos para consultas complejas (ver §17).
- **Corpus**: 804 docs en D1 `documentos`, aún con textos de baja calidad.
  Impacta directo en la calidad de las respuestas.

**Siguiente sesión** debería empezar por **preguntar al usuario 2-3
ejemplos concretos** de consultas que hoy el asistente responde mal, para
elegir bien entre:
1. Limpiar corpus (barato, alto retorno inmediato).
2. Activar Vectorize (medio, requiere pipeline de embeddings + backfill).
3. Multi-paso (más caro, solo vale la pena si hay consultas reales que lo pidan).

Ver §17 para la visión de multi-worker (aplazada hasta que el multi-paso
en un solo worker ya no alcance).

### 🎯 Prioridad 2 — Membresía recurrente (roadmap sesión 26)

Suscripción de pago vía PayPal Subscriptions (MRR) para desbloquear
biblioteca members-only + asistente con Vectorge. **Depende de que
Vectorize esté activo primero** (el gran gancho premium).

### ⚙️ Verificación operativa recurrente

Cada vez que se toca CSP, PayPal, o el visor PDF, verificar en producción:
- Consola del navegador sin violaciones de CSP.
- `/donar` carga (formulario de PayPal).
- Un cómic-PDF abre en el visor (`/comics/[slug]`).
- El asistente responde (Chat en el header).

### ⚠️ Caveat de entorno persistente

El **entorno Preview de Vercel no tiene `DATABASE_URL`** (o no la misma que
Production). Un build de preview que intente **prerender** una página con
consulta Prisma falla con `Tenant or user not found`. **Producción NO tiene
este problema**. Por eso el caching usa `unstable_cache` con `force-dynamic`
en vez de ISR puro. Si en el futuro se quiere ISR estático, primero
**configurar `DATABASE_URL` en Preview**.

**Consecuencia práctica para sesiones IA**: no confiar en el Preview para
verificar páginas server-side con DB. Verificar con:
- `npm run build` local (cuando el contenedor tenga `node_modules` completo).
- `mcp__Vercel__get_runtime_logs` de producción tras merge.
- Nunca `curl rauldubon.org` desde el contenedor IA (bloqueado por política
  de red `host_not_allowed`).

### 📁 Docs de referencia

- `docs/auditoria-seguridad-2026-06-02.md` — auditoría de sesión 18 (histórico).
- `docs/auditoria-integral-2026-06-06.md` — auditoría 360° de sesión 25.
- `docs/playbook-actualizacion-dependencias.md` — proceso para revisar PRs de Dependabot.

### 📝 PROMPT sugerido para la próxima sesión IA

```
Objetivo: mejorar el asistente de IA (workers/sociologia/).

Lee §11 (deuda pendiente), §17 (visión multi-paso/multi-worker) y §18
(este bloque) de CLAUDE.md. El estado del código está verificado a
sesión 34.

Empieza por preguntarme 2-3 consultas concretas donde el asistente
responde mal hoy. Con esas, decidimos entre:
- Limpiar corpus D1 (rápido).
- Activar Vectorize (medio).
- Añadir razonamiento multi-paso al Worker (más caro).

Reglas: rama nueva, NO mergear a main sin mi OK explícito. Al terminar,
actualizar CLAUDE.md.
```

---

*Última actualización: **2026-09-05 (sesión 34)** — rama `claude/claude-md-review-tech-debt-1tcujm`. Auditoría exhaustiva del CLAUDE.md contra el código real. Cambios en el documento: §1 stack actualizado (Next 16.2.9, React 19.2.8, Node 24.x, Tailwind 4.3.1, wrangler 4.118); §11 completamente reescrita — separada en "Pendiente" (11 items reales) + "Cerrado" (histórico condensado en una lista); §18 reenfocado en el objetivo del usuario (mejorar el asistente IA); pie de página consolidado (antes: ~20 resúmenes exhaustivos de 500+ palabras cada uno; ahora: 1 línea por sesión). Cambios en código: `app/api/admin/cotizaciones/[id]/responder/route.ts` — `cuerpoHtml` ahora se llena con el HTML real que se envía (`htmlRespuestaCotizacion`), cerrando la deuda menor documentada desde la sesión 17. Se verificó contra el código que ya están cerradas y no documentadas: wrangler 3.x → 4.118 (sesión 31), sharp override, Node 24, npm audit fix, security scan paths con backslash, compartir social en `/dashboard/[id]`. Deuda pendiente relevante: limpieza de corpus D1 (alta), Vectorize (media, prerrequisito de membresía premium), razonamiento multi-paso del asistente (media, objetivo del usuario). Todo en rama, sin merge a main hasta OK explícito del usuario.*

*Sesión 33 (2026-09-03, `cae71b0`) — **Conversión de moneda referencial** (visual, sin tocar el cobro USD). 9 monedas (USD/MXN/EUR/COP/GTQ/ARS/CLP/PEN/BRL), selector en Header, cookie `moneda_ref`, tasas cacheadas 24h de open.er-api.com con fail-safe hardcoded. Todo server-side; cero cambios de esquema, pagos o auth. Ver §11.*

*Sesión 32 (2026-08-30) — **Rediseño editorial completo + visor PDF integrado** (2 fases: `7986196` frontend + `7daba74` fix PDF con `pdfjs-dist`). Home 2-col serif + `PublicacionCard` con portada generada por categoría + `PdfReader` en `<canvas>` (galería navegable, zoom, fullscreen). CSP endurecido: `worker-src 'self' blob:`, `frame-src` sin Supabase (PDFs ya no en iframe). Cómics soportan PDFs sin schema change (detecta por extensión o caption `__pdf__`). Nuevo `PagoSeguroInfo.tsx` en los muros y `/donar`. Zombie eliminado: `CentroCategoriasGrid.tsx`. Portada auto de cómics-PDF queda pendiente.*

*Sesión 31 (2026-08-01, merge `d89472a`) — **Auditoría 2026-08-01: cierre masivo de deuda**. 5 commits: (a) `d95e493` npm audit fix (postcss/brace-expansion/@tailwindcss/postcss); (b) `c10b217` bloqueo de scans con backslash + descubrimiento MCP/UCP; (c) `08ad805` Node 20.x → 24.x + npm update dentro de rango; (d) `7281fdc` **wrangler 3.80 → 4.118** + workers-types 4→5 (cierra la deuda de sesión 29, gate supply-chain vuelve verde); (e) `cdebdfa` sharp override ^0.35 dentro de Next (cierra 2 CVEs libvips). `npm audit` web+worker = 0 vulns. Merge `--no-ff` para preservar cada commit. Verificación por Preview READY + logs de producción.*

*Sesión 30 (2026-07-13) — Base de "sesión 30" en la nomenclatura antigua: sesiones 32-33 fueron parte del bloque original de "sesión 30" al no numerarse consecutivamente. En esta reorganización, cada sub-bloque cronológico recibió su número real. Ver commits `868fddb`/`a20f6b7` para el incidente PayPal.*

*Sesión 29 (2026-07-11) — Retomada del proyecto tras ~1 mes. Fix de emergencia sin documentar del 17-jun (`7608376`): H2 quitó fallback `ADMIN_PASSWORD→ADMIN_SECRET` y rompió login → restaurado. 3 PRs Dependabot mergeados (Next 16.2.7→16.2.9, Tailwind 4.3.0→4.3.1, `@supabase/supabase-js` 2.107→2.108.2, etc.). Detectada deuda del `wrangler 3.x` (cerrada en sesión 31).*

*Sesión 28 — **Auditoría de seguridad externa completa**: C1 (token premium con TTL 1h), H1-H4 (proxy criptográfico, secreto único `SESSION_SIGNING_SECRET`, `WORKER_URL` env, rate-limit por email), M1-M5 (rate-limit descargas, magic bytes PDF, cookie libro opaca), B1-B5 (email correcto, timing side-channel, no propagar body PayPal, Dependabot seguridad sin cooldown). `config/prompts/system/v1.1.txt` eliminado.*

*Sesión 27 — **Panel Monetización + Novedades + limpieza zombie**. Nueva `/admin/monetizacion` (KPI global + feed unificado). Nuevo modelo `Novedad` (sidebar en home). `BotonesPayPal.tsx` eliminado (0 imports). SEO técnico: sitemap fechas reales, JSON-LD BreadcrumbList/Organization/CreativeWork, enlazado interno Footer.*

*Sesión 26 — **Resiliencia técnica**: streaming real en descargas (`blob.stream()`, no buffer), cache 120s `/api/admin/metricas`, `select` mínimo en `/api/admin/publicaciones`, paginación admin, `MuroPagoBase.tsx` factorizado (los 4 muros pasaron de 597→287 líneas). M1: PayPal no propaga body de error. W1: RLS `insercion_publica_cotizacion` eliminada.*

*Sesión 25 — **Auditoría integral 360°**: `docs/auditoria-integral-2026-06-06.md`. Cadena de suministro: `npm ci` en Vercel, `.npmrc`, cooldown 7 días Dependabot, `supply-chain.yml`. `next/font` self-hosted (Inter+Lora). Índices FK (advisor Supabase).*

*Sesión 24 — **Migraciones Next 15→16 (proxy.ts) + Tailwind 3→4 (tokens en `@theme`)**. Fix `_test_*.png` bug (nombre único). Aplazados: react-markdown 10, wrangler 4 (hecho en sesión 31).*

*Sesión 23 — 4 vulnerabilidades npm moderadas cerradas con `overrides` (postcss + uuid, sin tocar Next/exceljs).*

*Sesión 22 — Migración modelo IA: `llama-3.1-8b-instruct` (descontinuado) → `llama-3.1-8b-instruct-fast`. Refactor: `CHAT_MODEL` en `workers/sociologia/src/config.ts`.*

*Sesión 21 — **Anti-reshare extendido** a recursos/dashboards/artículos (asimetría: en recursos/dashboards solo descarga caduca; en artículos solo lectura). Vigilante interno `/api/cron/health-check`. Página `/privacidad`. Dependabot + `docs/playbook-actualizacion-dependencias.md`. Métrica Storage corregida (recorre subcarpetas).*

*Sesión 20 — INCIDENTE cookies en render (Next 15 → 500): los 4 `/leer/*` pasaron a Route Handlers. Botones "Reenviar enlace" en los 4 paneles admin de ventas. Anti-reshare libros PDF (caducidad 30d + tope 5). Fase 3 resiliencia cerrada: `/api/health/deep`.*

*Sesión 19 — CSP sin `unsafe-inline`: nonces por petición (`middleware.ts` → construye CSP dinámico en request+response).*

*Sesión 18 — **Auditoría de seguridad completa**: RLS anon cerrado (C1 crítico + H2 + H3), enumeración `datos` (L2), streaming archivos de pago (H1), timeouts externos (M1), hardening `req.json` (M4), caching con `unstable_cache`. Caveat: Preview de Vercel sin `DATABASE_URL`. `docs/auditoria-seguridad-2026-06-02.md`.*

*Sesiones 1-17 — Fundación del proyecto: publicaciones/recursos/cómics/admin, categorías dinámicas, servicios+cotizaciones, suscripción Double Opt-In, donaciones PayPal, artículos premium, libros PDF con muro, recursos HTML premium, dashboards Excel premium, respuestas a cotizaciones (máx 5), asistente IA con 3 skills, telemetría, security hardening 1-5, botones compartir, SEO/GEO. Histórico consolidado — buscar en git log por rango.*
