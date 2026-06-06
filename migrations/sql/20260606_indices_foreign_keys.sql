-- Índices de foreign keys faltantes (detectados por el advisor de rendimiento
-- de Supabase, 2026-06-06). Sin estos índices, los JOINs y los borrados en
-- cascada hacen scans secuenciales — barato hoy con pocas filas, costoso al
-- crecer. Aditivo y reversible (DROP INDEX). IF NOT EXISTS por idempotencia.
--
-- Nota: DescargaLibro ya declaraba @@index([libroId]) en el schema de Prisma
-- pero el índice nunca llegó a la base (deriva schema↔DB). Este lo crea.

CREATE INDEX IF NOT EXISTS "DescargaLibro_libroId_idx"
  ON "DescargaLibro" ("libroId");

CREATE INDEX IF NOT EXISTS "Publicacion_categoriaId_idx"
  ON "Publicacion" ("categoriaId");

CREATE INDEX IF NOT EXISTS "PublicacionEtiqueta_etiquetaId_idx"
  ON "PublicacionEtiqueta" ("etiquetaId");
