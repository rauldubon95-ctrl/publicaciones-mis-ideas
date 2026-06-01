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
| `/donar` | Donaciones vía PayPal (`FormularioDonacion.tsx`) |
| `/servicios` | Servicios de consultoría |
| `/comprar/exito` | Retorno de PayPal tras compra de artículo premium |
| `/leer/[token]` | Magic link artículo: valida token → cookie → redirige |
| `/leer/libro/[token]` | Magic link libro: valida token → cookie → redirige |
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
| `/admin/cotizaciones` | Solicitudes de clientes |
| `/admin/donaciones` | Historial de donaciones PayPal |
| `/admin/compras` | Historial de compras de artículos premium |
| `/admin/ventas-libros` | Historial de ventas de libros |
| `/admin/suscriptores` | Lista de correo + analítica |
| `/admin/metricas` | Dashboard de vistas, descargas, reacciones |
| `/admin/tableros` | Subir y publicar plantillas Excel |
| `/admin/seguridad` | Log de eventos de seguridad |
| `/admin/observabilidad` | Telemetría del asistente IA (7 días) |

### Next.js — APIs relevantes

| Ruta | Propósito |
|---|---|
| `app/api/comprar/route.ts` | POST: inicia compra artículo premium → PedidoContenido + orden PayPal |
| `app/api/libros/comprar/route.ts` | POST: inicia compra libro → PedidoLibro + orden PayPal |
| `app/api/libros/[slug]/descargar/route.ts` | GET: descarga PDF (verifica pago si libro es de pago) |
| `app/api/donaciones/webhook/route.ts` | POST: webhook PayPal firmado. Discrimina `contenido:`, `libro:`, donación. Idempotente. |
| `app/api/donaciones/checkout/route.ts` | POST: crea orden PayPal para donación |
| `app/api/admin/compras/route.ts` | GET admin: lista PedidoContenido + total recaudado |
| `app/api/admin/ventas-libros/route.ts` | GET admin: lista PedidoLibro + total recaudado |
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
Recurso         → VistaRecurso
Libro           → titulo, slug (unique), descripcion, paginas?, precioCentavos?, urlPdf, imagenPortada?,
                  publicado, creadoAt, actualizadoAt
                  relaciones: DescargaLibro[], PedidoLibro[]
DescargaLibro   → libroId, creadoAt, pais?, dispositivo?
PedidoLibro     → libroId, emailComprador, nombreComprador?, montoCentavos, moneda, paypalOrderId? (unique),
                  estado (PENDIENTE/COMPLETADO/FALLIDO/CANCELADO), tokenAcceso (unique cuid),
                  creadoAt, completadoAt?, ultimoAccesoAt?
RateLimitDb     → rate limiting persistente
EventoSeguridad → log de seguridad
SesionAdmin     → jti, revocadaAt, expiraAt (revocación de sesiones)
Servicio        → SolicitudCotizacion
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
| CSP `unsafe-inline` | `next.config.mjs`: `script-src 'self' 'unsafe-inline'`. Fix requiere nonces via middleware. | **Alta** |
| Más limpieza corpus D1 | 804 docs, aún hay documentos de baja calidad | Alta |
| `xlsx` vulnerabilidad | `app/api/admin/tableros/route.ts` usa `xlsx` (Prototype Pollution + ReDoS). Solo admin. Considerar `exceljs`. | Media |
| Vectorize desactivado | Retrieval es solo FTS5+LIKE. Requiere `wrangler vectorize create` + pipeline embeddings. | Media |
| Telemetría en KV (no D1) | Datos de IA duran solo 7 días. Dashboard persistente requeriría D1. | Media |
| Campo `stripeId` en Donacion | Nombre legacy: hoy guarda paypalOrderId. Renombrar requiere migración Supabase + Prisma. | Baja |
| CF_API_TOKEN con restricción IP | GitHub Actions no puede deployar Worker. Cloudflare Git integration lo cubre por ahora. | Baja |
| `config/prompts/v1.1.txt` desconectado | Worker usa SYSTEM_PROMPT en `prompts.ts`, no este archivo. | Baja |
| Multi-worker / orquestación | Ver §17 — pendiente | Futura |

---

## 12. Reglas para sesiones IA futuras

1. **Worker `sociologia` está en producción** — Auto-deploy al pushear a `main` tocando `workers/sociologia/**`.
2. **Tabla D1 real: `documentos`** — `tipo='articulo'` = corpus, `tipo='publicacion'` = artículos del sitio.
3. **No pushear a `main` sin confirmar con el usuario** — Vercel Y Cloudflare auto-despliegan.
4. **Actualizar este archivo** en cada sesión.
5. **Verificar rama activa** al inicio: `git branch --show-current`.
6. **SESSION_SIGNING_SECRET y D1_SYNC_SECRET deben coincidir** en Vercel Y en el Worker.
7. **El admin siempre ve el contenido completo** de artículos premium Y libros de pago (diseño intencional). Barra azul lo indica. Para probar el muro, usar ventana de incógnito.
8. **El precio siempre viene del servidor** — nunca del cliente. `/api/comprar` y `/api/libros/comprar` lo leen de la DB.
9. **Webhook PayPal es idempotente** — usa `WebhookEventoProcesado`. Discrimina por prefijo `custom_id`: `"contenido:"` = artículo, `"libro:"` = libro, sin prefijo = donación.
10. **Next.js 15: `params` y `cookies()` son async** — deben ser `await`eados.
11. **`FormularioDonacion.tsx` es el componente activo de donaciones** — no `BotonesPayPal`. Montos $3/$5/$10/$25 + personalizado.
12. **3 skills activas en el Worker**: `sociological-analysis`, `historical-analysis`, `political-analysis`.
13. **La tabla `PedidoLibro` debe existir en Supabase** — ver SQL en §7. Si falla con "tabla no encontrada", es que no se ha ejecutado aún.

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
- Donaciones, artículos y libros usan la misma función `crearOrdenPayPal()` con `custom_id` diferente
- Webhook discrimina por prefijo en `custom_id`: `"contenido:"` = artículo, `"libro:"` = libro, sin prefijo = donación

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
| Asistente IA con 3 skills académicas | ✅ Producción |
| Telemetría IA en /admin/observabilidad | ✅ Producción |
| Security hardening completo (fases 1–5) | ✅ Producción |
| Retrieval semántico (Vectorize) | ❌ Pendiente |
| Multi-worker / orquestación de agentes | ❌ Pendiente |

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

*Última actualización: 2026-06-01 (sesión 14 — fix locale PayPal es_MX→es-MX)*
*Commit activo en main: `489c6a3`*
