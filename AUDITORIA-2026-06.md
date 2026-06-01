# Auditoría integral — `publicaciones-mis-ideas`

**Fecha:** 2026-06-01
**Rama auditada:** `claude/kind-ptolemy-6ewhS`
**Commit base:** `5330af6` (antes de cambios de sesión 12)
**Modo:** read-only (no se modificó ningún archivo del proyecto al hacer esta auditoría)

---

## 1. Informe ejecutivo (para Raúl)

El sitio es **sólido para su tamaño y propósito**. La arquitectura — Next.js en Vercel + Supabase + un Worker en Cloudflare para el asistente IA — es razonable, está bien instrumentada (rate-limits, hashing de IPs, detección de bots, sesiones revocables) y supera con holgura la madurez de un sitio personal típico.

Sin embargo, hay **tres riesgos serios que conviene atender antes de monetizar contenido**, en este orden:

1. **El "secreto de admin" es a la vez tu cookie de sesión, tu token premium del asistente, tu clave de sincronización con el Worker, y tu clave para escribir embeddings.** Si alguna vez se filtra ese secreto, el atacante obtiene control total: entrar al admin, escribir publicaciones, borrar contenido, falsificar telemetría y enviar correos masivos a tus suscriptores. Hay que separar funciones.
2. **El código de Stripe sigue activo en el servidor** aunque ya no lo uses. Stripe no opera en El Salvador para ti, así que toda esa superficie de ataque está abierta sin beneficio. Hay que borrar el código, rotar la clave por si acaso, y cerrar el webhook.
3. **No hay sistema de pagos validados extremo-a-extremo.** La página de "gracias" de PayPal hace la captura del pago **del lado del cliente al redirigir**: si alguien manipula la URL o nunca llega a esa página, el estado de la donación puede quedar inconsistente. PayPal ofrece webhooks que evitan esto; no se están usando.

El resto son mejoras de orden medio: la CSP permite scripts inline, hay 4 vulnerabilidades moderadas en dependencias, el modelo `Donacion` mezcla campos de Stripe y PayPal, y queda código muerto (componente `BotonesPayPal.tsx`, `lib/stripe.ts`, webhook de Stripe, scripts antiguos). Cuando llegues a 10K visitas concurrentes el cuello de botella será Supabase (no Vercel ni Cloudflare), por lo que conviene añadir caché ISR y un par de índices que faltan.

Para monetizar contenido la base existe: ya tienes el modelo `Publicacion`, ya tienes PayPal funcionando, ya tienes una tabla `Donacion`. Faltan ~5 tablas nuevas y una página de "muro de pago" — diseño completo abajo en la Fase 6.

---

## 2. Informe técnico

### Fase 1 — Inventario

**Stack confirmado:**
- Next.js 15.5.18 (App Router) + React 19.1.0, Node 20.x, despliegue en Vercel (región `iad1`)
- 130 archivos `.ts`/`.tsx` en `app/`, `components/`, `lib/`, `workers/`
- Prisma 5.14 + PostgreSQL en Supabase; cliente PrismaClient singleton con manipulación de URL pooler/transaction (`lib/prisma.ts:11-22`) — correcto para Vercel.
- Cloudflare Worker en `workers/sociologia/` con D1 (`llm_sociolog`), KV (`RATE_LIMIT`), Workers AI (Llama 3.1 8B)
- Storage: Supabase buckets `comics` y `datos`
- Email: Resend
- Pagos: PayPal Orders API v2 (Stripe presente pero inactivo)

**Endpoints API (40+ rutas):** auth admin (`login`, `logout`, sesión revocable vía `SesionAdmin`), CRUD publicaciones/recursos/comics/servicios/tableros/categorías, comentarios anidados (3 niveles), reacciones, suscripción Double Opt-In, cotizaciones, donaciones (checkout + webhook Stripe legacy), tracking, dashboard, health, telemetría proxy al Worker.

**Variables de entorno detectadas en código (20):** hay 4 variables de Stripe inactivas y `NEXT_PUBLIC_PAYPAL_HOSTED_BUTTON_ID`/`NEXT_PUBLIC_PAYPAL_CLIENT_ID` que ya no se usan (el botón hospedado se sustituyó por Orders API).

**Código muerto / huérfano identificado:**
- `components/BotonesPayPal.tsx` — implementa el botón hospedado de PayPal (`HostedButtons`). El CLAUDE.md confirma que se reemplazó por `FormularioDonacion.tsx`. No se importa en ninguna parte.
- `lib/stripe.ts` + `app/api/donaciones/webhook/route.ts` — Stripe está oficialmente inactivo.
- `scripts/migrate-chunks.js` y `scripts/setup-d1.sh` — apuntan a un schema (`documents` + `doc_chunks`) que **no es el real** (`documentos`). CLAUDE.md §4 lo advierte explícitamente. Son una trampa para futuras sesiones.
- `migrations/d1/0001_initial_schema.sql` y `0002_add_fts_and_telemetry.sql` — mismo problema: describen schema incompatible con producción.
- `ESTRUCTURA-AI-SYSTEM.md` (276 líneas) y gran parte de `ARQUITECTURA.md` (2518 líneas) describen una visión futura, no la realidad.
- `app/api/donaciones/checkout/route.ts:99` guarda el `paypalOrderId` en el campo `stripeId` del modelo `Donacion`. Funciona, pero el nombre es engañoso.
- 80 commits totales en git, ninguno con secretos reales filtrados (verificado con grep `sk_live_`, `sk_test_`, `whsec_`, `AKIA`, `ghp_` sobre `git log -p --all`).

**Dependencias innecesarias en producción:** `stripe@^22.2.0`, `recharts@^3.8.1` (solo se usa en `/admin/observabilidad` que es ruta admin — podría ser dynamic import).

### Fase 2 — Seguridad

#### Hallazgos CRÍTICOS

**S-1 (Crítico) — `ADMIN_SECRET` con sobrecarga semántica.**
El mismo secreto firma: (a) cookies de sesión admin (`lib/auth.ts:23`), (b) token premium del asistente IA (`app/api/asistente/token/route.ts:11`), (c) autenticación del endpoint `/sync` del Worker (`lib/d1Sync.ts:23` ↔ `workers/sociologia/src/sync.ts:14`), (d) autenticación del endpoint `/embed` (`workers/sociologia/src/embed-worker.ts:40`), (e) autenticación del endpoint `/telemetria`. Una sola filtración compromete cinco superficies. Además, **el secreto se compara con `safeCompare(clave, secret)` como contraseña humana** en `app/api/admin/login/route.ts:48` — es decir, el operador debe escribir el HMAC-secret completo como contraseña.
**Solución:** introducir variables separadas: `ADMIN_PASSWORD` (lo que el humano escribe), `SESSION_SIGNING_SECRET`, `D1_SYNC_SECRET`, `WORKER_ADMIN_SECRET`. Derivar HMAC distintos por dominio.

**S-2 (Crítico) — Captura PayPal sin webhook.**
La captura del pago se hace en `app/donar/gracias/page.tsx:25-40` cuando el usuario aterriza tras el redirect (`token` query param). Si el navegador del usuario falla, se cierra antes de cargar, hay un crash de Next.js, o el atacante cancela la navegación, **el pago se cobra en PayPal pero la Donación queda en `PENDIENTE` en la DB**.
**Solución:** registrar el webhook de PayPal (`PAYMENT.CAPTURE.COMPLETED`) y verificar firmas con `PayPal-Auth-Algo` + `transmission_id`. El page.tsx debería ser solo UX, no fuente de verdad.

**S-3 (Alto) — Stripe activo sin uso.**
`app/api/donaciones/webhook/route.ts` está expuesto públicamente (no requiere admin auth — necesario para webhooks). Si `STRIPE_WEBHOOK_SECRET` y `STRIPE_SECRET_KEY` siguen en Vercel pero el código no se usa, no hay riesgo activo *hoy*, pero el código compila y se despliega.
**Solución:** borrar `app/api/donaciones/webhook/route.ts`, `lib/stripe.ts`, dependencia `stripe`, y rotar las claves Stripe por higiene.

#### Hallazgos ALTOS

**S-4 (Alto) — CSP con `script-src 'unsafe-inline'` (`next.config.mjs:18`).**
Permite cualquier `<script>` inline. CLAUDE.md ya lo reconoce. Habilita XSS persistente si alguna vez se introduce contenido sin escapar.
**Solución:** middleware Next.js que genera `nonce` por request y reemplaza `unsafe-inline` por `'nonce-{X}'`. Es trabajo de ~2 horas.

**S-5 (Alto) — Webhook de Stripe procesa eventos sin verificar idempotencia.**
`webhook/route.ts:38-87` actualiza `Donacion` ante cada evento. Stripe puede reenviar el mismo evento. Solo aplica si reactivas Stripe.

**S-6 (Alto) — IP en `getIp()` parcialmente confiable.**
`lib/security.ts:23` y `middleware.ts:5-12` priorizan `x-vercel-forwarded-for` (no falsificable en Vercel) y caen a `x-forwarded-for` (último valor) si la primera no está. **No es problema en Vercel hoy**, pero el código asume confianza.

#### Hallazgos MEDIOS

**S-7** — `lib/security.ts:142` aplica `sanitizarTexto()` (HTML-escape) antes de guardar comentarios, pero ReactMarkdown ya escapa al renderizar. El doble escape puede mostrar `&amp;amp;` en la salida.

**S-8** — Validación de `parentId` en comentarios es correcta hoy; ojo si se añaden estados nuevos.

**S-9** — `app/api/admin/upload-docx/route.ts:43-58` ejecuta `mammoth.convertToHtml` con imágenes embebidas en data-URI sin límite explícito sobre el HTML resultante.

**S-10** — `xlsx` mencionada en CLAUDE.md ya está reemplazada por `exceljs` ✓ — actualizar CLAUDE.md §10.

**S-11** — `npm audit` reporta 4 vulnerabilidades moderate: `postcss <8.5.10` (XSS) vía `next`, y `uuid <11.1.1` vía `exceljs`. Explotables solo procesando entradas maliciosas que ya están bajo admin auth.

#### Hallazgos BAJOS

**S-12** — `app/api/admin/login/route.ts:48` mensaje genérico — bien hecho, no enumera usuarios.

**S-13** — Honeypot duplicado en `FormularioDonacion.tsx:81-89`. Funciona, pero es redundante.

**S-14** — Falta CSRF token en mutaciones admin. Las cookies `admin_auth` usan `sameSite: "strict"`, lo cual mitiga CSRF para casi todos los navegadores modernos.

**S-15** — `app/api/seguridad/evento/route.ts:24` retorna 204 incluso ante tokens inválidos. Deliberado.

**Inyección SQL:** Todos los `$queryRaw` revisados (`app/api/admin/metricas/route.ts:47-86`, `app/api/admin/suscriptores/route.ts:26`, `app/api/health/route.ts:16`) usan template literals etiquetados de Prisma, **parametrizados correctamente**. No hay `$queryRawUnsafe` ni `$executeRawUnsafe` en todo el repo.

**XSS:** No hay `dangerouslySetInnerHTML` en ningún `.tsx`. ReactMarkdown sin `rehype-raw` está seguro por defecto.

### Fase 3 — Pruebas de estrés (modelado, no ejecución)

| Carga concurrente | Vercel Next.js | Supabase Postgres | Cloudflare Worker | Cuello |
|---|---|---|---|---|
| **1K usuarios** | OK (Lambda escala) | OK (~30 conexiones) | OK (200 RPM global) | Ninguno |
| **10K usuarios** | OK | **WARNING**: pool exhaustion. El pooler de Supabase (PgBouncer) tiene típicamente 100-200 conexiones de salida. | OK | **Supabase** |
| **50K usuarios** | Costo Vercel ~$0.40/M invocaciones — ~$20-50 en pico | **CRÍTICO**: pool collapse. Errores 5xx en `/api/publicaciones`, `/api/dashboard`. | KV de Cloudflare tiene 1000 escrituras/s por namespace. | **Supabase + KV** |

**Recomendaciones de escala:**
1. ISR (Incremental Static Regeneration) en `/`, `/publicaciones`, `/publicaciones/[slug]` con `revalidate: 60` — reduce queries de DB en ~95%.
2. Caché Edge para `/api/publicaciones` (response cache 30s).
3. Conexión Hyperdrive de Cloudflare para Supabase si llegas a ese volumen.
4. El rate-limit DB-based (`RateLimitDb`) hace 2 queries por request: SELECT + UPSERT. Bajo carga, **se vuelve cuello él mismo**. Migrar a caché en memoria con fallback a DB.

**Ataque coordinado de bots:**
- Detección por User-Agent (`security.ts:154-186`) es trivial de evadir con UA suplantado.
- No hay `Turnstile` / `hCaptcha` en ningún formulario público. Subscripción, donación y cotización son fácilmente abusables (rate-limit por IP no detiene una botnet con 10K IPs distintas).
- **Solución:** Cloudflare Turnstile en `/api/subscribe`, `/api/cotizaciones`, `/api/donaciones/checkout`.

### Fase 4 — Supabase / BD

**RLS:** CLAUDE.md §2 afirma RLS aplicado en 18+ tablas (Fase 3). **No se puede verificar desde el repo** — habría que consultar Supabase con `mcp__supabase__get_advisors`.

**Índices observados (`prisma/schema.prisma`):** correctos para los patrones de consulta actuales. Faltan dos:
- `Publicacion(publicado, publicadoAt DESC)` — la query principal de `/api/publicaciones/route.ts:32-42` filtra por `publicado=true` y ordena por `publicadoAt desc`. Sin índice compuesto, hace full scan + sort.
- `Subscription(status, creadoAt)` — para el dashboard `/admin/suscriptores`.

**N+1 detectado:**
- `app/api/admin/sync-d1-all/route.ts:18-37` itera publicaciones y hace fetch HTTP secuencial al Worker. Con 100 publicaciones = 100 fetches sincrónicos = ~30s. Debería paralelizar con `Promise.allSettled`.

**Tracking de vistas:** hace SELECT + INSERT por cada visualización (`app/api/track/route.ts:54-78`). Con 10K vistas/hora = 20K queries/hora. Cachear el `yaVisto` en KV/Redis sería ideal.

### Fase 5 — GitHub Actions

**Permisos:** `code-review.yml:18-21` declara `issues: write, contents: read, models: read` — correcto, mínimo necesario.
**Secretos:** `deploy-worker.yml:35-37` usa `CF_API_TOKEN` y `CF_ACCOUNT_ID` via `secrets.*` — bien.

**Historial Git:** búsqueda de patrones `sk_live_`, `sk_test_`, `whsec_`, `AKIA`, `ghp_`, `github_pat_` en `git log -p --all` retornó **vacío salvo referencias documentales en CLAUDE.md** (placeholder, no clave real). Limpio.

**`.gitignore` correcto** (`.env*`, `.claude/`, `.mcp.json` ignorados).

### Fase 6 — Diseño de monetización de contenido

#### Modelo de datos propuesto

```prisma
// Extender Publicacion
model Publicacion {
  // ...campos existentes
  esPremium      Boolean   @default(false)
  precioCentavos Int?      // null si no premium
  tipoAcceso     String?   // "UNICO" | "RECURRENTE" — por ahora "UNICO"
  resumenPublico String?   // mostrado antes del paywall
}

// Nueva tabla: pedidos de pago
model PedidoPago {
  id              String   @id @default(cuid())
  publicacionId   String
  publicacion     Publicacion @relation(fields: [publicacionId], references: [id])
  emailComprador  String
  nombreComprador String?
  montoCentavos   Int
  moneda          String   @default("USD")
  proveedor       String   // "paypal"
  proveedorOrderId String? @unique
  estado          String   @default("PENDIENTE")
  ipHash          String?
  creadoAt        DateTime @default(now())
  completadoAt   DateTime?

  accesos         AccesoContenido[]
  @@index([emailComprador])
  @@index([estado])
}

// Una compra otorga 1+ accesos
model AccesoContenido {
  id            String   @id @default(cuid())
  pedidoId      String
  pedido        PedidoPago @relation(fields: [pedidoId], references: [id])
  publicacionId String
  emailLector   String
  tokenAcceso   String   @unique @default(cuid())
  expiraAt      DateTime?
  ultimoAccesoAt DateTime?
  creadoAt      DateTime @default(now())

  @@index([emailLector, publicacionId])
  @@index([tokenAcceso])
}

model WebhookEventoProcesado {
  eventId    String   @id
  proveedor  String
  procesadoAt DateTime @default(now())
}
```

#### Flujo recomendado

```
Lector → /publicaciones/[slug]
   ├─ esPremium=false → ver contenido normal
   └─ esPremium=true:
        ├─ ¿AccesoContenido válido? → ver contenido
        └─ no → mostrar resumenPublico + muro de pago
                 ↓
            POST /api/comprar { publicacionId, email }
                 ↓ (crea PedidoPago PENDIENTE + orden PayPal)
            redirect → PayPal
                 ↓ (usuario paga)
            return_url → /comprar/exito
                 ↓
            **WEBHOOK PAYPAL** (PAYMENT.CAPTURE.COMPLETED, verificar firma)
                 ↓
            1. Verificar idempotencia (eventId en WebhookEventoProcesado)
            2. Actualizar PedidoPago → COMPLETADO
            3. Crear AccesoContenido con tokenAcceso firmado
            4. Email al comprador con enlace mágico: /leer/[tokenAcceso]
            5. Marcar evento procesado
```

#### Controles anti-fraude / anti-bypass

1. **Firma del webhook PayPal** obligatoria.
2. **Idempotencia** vía `WebhookEventoProcesado.eventId` único.
3. **Enlace mágico firmado:** `tokenAcceso = HMAC(SECRET, accesoId|email|exp)`.
4. **Detección de compartición de tokens:** registrar `ultimoAccesoAt` + IP hash; si >3 IPs distintas en 24h, alertar admin.
5. **Validación del monto en el webhook:** comparar `purchase_units[].amount.value` contra `PedidoPago.montoCentavos`. Nunca confiar en el cliente.
6. **Reembolsos** vía PayPal: webhook `PAYMENT.CAPTURE.REFUNDED` → revocar acceso.
7. **Sin precio en el cliente:** el `precioCentavos` viene siempre del servidor.

### Fase 7 — Arquitectura

**Cohesión:** alta dentro de cada módulo (admin, donaciones, suscripciones bien aislados).
**Acoplamiento:** medio — el `ADMIN_SECRET` actúa como acoplamiento de configuración a 5 sistemas (ver S-1).
**Antipatrones:**
- `BotonesPayPal.tsx` huérfano sigue compilando.
- `app/donar/gracias/page.tsx` mezcla render + side-effects de captura de pago + envío de email — debería delegarse a webhook.
- `lib/d1Sync.ts:42-52` hace fetch fire-and-forget sin reintentar.
- Campo `stripeId` en `Donacion` ahora almacena orderId de PayPal — semántica rota (`prisma/schema.prisma:266`).

**DRY:** la función `hashIp` aparece duplicada en `lib/security.ts:32`, `app/api/cotizaciones/route.ts:14`, `app/api/track/route.ts:18` con ligeras variantes. Unificar.

---

## 3. Diagrama de arquitectura actual

```
┌────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                                │
└──────┬─────────────────────────────────────────────┬────────────────┘
       │                                              │
       │  HTTPS (rauldubon.org)                       │ chat IA
       ▼                                              ▼
┌─────────────────────────────────────┐    ┌──────────────────────────┐
│  Next.js 15 (Vercel iad1)           │    │ Cloudflare Worker        │
│  ─ middleware.ts                    │    │ sociologia.workers.dev   │
│    · BOT detection                  │    │ ─ Routing skills         │
│    · SCAN_PATH block                │    │ ─ FTS5 + LIKE retrieval  │
│    · admin cookie verification      │    │ ─ Workers AI (Llama 3.1) │
│  ─ 40+ API routes                   │◀───┤ ─ Rate-limit global (KV) │
│  ─ Server Components (SSR)          │ POST/sync                     │
└────┬────────────────┬───────────────┘    └──┬──────┬────────────────┘
     │                │                       │      │
     │ Prisma         │ Supabase JS           │ D1   │ KV
     ▼                ▼                       ▼      ▼
┌──────────────────────┐  ┌───────────┐  ┌──────────┐  ┌──────┐
│ Supabase PostgreSQL  │  │ Supabase  │  │  D1      │  │ KV   │
│ ~18 tablas RLS       │  │ Storage   │  │ documentos│  │ rate │
│ (Publicacion,        │  │ comics/   │  │ + FTS5    │  │ limit│
│  Donacion, etc.)     │  │ datos     │  │ 804 docs  │  │+ tele│
└──────────────────────┘  └───────────┘  └──────────┘  └──────┘

         ▲                                ▲
         │ Resend SMTP                    │ HTTPS
         │                                │
┌──────────────────┐              ┌──────────────────┐
│ Suscripciones    │              │ PayPal Orders v2 │
│ + notif donación │              │ (Live, El Salv.) │
└──────────────────┘              └──────────────────┘

ADMIN_SECRET (un solo valor) firma:
  ├─ cookies de sesión
  ├─ token premium asistente
  ├─ /sync (Next→Worker)
  ├─ /embed (admin→Worker)
  └─ /telemetria (Next→Worker)
```

## 4. Diagrama de arquitectura recomendada

```
┌────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                                │
└──────┬─────────────────────────────────────────────┬────────────────┘
       │                                              │
       ▼  + Cloudflare Turnstile (en forms públicos)  ▼
┌─────────────────────────────────────┐    ┌──────────────────────────┐
│  Next.js + ISR (cache 60s)          │    │ Cloudflare Worker        │
│  ─ middleware con CSP nonce         │    │ (sin cambios estructurales)│
│  ─ /api/publicaciones con cache     │◀───┤                          │
│    edge (s-maxage=30)               │    │                          │
└────┬────────────────┬───────────────┘    └──────────────────────────┘
     │ Prisma         │
     ▼                ▼
┌──────────────────────┐
│ Supabase + nuevos    │
│ índices:             │
│  Publicacion(pub,    │
│   publicadoAt DESC)  │
│  + tablas premium:   │
│  PedidoPago,         │
│  AccesoContenido,    │
│  WebhookProcesado    │
└──────────────────────┘
     │
     │ webhook PAYMENT.CAPTURE.COMPLETED ← PayPal (firmado)
     ▼
┌──────────────────────┐
│ /api/paypal/webhook  │ ← verifica firma, idempotencia, crea AccesoContenido
└──────────────────────┘

SECRETOS SEPARADOS:
  ADMIN_PASSWORD          (humano)
  SESSION_SIGNING_SECRET  (cookies)
  D1_SYNC_SECRET          (Next→Worker)
  WORKER_EMBED_SECRET     (admin→Worker)
  PAYPAL_WEBHOOK_ID       (verificación firma)
```

## 5. Plan de escalabilidad (priorizado)

1. ISR en home + listados + detalle de artículo (esfuerzo: 2h, beneficio: -90% queries).
2. Edge cache en `/api/publicaciones` con `revalidate: 30` (esfuerzo: 30min).
3. Índice compuesto `Publicacion(publicado, publicadoAt DESC)` y `Subscription(status, creadoAt)` (esfuerzo: 1h).
4. `RateLimitDb` → caché en memoria por instancia + flush diferido (esfuerzo: 4h).
5. Tracking de vistas: bufferizar en KV, persistir cada 60s (esfuerzo: 6h).
6. Hyperdrive de Cloudflare para Supabase si superas 5K rpm sostenido (esfuerzo: 2h).

## 6. Plan de endurecimiento de seguridad (priorizado)

1. **CRÍTICO** — separar `ADMIN_SECRET` en 4 secretos por dominio. Migración de cookies necesaria (revocar todas).
2. **CRÍTICO** — webhook PayPal con verificación de firma + idempotencia.
3. **ALTO** — borrar `lib/stripe.ts`, `app/api/donaciones/webhook/route.ts`, dependencia `stripe`. Rotar `STRIPE_*` y removerlas de Vercel.
4. **ALTO** — CSP con `nonce` en lugar de `unsafe-inline`.
5. **ALTO** — Cloudflare Turnstile en `/api/subscribe`, `/api/cotizaciones`, `/api/donaciones/checkout`.
6. **MEDIO** — `npm audit fix` o monitor sin upgrade forzoso.
7. **MEDIO** — auditar RLS Supabase con `mcp__supabase__get_advisors`.
8. **MEDIO** — añadir token CSRF aunque `sameSite=strict` ya proteja.
9. **BAJO** — unificar `hashIp` en `lib/security.ts`.
10. **BAJO** — sanitizar contenido al renderizar, no al guardar.

## 7. Plan de monetización (resumen)

Esfuerzo estimado para MVP: **8-12 horas** + 2h de pruebas con PayPal Sandbox.

- 4 modelos nuevos en Prisma (1h)
- Toggle "es premium" + campo precio en `PublicacionForm.tsx` (1h)
- Endpoint `POST /api/comprar` (2h)
- Endpoint webhook `POST /api/paypal/webhook` con verificación firma + idempotencia (3h)
- Página `/leer/[tokenAcceso]` con verificación HMAC (1h)
- Componente "muro de pago" reutilizando `FormularioDonacion` adaptado (2h)
- Email con enlace mágico vía Resend (1h)

## 8. Roadmap a producción robusta

| Sprint | Foco | Salida |
|---|---|---|
| **S1 (1 sem)** | Limpieza: borrar Stripe + huérfanos, separar `ADMIN_SECRET` | Reducción superficie ataque ~40% |
| **S2 (1 sem)** | Webhook PayPal + verificación firma + idempotencia | Donaciones a prueba de pérdidas |
| **S3 (1 sem)** | Monetización contenido (Fase 6 completa) | Primer artículo de pago en vivo |
| **S4 (1 sem)** | CSP nonce + Turnstile + RLS audit | Postura defensiva profesional |
| **S5 (1 sem)** | ISR + caché + índices DB | Listo para 10K usuarios |
| **S6 (1 sem)** | Documentación viva: poda ARQUITECTURA.md | Onboarding rápido para IA |

## 9. Lista de archivos que deben corregirse (path:line)

- `next.config.mjs:18` — CSP `unsafe-inline` en script-src.
- `lib/auth.ts:23` + `app/api/admin/login/route.ts:48` — sobrecarga de `ADMIN_SECRET` (ver S-1).
- `app/api/donaciones/webhook/route.ts:1-95` — borrar (Stripe inactivo).
- `lib/stripe.ts:1-13` — borrar.
- `app/donar/gracias/page.tsx:25-50` — mover captura de PayPal a webhook; dejar solo UX.
- `lib/d1Sync.ts:42-52` — falta retry y observabilidad.
- `app/api/admin/sync-d1-all/route.ts:18-37` — paralelizar fetches.
- `prisma/schema.prisma:266` — renombrar `stripeId` → `proveedorOrderId` (migración con `@map`).
- `prisma/schema.prisma` — añadir índice compuesto `Publicacion(publicado, publicadoAt(sort: Desc))`.
- `lib/security.ts:142` — re-evaluar doble escape vs. ReactMarkdown.
- `middleware.ts:5-12` + `lib/security.ts:23` — endurecer `getIp` para entornos no-Vercel.
- `CLAUDE.md §10` — la deuda `xlsx` ya está resuelta (exceljs en uso), actualizar.

## 10. Lista de archivos que pueden eliminarse (con justificación)

- `components/BotonesPayPal.tsx` — código de PayPal Hosted Button reemplazado; no se importa en ninguna parte.
- `lib/stripe.ts` — Stripe desactivado, no se usa en producción.
- `app/api/donaciones/webhook/route.ts` — webhook Stripe ocioso.
- Dependencia `stripe` en `package.json` — sin uso tras borrar lo anterior.
- `scripts/migrate-chunks.js` — apunta a schema D1 incorrecto; peligroso para futuras sesiones IA.
- `scripts/setup-d1.sh` — mismo problema.
- `migrations/d1/0001_initial_schema.sql` y `migrations/d1/0002_add_fts_and_telemetry.sql` — describen schema D1 que **no es el real en producción**.
- `ESTRUCTURA-AI-SYSTEM.md` (276 líneas) — visión arquitectónica obsoleta, contradice estado real.
- `ARQUITECTURA.md` §§2-18 (~2300 líneas) — visión futura mezclada con descripción de producción; reducir a 200 líneas accionables.
- `supabase-setup.sql` — script de bootstrap incompleto.
- `GUIA-DEPLOY.md` — verificar si sigue vigente; si no, fusionar en README.

---

**Cierre.** El proyecto está bastante bien para una plataforma personal con asistente IA propio. Los riesgos son acotados, los hallazgos críticos son arreglables en 1-2 sprints, y la fundación para monetizar contenido es sólida — solo faltan ~12 horas de trabajo y, sobre todo, **dejar de duplicar funciones del `ADMIN_SECRET`** antes de aceptar pagos por contenido.
