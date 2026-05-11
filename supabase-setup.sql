-- ============================================================
-- PASO 1: Copia todo este texto
-- PASO 2: Ve a supabase.com → tu proyecto → SQL Editor
-- PASO 3: Pega y haz click en "Run"
-- ¡Listo! Las tablas quedan creadas.
-- ============================================================

CREATE TABLE IF NOT EXISTS "Categoria" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "nombre"      TEXT NOT NULL UNIQUE,
  "slug"        TEXT NOT NULL UNIQUE,
  "descripcion" TEXT
);

CREATE TABLE IF NOT EXISTS "Etiqueta" (
  "id"     TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "slug"   TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Publicacion" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "titulo"        TEXT NOT NULL,
  "slug"          TEXT NOT NULL UNIQUE,
  "resumen"       TEXT NOT NULL,
  "contenido"     TEXT NOT NULL,
  "publicado"     BOOLEAN NOT NULL DEFAULT false,
  "creadoAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publicadoAt"   TIMESTAMP(3),
  "categoriaId"   TEXT REFERENCES "Categoria"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "PublicacionEtiqueta" (
  "publicacionId" TEXT NOT NULL REFERENCES "Publicacion"("id") ON DELETE CASCADE,
  "etiquetaId"    TEXT NOT NULL REFERENCES "Etiqueta"("id") ON DELETE CASCADE,
  PRIMARY KEY ("publicacionId", "etiquetaId")
);

CREATE TABLE IF NOT EXISTS "Comentario" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "contenido"     TEXT NOT NULL,
  "autorNombre"   TEXT NOT NULL,
  "publicacionId" TEXT NOT NULL REFERENCES "Publicacion"("id") ON DELETE CASCADE,
  "creadoAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Reaccion" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "tipo"          TEXT NOT NULL,
  "publicacionId" TEXT NOT NULL REFERENCES "Publicacion"("id") ON DELETE CASCADE,
  "sessionId"     TEXT NOT NULL,
  UNIQUE ("publicacionId", "sessionId", "tipo")
);

-- Categorias iniciales
INSERT INTO "Categoria" ("id", "nombre", "slug", "descripcion")
VALUES
  ('cat_reflexion', 'Reflexión',  'reflexion', 'Pensamientos y reflexiones personales'),
  ('cat_ideas',     'Ideas',      'ideas',     'Proyectos e ideas en desarrollo'),
  ('cat_proyectos', 'Proyectos',  'proyectos', 'Proyectos en marcha')
ON CONFLICT DO NOTHING;

-- Post de bienvenida
INSERT INTO "Publicacion" ("id", "titulo", "slug", "resumen", "contenido", "publicado", "publicadoAt", "categoriaId")
VALUES (
  'pub_bienvenida',
  'Bienvenido a Mis Ideas',
  'bienvenido-a-mis-ideas',
  'Este es el primer post del sistema. Aquí compartiré reflexiones, proyectos e ideas.',
  E'# Bienvenido a Mis Ideas\n\nEste espacio nació para **divulgar reflexiones** y dar vida a ideas que merecen ser compartidas.\n\n## ¿Qué encontrarás aquí?\n\n- Reflexiones personales sobre tecnología y vida\n- Ideas en desarrollo y proyectos\n- Análisis y observaciones del mundo\n\n¡Gracias por estar aquí!',
  true,
  CURRENT_TIMESTAMP,
  'cat_reflexion'
)
ON CONFLICT DO NOTHING;
