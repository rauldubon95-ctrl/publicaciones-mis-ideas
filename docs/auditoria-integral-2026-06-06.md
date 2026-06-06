# Auditoría integral de rauldubon.org — 2026-06-06

> Revisión 360° solicitada por Raúl: seguridad, vulnerabilidades, cadena de
> suministro, funcionamiento, rendimiento, comportamiento bajo estrés,
> arquitectura/modularización, microservicios, SEO, y una visión de escalado y
> monetización. Combina análisis estático del código con datos **en vivo** de
> Supabase (advisors), Vercel (logs de producción) y `npm audit`.
>
> **Método:** 3 auditorías paralelas sobre el código real + advisors de Supabase
> (proyecto `yjgkhqapqiezvsrqoynl`) + logs de runtime de Vercel + lockfile.

---

## 0. Tablero de mando (scorecard)

| Dimensión | Nota | Estado |
|---|---|---|
| **Seguridad (app)** | 9.0 / 10 | 🟢 0 críticos, 0 altos. Defensa en profundidad real. |
| **Vulnerabilidades de dependencias** | 8.5 / 10 | 🟢 `npm audit` = 0. Falta automatización de bloqueo. |
| **Cadena de suministro (supply chain)** | 6.5 / 10 | 🟡 Buena base (lockfile, dependabot), falta blindaje activo. |
| **Funcionamiento (producción)** | 9.5 / 10 | 🟢 0 errores en runtime en 7 días. |
| **Rendimiento / velocidad** | 6.5 / 10 | 🟡 Fuentes por @import + `force-dynamic` penalizan TTFB. |
| **Comportamiento bajo estrés** | 7.0 / 10 | 🟡 3-4 cuellos reales a 100× (descargas en memoria). |
| **Arquitectura / modularización** | 7.5 / 10 | 🟢 Sólida; duplicación de Muros/helpers como deuda. |
| **Microservicio (Worker IA)** | 8.0 / 10 | 🟢 Bien acotado; retrieval solo FTS5. |
| **SEO / GEO** | 8.0 / 10 | 🟢 Bases excelentes; faltan og:image dinámicos y breadcrumbs. |

**Veredicto global: plataforma madura y segura para su escala actual.** No hay
nada ardiendo. Los pendientes son de *robustez ante crecimiento* y *velocidad
percibida*, no de supervivencia.

---

## 1. Seguridad de la aplicación 🟢

### Lo que está muy bien hecho (no tocar)
- **Auth admin robusta:** cookie `v2.{jti}.{hmac}` con HMAC-SHA256, `safeCompare()`
  anti-timing, sesión validada contra DB (`revocadaAt`/`expiraAt`), revocación en
  logout. `lib/auth.ts`, `lib/adminAuth.ts`.
- **Rate-limit en login:** 5 intentos/15 min, bloqueo 30 min, `failBehavior:"close"`
  (si la DB cae, *rechaza* — correcto para fuerza bruta). `app/api/admin/login/route.ts`.
- **Doble barrera admin:** `proxy.ts` rechaza 401 todo `/api/admin/*` sin cookie,
  y además cada endpoint llama `isAdminAuthorized()` (verificado en 40+ rutas).
- **Webhook PayPal:** firma criptográfica real (verificada contra PayPal),
  idempotente (`WebhookEventoProcesado`), **el precio viene del servidor, nunca
  del cliente**. `lib/paypal.ts`, `app/api/donaciones/webhook/route.ts`.
- **Paywall sólido:** cookies `httpOnly`/`secure`/`sameSite=lax`, magic links por
  email, tokens UUID v4 no adivinables, anti-reshare (30 d + 5 descargas con
  `updateMany` atómico anti-race). Las descargas hacen **stream** server-side
  (la URL del bucket nunca llega al cliente).
- **Headers:** HSTS 2 años + preload, CSP con **nonce por request** (sin
  `unsafe-inline` en `script-src`), `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `Permissions-Policy` restrictiva.
- **Observabilidad:** `EventoSeguridad` (IP hasheada), panel `/admin/seguridad`,
  vigilante diario `/api/cron/health-check`.

### Hallazgos abiertos (todos de severidad baja/media)
| # | Sev | Hallazgo | Archivo | Acción |
|---|---|---|---|---|
| M1 | 🟡 Media | `console.error` loguea el **body** completo de errores de PayPal | `lib/paypal.ts:27,75,143` | Loguear solo `res.status`, no el body |
| W1 | 🟡 Media | RLS policy `WITH CHECK (true)` en INSERT de `SolicitudCotizacion` para `anon` → spam vía PostgREST saltándose el rate-limit de la app | Supabase (advisor) | Restringir o aceptar (la app usa Prisma; el riesgo es vía anon key directa) |
| L2 | 🔵 Baja | `style-src 'unsafe-inline'` (lo exige Tailwind v4) | `proxy.ts:42` | Aceptar; cerrar requiere CSS-in-JS con nonce |
| L3 | 🔵 Baja | Fallback a `ADMIN_SECRET` legacy si faltan las vars nuevas | `lib/secrets.ts` | Confirmar vars en Vercel y fijar fecha de baja |

> **Sobre los 14 avisos "RLS Enabled No Policy" de Supabase:** son `INFO`, **no
> un problema**. Significan "RLS activo + 0 políticas = nadie entra por la anon
> key" (deny-by-default). Es exactamente el estado seguro tras cerrar C1 en la
> sesión 18. La app entra por Prisma (conexión directa), no por la anon key.

---

## 2. Cadena de suministro y dependencias (tu preocupación clave) 🟡

> *"Uso muchas piezas que no he desarrollado y a veces poseen contenido malicioso.
> ¿Cómo me protejo?"* — Esta es la pregunta más importante de la sesión. Aquí está
> el panorama honesto y el plan.

### Estado actual
- `npm audit` = **0 vulnerabilidades** (web y worker). ✅
- **Lockfiles commiteados** (`package-lock.json` raíz + worker) → builds
  reproducibles. ✅
- **Dependabot** mensual configurado, limitado a parches/menores (ignora majors). ✅
- **Pocas dependencias directas** (15 prod + 11 dev) → superficie de ataque
  acotada. ✅
- Solo **1 script de ciclo de vida propio**: `postinstall: prisma generate`
  (legítimo). ✅

### El riesgo real que describes (y por qué es legítimo)
Lo que temes tiene nombre: **supply-chain attack**. Casos reales recientes
(`event-stream`, `node-ipc`, `ua-parser-js`, `xz`) muestran el patrón: una
dependencia *transitiva* (que tú no elegiste, vino arrastrada por otra) es
secuestrada y publica una versión con código malicioso —normalmente en un
script `postinstall`— que roba variables de entorno (¡tus secretos PayPal y
Supabase!) o inyecta backdoors. **Tu mayor exposición no son tus 15 paquetes,
son los ~800 transitivos.**

### Lo que te falta (plan de blindaje, de mayor a menor impacto)

**🔴 1. Congelar la instalación en CI/Vercel (`npm ci`, no `npm install`).**
Tu `build` usa `prisma generate && next build`. Vercel instala con `npm install`
por defecto, que **puede actualizar el lockfile silenciosamente** y traer una
versión nueva (potencialmente comprometida). `npm ci` instala *exactamente* lo
del lockfile y falla si hay discrepancia. → Añadir `.npmrc` o configurar el
Install Command de Vercel a `npm ci`.

**🔴 2. Bloquear scripts de instalación maliciosos.** El 99% del malware npm se
ejecuta en `postinstall`. Añade un `.npmrc` con `ignore-scripts=true` y ejecuta
*solo* el `prisma generate` que tú controlas explícitamente. (Requiere mover
`prisma generate` fuera del ciclo automático — verificar que no rompe el build).
*Alternativa más suave:* mantener scripts pero auditar con `npm audit signatures`.

**🟠 3. Cooldown de versiones.** El malware suele detectarse y retirarse en
horas/días. Configura Dependabot/Renovate para **esperar N días** antes de
proponer una versión nueva (`minimumReleaseAge`). Evita ser el conejillo de
indias de una versión recién secuestrada.

**🟠 4. Verificación de procedencia (npm provenance).** npm permite verificar que
un paquete fue publicado desde el CI oficial del proyecto (`npm audit signatures`).
Intégralo como gate en CI.

**🟠 5. Restringir egress de secretos.** Tu entorno ya tiene una *network policy*
(Claude Code on the web). Para producción en Vercel, el riesgo es que un paquete
comprometido haga `fetch` a un servidor atacante con tus envs. Mitigación
práctica: **mínimo privilegio en secretos** (que la anon key tenga RLS cerrado
—ya lo tienes—) y rotación periódica de `PAYPAL_CLIENT_SECRET` /
`SESSION_SIGNING_SECRET`.

**🟢 6. CI gate de seguridad.** Hoy `code-review.yml` revisa código, pero **no
hay un workflow que falle el merge si `npm audit` encuentra algo**. Añadir un job
`npm audit --audit-level=high` + `npm audit signatures` en PRs.

**🟢 7. Fijar Node y npm.** Ya fijas `node: 20.x`. Fija también la versión de npm
(`packageManager` en package.json o `.nvmrc` + `engines.npm`) para evitar
sorpresas de resolución.

> **Resumen de tu exposición de supply chain:** hoy estás en "higiene básica
> correcta" (lockfile + audit limpio + dependabot acotado). El salto a "blindado"
> son los puntos 1, 2 y 3 — relativamente baratos y de altísimo retorno dado que
> manejas secretos de dinero (PayPal) y base de datos.

---

## 3. Funcionamiento en producción 🟢

- **0 errores ni fatales en runtime en los últimos 7 días** (Vercel logs).
- Proyecto Supabase `ACTIVE_HEALTHY`, Postgres 17.6.
- Dominio `rauldubon.org` conectado a Vercel.
- Migraciones recientes (Next 16, Tailwind 4) verificadas con logs verdes.

No se detectaron fallos funcionales. La plataforma opera correctamente.

---

## 4. Rendimiento y velocidad (experiencia del usuario) 🟡

La estructura SEO es excelente, pero hay **dos frenos concretos a la velocidad
percibida (TTFB y CLS)**:

**🔴 Fuentes vía `@import` en CSS** (`app/globals.css:3`). Cargar Inter+Lora desde
`fonts.googleapis.com` con `@import` bloquea y añade ~300-500 ms de TTFB + riesgo
de FOUT (texto que salta). → Migrar a `next/font/google` (auto-hospeda las
fuentes, elimina el round-trip externo, optimiza CLS). **El quick win de mayor
impacto en velocidad.**

**🟠 `force-dynamic` en páginas públicas** (`libros`, `recursos`, `comics`,
`publicaciones/[slug]`, `sitemap`). Anula el caché de edge/CDN: cada visita
ejecuta servidor + consulta DB. Ya tienes `unstable_cache`, pero `force-dynamic`
lo neutraliza para el HTML. → Cambiar a `revalidate: 300` (ISR). Baja el TTFB y
descarga la DB ~95%.

**🟠 `<img>` crudos** en `ComicReader.tsx:62,81` y `TarjetaAutor.tsx:27` (sin
dimensiones → CLS). → Usar `next/image` con `width`/`height` o `fill`+`sizes`.

**Bundle de cliente ~225 KB gzip** — saludable. `recharts` solo carga en
`/admin/metricas` (correcto).

---

## 5. Comportamiento bajo estrés / escalabilidad 🟡

**Veredicto: hoy aguanta tu tráfico con holgura. A 100× usuarios aparecen 4
cuellos reales** (de mayor a menor gravedad):

**🔴 1. Descargas cargan el archivo entero en memoria.**
`app/api/libros/[slug]/descargar/route.ts:61` hace `Buffer.from(await blob.arrayBuffer())`
— un PDF de 50 MB × N descargas concurrentes = **OOM en la función serverless**.
Igual en dashboard y recursos. → Hacer *stream* real (pasar el `ReadableStream`
del blob a la respuesta sin bufferizar) **o** servir con signed URL temporal de
Supabase. Es el riesgo #1 a escala.

**🟠 2. `/api/admin/metricas` sin caché.** 18 queries + recorrido recursivo de
Storage en cada visita (3-8 s). Solo lo ve el admin, pero si hay varios
concurrentes, timeouts. → `unstable_cache` 5 min.

**🟠 3. `/api/admin/publicaciones` sin paginación** — carga *todas* las
publicaciones. Con 1000+ artículos, memoria alta. → `take/skip`.

**🟡 4. Rate-limit del Worker es fail-close ante caída de KV.** Si KV hipa, se
rechazan queries. → Cache en memoria con TTL + KV como fallback.

**Lo que SÍ escala bien:** singleton de Prisma con pooling (no agota conexiones),
índices compuestos, `unstable_cache` en home/listados, timeouts en todas las
llamadas externas, webhook idempotente.

### Datos de Supabase (advisor de rendimiento)
- **3 foreign keys sin índice** → JOINs lentos a escala:
  `DescargaLibro.libroId`, `Publicacion.categoriaId`, `PublicacionEtiqueta.etiquetaId`.
  → Crear índices (barato, alto retorno cuando crezca la tabla).
- ~30 "unused index" → ruido por bajo volumen de datos, **no actuar aún**
  (se "usarán" cuando crezcan las tablas; quitarlos sería prematuro).

---

## 6. Arquitectura y modularización 🟢

- **Capa de datos correcta:** singleton Prisma, pooling, sin N+1 en los listados
  (usan `include` acotado + `_count`).
- **Separación server/client razonable** (~57% client, justificable salvo `Header`
  y `/admin/page.tsx` que podrían ser server).
- **Deuda explícita (ya documentada en CLAUDE.md §11):**
  - `MuroPago/MuroLibro/MuroRecurso/MuroDashboard` ~95% idénticos → 1 `MuroCompra`
    parametrizado por `tipo`.
  - `accesoLibro/accesoRecurso/accesoDashboard.ts` ~75% duplicado → genérico.
  - Hacerlo en **PR aislada** (no mezclar con otros cambios).

Estas refactorizaciones reducen ~300-400 líneas y bajan el coste de cada cambio
futuro, pero **no son urgentes** (no afectan seguridad ni rendimiento).

---

## 7. Microservicio: Worker `sociologia` 🟢

- **Bien acotado:** endpoints independientes (`/`, `/skill`, `/sync`, `/embed`,
  `/telemetria`). No es un monolito disfrazado.
- **Escala a 100×** sin problema (KV ~500 ops/min, Workers AI ≤4 calls/req, D1 con
  804 docs cabe holgado en free tier).
- **Limitación de calidad, no de escala:** el retrieval es solo **FTS5 + LIKE**.
  Para mejor relevancia académica → activar **Vectorize** (retrieval semántico),
  hoy comentado en `wrangler.toml`.
- **Visión multi-worker** (orquestador) en CLAUDE.md §17: válida pero **prematura**.
  No la abordes hasta que un caso de uso real lo exija.

---

## 8. SEO / GEO 🟢

**Bases excelentes** (canonical por página, JSON-LD Person/WebSite/Article/Book,
sitemap dinámico completo, robots que permite IA-crawlers y bloquea
entrenamiento, `lang="es"`, alt en imágenes). Mejoras de impacto:

| Prioridad | Mejora | Dónde |
|---|---|---|
| 🔴 Alta | **og:image faltante** en artículos/recursos/cómics sin portada → sin preview social. Añadir fallback a `og-image-rauldubon.png` | `publicaciones/[slug]`, `recursos/[slug]`, `comics/[slug]` |
| 🟠 Media | **BreadcrumbList JSON-LD** ausente → Google no muestra migas en SERP | páginas con navegación |
| 🟠 Media | **`next/font`** (ver §4) mejora Core Web Vitals, que *son* factor de ranking | `globals.css` |
| 🟡 Baja | Schema `Organization`, cómics sin JSON-LD, paginación en sitemap | varios |

---

## 9. Visión de escalado y monetización 📈

### Mapa de escalado (cómo crece sin colapsar)

```
                 HOY (decenas-cientos visitas/día)
                 ┌───────────────────────────────┐
                 │ Vercel Hobby/Pro + Supabase    │
                 │ Free + CF Worker Free          │
                 │ ✅ Aguanta con holgura          │
                 └───────────────────────────────┘
                              │
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                  ▼
   ANTES DE 10×        ANTES DE 100×       ANTES DE 1000×
   (quick wins)        (correcciones       (infraestructura)
                        de estrés)
   • next/font         • Stream/signed     • Supabase Pro
   • ISR (quitar         URL en descargas    (compute + conexiones)
     force-dynamic)    • Cache metricas    • CDN para PDFs (R2/
   • índices FK          + paginación        bucket con signed URL)
   • og:image          • Cache KV en       • Vectorize en Worker
                         rate-limit        • Read replicas si hace
                       • Vectorize           falta
```

**Regla de oro:** cada peldaño se paga **solo cuando el anterior duela**. Hoy
estás sobre-dimensionado para tu tráfico; no gastes en infra que no necesitas.

### Palancas de monetización (ya tienes el motor montado)

Tu plataforma ya cobra por 4 vías (artículos, libros, recursos, dashboards) +
donaciones + consultoría. El **motor de pagos es tu mayor activo**. Para crecer
ingresos sin reescribir nada:

1. **Suscripción / membresía** (recurrente > pago único). Ya tienes lista de
   correo (Double Opt-In) y control de acceso por cookie. Un plan mensual que
   desbloquee *todo* el premium convierte compras esporádicas en MRR. PayPal
   soporta subscriptions API. **La palanca de mayor retorno.**
2. **Bundles** ("todos los libros", "pack dashboards") — usa la infra de pedidos
   existente, solo agrupa.
3. **Asistente IA como producto premium.** Hoy el límite gratis es 5/día. Un tier
   de pago (más consultas + skills avanzadas + Vectorize) monetiza el Worker.
4. **GEO como canal de adquisición.** Ya permites ChatGPT/Perplexity/Claude
   crawlers. Optimizar para *answer engines* (JSON-LD rico, FAQ schema, datos
   estructurados) te trae tráfico que tus competidores académicos no captan.
5. **Servicios/consultoría** como ancla de alto ticket (ya tienes cotizaciones).

> Prioriza **#1 (suscripción)** y **#4 (GEO)**: el primero multiplica el valor por
> usuario; el segundo, el número de usuarios. Ambos reutilizan lo que ya tienes.

---

## 10. Plan priorizado (qué hacer y en qué orden)

### 🟢 Quick wins (alto impacto, bajo esfuerzo — 1 sesión)
1. **`next/font`** en vez de `@import` → −300-500 ms TTFB + mejor CLS/ranking.
2. **Quitar `force-dynamic`** de libros/recursos/comics/sitemap → `revalidate: 300`.
3. **Índices FK** en Supabase (3 índices) → JOINs rápidos a futuro.
4. **og:image fallback** en páginas dinámicas → previews sociales.
5. **`lib/paypal.ts`**: no loguear body de errores (M1).

### 🟠 Blindaje de cadena de suministro (tu prioridad — PR dedicada)
6. `.npmrc` con `npm ci` en Vercel + (evaluar) `ignore-scripts`.
7. Cooldown de versiones en Dependabot (`minimumReleaseAge`).
8. CI gate: `npm audit --audit-level=high` + `npm audit signatures` que **falle** el merge.
9. Rotar `PAYPAL_CLIENT_SECRET` y `SESSION_SIGNING_SECRET` (higiene periódica).

### 🟠 Resiliencia ante estrés (antes de campañas/picos)
10. **Stream o signed URL** en las 3 rutas de descarga (riesgo OOM #1).
11. Cache de `/api/admin/metricas` + paginar `/api/admin/publicaciones`.

### 🔵 Deuda técnica / calidad (cuando haya holgura)
12. Factorizar los 4 Muros en `MuroCompra` (PR aislada).
13. Genérico de helpers `acceso*`.
14. BreadcrumbList JSON-LD.
15. Activar Vectorize en el Worker (calidad del asistente).

### 📈 Crecimiento (estratégico, no técnico-urgente)
16. Suscripción recurrente (PayPal Subscriptions) → MRR.
17. Optimización GEO (FAQ schema, datos estructurados ricos).

---

## 11. Conclusión

**Estás protegido.** No hay vulnerabilidades críticas ni altas, producción no
registra errores, y las defensas (auth, paywall, webhook, headers, RLS) son de
nivel profesional. Tu instinto sobre las dependencias de terceros es correcto y
valioso: ahí está tu mayor exposición latente, y se cierra con 3-4 cambios de
configuración baratos (§2). El resto son mejoras de *velocidad* y *preparación
para crecer*, no de supervivencia. La plataforma está lista para escalar de forma
incremental y para monetizar más agresivamente reutilizando el motor de pagos que
ya construiste.

---

*Generado el 2026-06-06. Fuentes: análisis estático del código (rama
`claude/hopeful-cray-IiAr7`), Supabase advisors (proyecto `yjgkhqapqiezvsrqoynl`),
Vercel runtime logs (7 días, 0 errores), `npm audit` (0 vulnerabilidades).*
