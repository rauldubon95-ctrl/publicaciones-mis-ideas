-- Anti-reshare extendido a artículos, recursos y dashboards (sesión 21).
--
-- Replica la política de PedidoLibro (sesión 20) al resto de contenido de pago,
-- con una asimetría intencional por tipo:
--   * Recursos / Dashboards: la LECTURA en pantalla queda permanente; SOLO la
--     descarga del archivo caduca (30 días) y tiene tope (5). Por eso llevan
--     `descargas` + `expiraAccesoAt`.
--   * Artículos: no hay archivo descargable, así que SOLO se caduca la lectura.
--     Por eso PedidoContenido lleva `expiraAccesoAt` pero NO `descargas`.
--
-- Additive y retrocompatible: columnas nuevas nullable / default 0.
--   expiraAccesoAt = NULL  => pedido legacy: acceso permanente, sin tope.
--
-- NO se añaden políticas RLS. Las tablas siguen con RLS habilitado y 0 políticas
-- (anon/authenticated sin acceso vía PostgREST), preservando el cierre de C1 de
-- la auditoría (docs/auditoria-seguridad-2026-06-02.md §18). La app accede vía
-- Prisma (conexión directa), no la anon key.
--
-- Ya aplicada en Supabase (proyecto yjgkhqapqiezvsrqoynl) vía migración
-- `anti_reshare_recursos_dashboards_articulos`. Se versiona aquí para trazabilidad.

-- Artículos premium: solo caduca la LECTURA.
ALTER TABLE "PedidoContenido"
  ADD COLUMN IF NOT EXISTS "expiraAccesoAt" TIMESTAMP(3);

-- Recursos premium: caducidad + tope SOLO para la descarga del archivo.
ALTER TABLE "PedidoRecurso"
  ADD COLUMN IF NOT EXISTS "descargas" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "expiraAccesoAt" TIMESTAMP(3);

-- Dashboards premium: caducidad + tope SOLO para la descarga del archivo.
ALTER TABLE "PedidoDashboard"
  ADD COLUMN IF NOT EXISTS "descargas" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "expiraAccesoAt" TIMESTAMP(3);
