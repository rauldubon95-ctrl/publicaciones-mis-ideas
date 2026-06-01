-- ============================================================
-- Migración: Respuestas a cotizaciones — sesión 17 / Fase 3
-- Fecha: 2026-06-01
-- Aplica en Supabase SQL editor tras mergear feature/quote-replies.
-- ============================================================

-- 1. Añadir campo respondidaAt a SolicitudCotizacion.
--    El campo estado ya existe (PENDIENTE/REVISADO/ARCHIVADO); aceptamos
--    además el valor RESPONDIDA. No usamos enum nativo de Postgres porque
--    Prisma maneja el estado como String.
ALTER TABLE "SolicitudCotizacion"
  ADD COLUMN IF NOT EXISTS "respondidaAt" TIMESTAMP(3);

-- 2. Tabla RespuestaCotizacion — historial de envíos a una cotización.
CREATE TABLE IF NOT EXISTS "RespuestaCotizacion" (
  "id"               TEXT NOT NULL,
  "cotizacionId"     TEXT NOT NULL,
  "asunto"           TEXT NOT NULL,
  "cuerpoHtml"       TEXT NOT NULL,
  "cuerpoTexto"      TEXT NOT NULL,
  "enviadoPor"       TEXT NOT NULL,
  "resendMessageId"  TEXT,
  "estadoEnvio"      TEXT NOT NULL DEFAULT 'PENDIENTE',
  "errorMensaje"     TEXT,
  "creadoAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RespuestaCotizacion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RespuestaCotizacion_cotizacionId_fkey"
    FOREIGN KEY ("cotizacionId") REFERENCES "SolicitudCotizacion"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RespuestaCotizacion_cotizacionId_idx" ON "RespuestaCotizacion"("cotizacionId");
CREATE INDEX IF NOT EXISTS "RespuestaCotizacion_estadoEnvio_idx" ON "RespuestaCotizacion"("estadoEnvio");
CREATE INDEX IF NOT EXISTS "RespuestaCotizacion_creadoAt_idx"    ON "RespuestaCotizacion"("creadoAt");

-- 3. RLS — patrón permisivo (todo el acceso pasa por server con service_role).
ALTER TABLE "RespuestaCotizacion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adm_respuestacotizacion" ON "RespuestaCotizacion"
  FOR ALL USING (true) WITH CHECK (true);
