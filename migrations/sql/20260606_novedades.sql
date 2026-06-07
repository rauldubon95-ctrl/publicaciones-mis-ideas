-- Novedades del panel lateral de la home (sesión 27). Anuncios curados que
-- redirigen a artículos externos / avisos de conferencias. Auto-caducan por
-- expiraAt. RLS habilitado SIN políticas (deny-by-default): la app las maneja
-- con Prisma (conexión directa que bypassa RLS), nunca con la anon key —
-- consistente con el resto de tablas tras el cierre de C1 (sesión 18).

CREATE TABLE IF NOT EXISTS "Novedad" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titulo"     TEXT NOT NULL,
  "textoCorto" TEXT,
  "url"        TEXT NOT NULL,
  "tipo"       TEXT NOT NULL DEFAULT 'articulo',
  "activo"     BOOLEAN NOT NULL DEFAULT true,
  "orden"      INTEGER NOT NULL DEFAULT 0,
  "expiraAt"   TIMESTAMP(3),
  "creadoAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Novedad_activo_expiraAt_idx" ON "Novedad" ("activo", "expiraAt");
CREATE INDEX IF NOT EXISTS "Novedad_orden_idx" ON "Novedad" ("orden");

-- RLS deny-by-default (sin políticas): solo el service role / conexión directa
-- de Prisma puede leer/escribir. La anon key queda bloqueada.
ALTER TABLE "Novedad" ENABLE ROW LEVEL SECURITY;
