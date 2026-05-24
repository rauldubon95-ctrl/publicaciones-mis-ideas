#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// migrate-chunks.js — Migrar chunks existentes al nuevo schema
//
// Este script lee la D1 existente, detecta la estructura vieja,
// y migra los datos al nuevo schema (documents + doc_chunks + FTS)
//
// USO:
//   node scripts/migrate-chunks.js
//
// PREREQUISITOS:
//   - Wrangler autenticado (wrangler login)
//   - .env.local con CLOUDFLARE_ACCOUNT_ID y D1_DATABASE_ID
//   - Nuevo schema ya aplicado (scripts/setup-d1.sh ejecutado)
// ─────────────────────────────────────────────────────────────

const { execSync } = require("child_process");
const DB_NAME = "sociologia-knowledge";

function d1Query(sql, params = []) {
  const paramStr = params.map((p) => JSON.stringify(p)).join(", ");
  const query = params.length > 0 ? `${sql} -- params: ${paramStr}` : sql;
  try {
    const result = execSync(
      `wrangler d1 execute "${DB_NAME}" --command "${sql.replace(/"/g, '\\"')}" --json --remote`,
      { encoding: "utf8" }
    );
    return JSON.parse(result);
  } catch (e) {
    console.error("Error ejecutando query:", e.message);
    return null;
  }
}

async function main() {
  console.log("=== Migración de chunks al nuevo schema ===\n");

  // 1. Detectar tablas existentes
  console.log("1. Detectando tablas existentes...");
  const tablas = d1Query("SELECT name FROM sqlite_master WHERE type='table'");
  if (!tablas) {
    console.error("Error: No se puede conectar a D1");
    process.exit(1);
  }

  const nombresTablas = tablas[0]?.results?.map((r) => r.name) ?? [];
  console.log("   Tablas encontradas:", nombresTablas.join(", "));

  // 2. Verificar si ya existe el nuevo schema
  const tieneDocuments = nombresTablas.includes("documents");
  const tieneChunks = nombresTablas.includes("doc_chunks");

  if (!tieneDocuments || !tieneChunks) {
    console.error(
      "\n❌ El nuevo schema no está aplicado. Ejecuta primero: bash scripts/setup-d1.sh"
    );
    process.exit(1);
  }

  // 3. Detectar tabla vieja de chunks
  const tablaVieja = nombresTablas.find(
    (n) =>
      n !== "doc_chunks" &&
      (n.includes("chunk") ||
        n.includes("documento") ||
        n.includes("pdf") ||
        n.includes("publicacion") ||
        n.includes("content"))
  );

  if (!tablaVieja) {
    console.log("\n⚠️  No se encontró tabla vieja de chunks. Puede que la migración ya se haya realizado.");
    console.log("   Si tienes los PDFs en R2, usa el pipeline de ingestion nuevo.");
    process.exit(0);
  }

  console.log(`\n2. Tabla de origen detectada: ${tablaVieja}`);

  // 4. Detectar columnas de la tabla vieja
  const columnas = d1Query(`PRAGMA table_info(${tablaVieja})`);
  const nombresColumnas = columnas?.[0]?.results?.map((c) => c.name) ?? [];
  console.log("   Columnas:", nombresColumnas.join(", "));

  const colContenido = nombresColumnas.find(
    (c) => c === "content" || c === "contenido" || c === "texto" || c === "text"
  );
  const colTitulo = nombresColumnas.find(
    (c) => c === "title" || c === "titulo" || c === "nombre" || c === "name"
  );
  const colId = nombresColumnas.find((c) => c === "id");

  if (!colContenido) {
    console.error("❌ No se pudo identificar la columna de contenido");
    process.exit(1);
  }

  // 5. Contar registros a migrar
  const count = d1Query(`SELECT COUNT(*) as total FROM ${tablaVieja}`);
  const total = count?.[0]?.results?.[0]?.total ?? 0;
  console.log(`\n3. Registros a migrar: ${total}`);

  if (total === 0) {
    console.log("⚠️  No hay registros en la tabla vieja.");
    process.exit(0);
  }

  // 6. Crear documento genérico para chunks sin metadata
  console.log("\n4. Creando documento base para chunks migrados...");
  const docId = "doc_migrated_legacy";
  d1Query(
    `INSERT OR IGNORE INTO documents (id, source_file, title, status, trust_score, language, indexed_at) VALUES ('${docId}', 'legacy_migration', 'Corpus Documental (Migrado)', 'indexed', 0.7, 'es', ${Date.now()})`
  );

  // 7. Migrar en batches de 50
  console.log("\n5. Migrando chunks...");
  const batchSize = 50;
  let offset = 0;
  let migrados = 0;

  while (offset < total) {
    const batch = d1Query(
      `SELECT ${colId ? colId : "rowid"} as id, ${colContenido} as contenido${colTitulo ? `, ${colTitulo} as titulo` : ""} FROM ${tablaVieja} LIMIT ${batchSize} OFFSET ${offset}`
    );

    const registros = batch?.[0]?.results ?? [];
    if (registros.length === 0) break;

    for (const r of registros) {
      if (!r.contenido) continue;
      const chunkId = `chunk_${docId}_${offset + migrados}`;
      const contenido = String(r.contenido).slice(0, 2000).replace(/'/g, "''");
      const tokenCount = Math.ceil(contenido.length / 4);

      d1Query(
        `INSERT OR IGNORE INTO doc_chunks (id, doc_id, chunk_index, content, token_count) VALUES ('${chunkId}', '${docId}', ${offset + migrados}, '${contenido}', ${tokenCount})`
      );
      migrados++;
    }

    offset += batchSize;
    process.stdout.write(`\r   Migrados: ${migrados}/${total}`);
  }

  console.log(`\n\n✓ Migración completada: ${migrados} chunks migrados`);
  console.log("\nPróximos pasos:");
  console.log("  1. Los chunks migrados usarán LIKE retrieval hasta que se generen embeddings");
  console.log("  2. Para retrieval FTS, asegúrate de que el trigger FTS esté activo");
  console.log("  3. Para retrieval semántico (Phase 3), ejecuta el pipeline de embeddings");
}

main().catch(console.error);
