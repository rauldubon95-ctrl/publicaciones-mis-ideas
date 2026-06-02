# Auditoría de seguridad y resiliencia — 2026-06-02

Rama: `claude/auditoria-resilencia-2026-06-02`
Proyecto Supabase: `yjgkhqapqiezvsrqoynl` (publicaciones-mis-ideas)

Este documento registra los hallazgos de la auditoría, su severidad, el fix
aplicado y el SQL de rollback cuando aplica. Los cambios de base de datos se
aplicaron directamente en producción (autorizados por el dueño) porque cerraban
exposiciones activas; el código va por esta rama para revisión.

---

## Resumen de hallazgos

| ID | Sev | Descripción | Estado |
|----|-----|-------------|--------|
| C1 | 🔴 CRÍTICO | `anon` (clave pública) podía leer/escribir `PedidoLibro/Recurso/Dashboard` + `RespuestaCotizacion` vía PostgREST → bypass de paywall (tokens), fuga de PII (emails) y manipulación de pedidos | ✅ Corregido |
| H2 | 🟠 ALTO | `anon` podía leer el HTML completo de `RecursoHtml` (recursos premium) | ✅ Corregido |
| H3 | 🟠 ALTO | `anon` podía INSERT/DELETE objetos en el bucket `comics` (subida arbitraria / borrado masivo) | ✅ Corregido |
| H1 | 🟡 MEDIO | Buckets `libros` (PDF) y `datos` (Excel) públicos → un comprador puede recompartir la URL permanente del archivo | ✅ Mitigado (streaming) |
| M1 | 🟡 MEDIO | Llamadas a servicios externos (PayPal/Resend/Worker/D1) sin timeout/AbortController | ✅ Corregido (en producción) |
| Caching | 🟢 ROI | Páginas públicas sin cache (`force-dynamic`) → carga DB + latencia | ✅ `unstable_cache` en 8 páginas (en producción) |
| M2 | 🟡 MEDIO | CSP con `script-src 'unsafe-inline'` | ⏳ Pendiente (próxima sesión, requiere nonces — rama aislada + preview) |
| M3 | ⚪ — | "vuln de `xlsx`" → **NO aplica**: el código usa `exceljs`, `xlsx` no es dependencia | ✅ Sin acción |
| M4 | 🟡 MEDIO | `req.json()` sin try/catch en `/api/publicaciones` POST y `/admin/tableros/[id]` PUT (500 ante body inválido) | ✅ Corregido (esta rama) |
| L1 | 🔵 BAJO | `lectura_publica_comentario` expone comentarios a `anon` (sin email; solo `autorNombre`, ya público) | ℹ️ Aceptado |
| L2 | 🔵 BAJO | Enumeración de archivos del bucket `datos` (listing) | ✅ Corregido |

---

## C1 — RLS permisivo + grants `anon` en tablas de pedidos (CRÍTICO)

**Riesgo:** la app NO usa la clave `anon` (todo el acceso es por Prisma con
conexión directa + service role). Sin embargo, las tablas tenían políticas RLS
`FOR ALL TO public USING(true) WITH CHECK(true)`. Con la `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(embebida en el navegador) cualquiera podía, vía PostgREST:
- Leer `tokenAcceso` de todos los pedidos → entrar gratis a todo el contenido de
  pago (el magic link concede acceso solo con el token).
- Leer `emailComprador`/`nombreComprador` → fuga de datos personales.
- INSERT/UPDATE/DELETE → falsificar/borrar pedidos.

**Fix aplicado (DDL en producción):**
```sql
DROP POLICY IF EXISTS "adm_pedidolibro"          ON public."PedidoLibro";
DROP POLICY IF EXISTS "adm_pedidorecurso"        ON public."PedidoRecurso";
DROP POLICY IF EXISTS "adm_pedidodashboard"      ON public."PedidoDashboard";
DROP POLICY IF EXISTS "adm_respuestacotizacion"  ON public."RespuestaCotizacion";
```
Las tablas quedan con RLS activo y sin política → `anon` denegado (igual que
`PedidoContenido`, que ya estaba bien). Prisma no se ve afectado.

**Rollback (NO recomendado — reabre el agujero):**
```sql
CREATE POLICY "adm_pedidolibro"         ON public."PedidoLibro"         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "adm_pedidorecurso"       ON public."PedidoRecurso"       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "adm_pedidodashboard"     ON public."PedidoDashboard"     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "adm_respuestacotizacion" ON public."RespuestaCotizacion" FOR ALL USING (true) WITH CHECK (true);
```

---

## H2 — `RecursoHtml` legible por `anon` (ALTO)

**Riesgo:** `lectura_publica_recurso_html` (SELECT, `USING(true)`) permitía a
`anon` leer la columna `contenido` (HTML completo) de **recursos premium** →
bypass de paywall. La app sirve el HTML por API (Prisma), no por la anon key.

**Fix aplicado:**
```sql
DROP POLICY IF EXISTS "lectura_publica_recurso_html" ON public."RecursoHtml";
```
**Rollback:**
```sql
CREATE POLICY "lectura_publica_recurso_html" ON public."RecursoHtml" FOR SELECT TO anon, authenticated USING (true);
```

También se quitaron las políticas `ALL` que permitían **escritura anónima** en
`Libro` y `DescargaLibro` (se conservó el SELECT público de catálogo):
```sql
DROP POLICY IF EXISTS "adm_libro"    ON public."Libro";
DROP POLICY IF EXISTS "adm_descarga" ON public."DescargaLibro";
```

---

## H3 — Bucket `comics` permitía INSERT/DELETE anónimo (ALTO)

**Riesgo:** `storage.objects` tenía `comics_subir` (INSERT) y `comics_eliminar`
(DELETE) para `public` → cualquiera con la anon key podía subir archivos
arbitrarios al dominio o borrar todas las imágenes de cómics. La subida real usa
*presigned URLs* (service role), así que estas políticas eran innecesarias.

**Fix aplicado:**
```sql
DROP POLICY IF EXISTS "comics_subir"    ON storage.objects;
DROP POLICY IF EXISTS "comics_eliminar" ON storage.objects;
```
**Rollback:**
```sql
CREATE POLICY "comics_subir"    ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'comics');
CREATE POLICY "comics_eliminar" ON storage.objects FOR DELETE TO public USING (bucket_id = 'comics');
```

---

## L2 — Enumeración del bucket `datos` (BAJO)

**Fix aplicado:** se quitó la política de listado. Las URLs públicas directas
siguen funcionando (bucket público), pero ya no se puede enumerar el contenido.
```sql
DROP POLICY IF EXISTS "datos_lectura_publica" ON storage.objects;
```
**Rollback:**
```sql
CREATE POLICY "datos_lectura_publica" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'datos');
```

---

## M4 — `req.json()` sin try/catch (MEDIO) — corregido en código

- `app/api/publicaciones/route.ts` (POST) y `app/api/admin/tableros/[id]/route.ts`
  (PUT) ahora hacen `await req.json().catch(() => null)` y devuelven 400 ante
  body inválido en vez de un 500 sin controlar.

---

## H1 — Buckets públicos (`libros`, `datos`) (MEDIO) — en curso

Tras cerrar C1 (el bypass por token), el riesgo residual es que un comprador
legítimo recomparta la URL **permanente** del archivo, o que se adivine un path
(los paths llevan timestamp y ya no son enumerables).

Restricciones descubiertas:
- El bucket `libros` mezcla PDFs (sensibles) y portadas (deben ser públicas para
  `next/image`) → privatizar el bucket entero rompe las portadas.
- Los dashboards usan un iframe de **Office Online**
  (`view.officeapps.live.com/op/embed.aspx?src=<archivoUrl público>`) que
  requiere una URL accesible públicamente.

**Decisión tomada: opción 1 (streaming por endpoint).** Implementado en esta rama:
- `lib/supabase-admin.ts`: nuevo helper `descargarDesdeBucket(bucket, urlOrPath)`
  que baja el objeto con el service role a partir de su URL pública o path.
- `app/api/libros/[slug]/descargar/route.ts`: en vez de `redirect(302)` a la URL
  pública, valida acceso y reenvía el PDF como stream (`runtime = "nodejs"`).
- `app/api/dashboard/[id]/descargar/route.ts`: ídem para el Excel.

Así la URL permanente del bucket nunca se entrega al cliente y no puede
recompartirse. Coste: ancho de banda de Vercel (PDFs ≤50MB, Excel ≤10MB).

**Residual documentado:** la vista "Dashboard (gráficas)" usa un iframe de Office
Online (`app/dashboard/[id]/page.tsx:225`) con `tablero.archivoUrl` público; un
comprador con acceso aún puede copiar esa URL. Cerrarlo requiere privatizar
`datos` + servir el iframe con signed URL (frágil) — queda para una revisión
separada. El bucket ya no es enumerable (L2 cerrado), así que no hay forma de
descubrir esa URL sin tener acceso al dashboard.

**Pendiente operativo (opcional):** los buckets siguen marcados como públicos
para no romper portadas (`libros`) ni el iframe (`datos`). El streaming hace que
eso ya no exponga los archivos de pago a quien no tenga la URL exacta.

---

## Pendientes (PRs aparte)

- **M1** — añadir `AbortController` (timeout 5–10s) a fetch externos
  (PayPal/Resend/Worker/D1). Resiliencia ante terceros lentos.
- **M2** — CSP sin `unsafe-inline` (nonces vía middleware).
- **Fase 3** — caching/`revalidate`, límites de plan (Vercel/CF/Resend),
  fallback ante caída de terceros, observabilidad (`/api/health/deep`).
</content>
</invoke>
