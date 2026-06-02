-- ============================================================
-- Migración: Dashboards premium — sesión 17 / Fase 5
-- Fecha: 2026-06-01
-- Aplica en Supabase SQL editor tras mergear feature/dashboard-monetization.
-- ============================================================

-- 1. Añadir campos premium a Tablero.
ALTER TABLE "Tablero"
  ADD COLUMN IF NOT EXISTS "esPremium"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "precioCentavos"  INTEGER,
  ADD COLUMN IF NOT EXISTS "resumenPublico"  TEXT;

-- 2. Tabla PedidoDashboard — espejo de PedidoRecurso, FK a Tablero.
CREATE TABLE IF NOT EXISTS "PedidoDashboard" (
  "id"              TEXT NOT NULL,
  "tableroId"       TEXT NOT NULL,
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

  CONSTRAINT "PedidoDashboard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PedidoDashboard_paypalOrderId_key" UNIQUE ("paypalOrderId"),
  CONSTRAINT "PedidoDashboard_tokenAcceso_key"   UNIQUE ("tokenAcceso"),
  CONSTRAINT "PedidoDashboard_tableroId_fkey"
    FOREIGN KEY ("tableroId") REFERENCES "Tablero"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PedidoDashboard_emailComprador_idx"   ON "PedidoDashboard"("emailComprador");
CREATE INDEX IF NOT EXISTS "PedidoDashboard_estado_idx"           ON "PedidoDashboard"("estado");
CREATE INDEX IF NOT EXISTS "PedidoDashboard_tableroId_estado_idx" ON "PedidoDashboard"("tableroId", "estado");
CREATE INDEX IF NOT EXISTS "PedidoDashboard_creadoAt_idx"         ON "PedidoDashboard"("creadoAt");

-- 3. RLS — patrón permisivo.
ALTER TABLE "PedidoDashboard" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adm_pedidodashboard" ON "PedidoDashboard"
  FOR ALL USING (true) WITH CHECK (true);
