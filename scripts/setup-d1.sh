#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# setup-d1.sh — Inicializar D1 con el schema del sistema AI
#
# USO:
#   1. Instalar Wrangler: npm install -g wrangler
#   2. Autenticarse: wrangler login
#   3. Crear la base de datos: wrangler d1 create sociologia-knowledge
#   4. Copiar el database_id al wrangler.toml
#   5. Ejecutar este script: bash scripts/setup-d1.sh
#
# IMPORTANT: Este script es IDEMPOTENTE (puede ejecutarse múltiples veces)
# ─────────────────────────────────────────────────────────────

set -e  # Salir en error

DB_NAME="sociologia-knowledge"
echo "Aplicando migraciones a D1: $DB_NAME"

# Migration 1: Schema inicial
echo "→ Migration 0001: schema inicial..."
wrangler d1 execute "$DB_NAME" \
  --file=migrations/d1/0001_initial_schema.sql \
  --remote

echo "→ Migration 0002: FTS5 + telemetría..."
wrangler d1 execute "$DB_NAME" \
  --file=migrations/d1/0002_add_fts_and_telemetry.sql \
  --remote

echo ""
echo "✓ Migraciones aplicadas correctamente"
echo ""
echo "Próximos pasos:"
echo "  1. Actualizar workers/sociologia/wrangler.toml con el database_id"
echo "  2. Crear KV namespace: wrangler kv:namespace create 'SOCIOLOGIA_KV'"
echo "  3. Actualizar wrangler.toml con el KV namespace id"
echo "  4. Configurar secret: wrangler secret put PREMIUM_TOKEN_HASH"
echo "     (el valor es el output de /api/asistente/token en el Next.js app)"
echo "  5. Desplegar: cd workers/sociologia && wrangler deploy"
