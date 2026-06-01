-- ============================================================
-- Migración: Recursos premium — sesión 17 / Fase 4
-- Fecha: 2026-06-01
-- Aplica en Supabase SQL editor tras mergear feature/resource-monetization.
-- ============================================================

-- 1. Añadir campos premium a RecursoHtml.
ALTER TABLE "RecursoHtml"
  ADD COLUMN IF NOT EXISTS "esPremium"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "precioCentavos"  INTEGER,
  ADD COLUMN IF NOT EXISTS "resumenPublico"  TEXT;

-- 2. Tabla PedidoRecurso — espejo de PedidoLibro.
CREATE TABLE IF NOT EXISTS "PedidoRecurso" (
  "id"              TEXT NOT NULL,
  "recursoId"       TEXT NOT NULL,
  "emailComprador"  TEXT NOT NULL,
  "nombreComprador" TEXT,
  "montoCentavos"   INTEGER NOT NULL,
  "moneda"          TEXT NOT NULL DEFAULT 'USD',
  "paypalOrderId"   TEXT,
  "estado"          TEXT NOT NULL DEFAULT 'PENDIENTE',
  "tokenAcceso"     TEXT NOT NULL,
  "creadoAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completadoAt"    TIMESTAMP(3),
  "ultimoAccesoAt"  TIMESTAMP(3),

  CONSTRAINT "PedidoRecurso_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PedidoRecurso_paypalOrderId_key" UNIQUE ("paypalOrderId"),
  CONSTRAINT "PedidoRecurso_tokenAcceso_key"   UNIQUE ("tokenAcceso"),
  CONSTRAINT "PedidoRecurso_recursoId_fkey"
    FOREIGN KEY ("recursoId") REFERENCES "RecursoHtml"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PedidoRecurso_emailComprador_idx"   ON "PedidoRecurso"("emailComprador");
CREATE INDEX IF NOT EXISTS "PedidoRecurso_estado_idx"           ON "PedidoRecurso"("estado");
CREATE INDEX IF NOT EXISTS "PedidoRecurso_recursoId_estado_idx" ON "PedidoRecurso"("recursoId", "estado");
CREATE INDEX IF NOT EXISTS "PedidoRecurso_creadoAt_idx"         ON "PedidoRecurso"("creadoAt");

-- 3. RLS — patrón permisivo (acceso vía service_role desde servidor).
ALTER TABLE "PedidoRecurso" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adm_pedidorecurso" ON "PedidoRecurso"
  FOR ALL USING (true) WITH CHECK (true);
