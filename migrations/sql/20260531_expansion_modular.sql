-- ============================================================
-- Migración: Expansión modular — sesión 9
-- Fecha: 2026-05-31
-- Incluye: Subscription, EmailEnvio, Donacion + campos Categoria
-- ============================================================

-- 1. Ampliar modelo Categoria con icono e imagen
ALTER TABLE "Categoria"
  ADD COLUMN IF NOT EXISTS "icono"  TEXT,
  ADD COLUMN IF NOT EXISTS "imagen" TEXT;

-- 2. Suscriptores de correo (Double Opt-In)
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"             TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "nombre"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "token"          TEXT NOT NULL,
  "confirmedAt"    TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "creadoAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_email_key"  ON "Subscription"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_token_key"  ON "Subscription"("token");
CREATE        INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE        INDEX IF NOT EXISTS "Subscription_creadoAt_idx" ON "Subscription"("creadoAt");

-- 3. Registro de envíos masivos por correo (analítica Fase 7)
CREATE TABLE IF NOT EXISTS "EmailEnvio" (
  "id"            TEXT NOT NULL,
  "asunto"        TEXT NOT NULL,
  "publicacionId" TEXT,
  "totalEnviados" INTEGER NOT NULL DEFAULT 0,
  "totalAbiertos" INTEGER NOT NULL DEFAULT 0,
  "creadoAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailEnvio_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailEnvio_publicacionId_fkey"
    FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "EmailEnvio_publicacionId_idx" ON "EmailEnvio"("publicacionId");
CREATE INDEX IF NOT EXISTS "EmailEnvio_creadoAt_idx"      ON "EmailEnvio"("creadoAt");

-- 4. Donaciones — arquitectura preparada para Stripe (Fase 5)
CREATE TABLE IF NOT EXISTS "Donacion" (
  "id"       TEXT NOT NULL,
  "monto"    INTEGER NOT NULL,
  "moneda"   TEXT NOT NULL DEFAULT 'USD',
  "nombre"   TEXT,
  "correo"   TEXT,
  "stripeId" TEXT,
  "estado"   TEXT NOT NULL DEFAULT 'PENDIENTE',
  "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Donacion_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "Donacion_stripeId_key" UNIQUE ("stripeId")
);

CREATE INDEX IF NOT EXISTS "Donacion_estado_idx"   ON "Donacion"("estado");
CREATE INDEX IF NOT EXISTS "Donacion_creadoAt_idx" ON "Donacion"("creadoAt");
