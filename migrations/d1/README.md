# migrations/d1 — ⚠️ NO EJECUTAR

Estos scripts (`0001_initial_schema.sql`, `0002_add_fts_and_telemetry.sql`)
describen una **arquitectura de D1 distinta e incompatible** con la base de
datos que corre hoy en producción. **No los ejecutes.**

## Qué corre en producción de verdad

La D1 real (`llm_sociolog`) tiene una sola tabla activa `documentos` +
su índice FTS `documentos_fts`. El esquema real está documentado en
`CLAUDE.md` §4. La sincronización de artículos del sitio la maneja el
endpoint `POST /sync` del Worker (`workers/sociologia/src/sync.ts`), no
estos archivos.

## Por qué se conservan

Solo como referencia histórica del diseño original. Si algún día se
implementa el chunking del corpus (ver `docs/re-ingesta-corpus-chunking-diseno.md`),
el esquema nuevo se diseñará desde cero, no a partir de estos scripts.
