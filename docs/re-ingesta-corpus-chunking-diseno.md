# Re-ingesta del corpus con chunking — diseño (sesión 39)

> Estado: **DISEÑO, no implementado.** Requiere decisiones del usuario antes de
> tocar código (ver §7). No ejecutar sin acordar.

## 1. Problema (verificado contra D1 de producción)

La tabla `documentos` (D1 `llm_sociolog`) tiene 594 filas: 550 del corpus
(`tipo='articulo'`) + 43 publicaciones del sitio (`tipo='publicacion'`) + 1 skill.

Diagnóstico medido sobre los 550 del corpus:

- **Todos están truncados a exactamente 8.000 caracteres** (`MIN=606`,
  `AVG=7.628`, `MAX=8.000`). Es decir, de cada PDF —incluidos libros— solo se
  indexaron las **primeras ~2-3 páginas**. El asistente solo "ve" el inicio de
  cada fuente. Este es el verdadero techo de calidad de las respuestas.
- **Un solo fragmento (una fila / un vector) por fuente.** No hay chunking: un
  libro de 300 páginas y un artículo de 10 comparten el mismo tratamiento (un
  bloque de ≤8.000 chars).
- Los **títulos son el nombre de archivo crudo** del PDF (p. ej.
  `463972900 Sociologia del deporte pdf`). La sesión 39 los limpia al
  mostrarlos (`limpiarTitulo` en `workers/sociologia/src/fuentes.ts`), pero el
  dato crudo sigue en D1.

**Nota:** los "clusters" (deporte ~57, educación ~29, metodología ~28,
juventud ~18 por título) NO son ruido: incluyen trabajo del propio autor
(p. ej. "Economía invisible… Dubón 2024", "Decisiones metodológicas de un
CAMPUS sociodeportivo… José Raúl Dubón") y material de referencia legítimo.
No se recomienda podarlos.

## 2. Objetivo

Que el retrieval trabaje sobre el **texto completo** de cada fuente, partido en
**fragmentos (chunks)** semánticamente coherentes, cada uno con su propio
vector, de modo que:

- El asistente pueda citar cualquier parte de un documento, no solo su inicio.
- Los embeddings (bge-m3, multilingüe, sesión 39) capturen pasajes concretos.
- Las "Fuentes" sigan mostrándose por documento (no 5 chunks del mismo libro
  como 5 fuentes distintas).

## 3. Prerrequisito crítico — ¿dónde están los PDFs originales?

El corpus se cargó **por fuera del repo** (no hay script de ingesta de
`tipo='articulo'` en el código; `sync.ts` solo maneja `tipo='publicacion'`).
Para re-chunkear con el texto COMPLETO hace falta la fuente original de cada
PDF. Posibles ubicaciones a confirmar con el usuario:

- Supabase Storage (¿bucket propio del corpus?).
- Google Drive / disco local del autor.
- Si NO se conservan los PDFs: solo se puede re-chunkear el texto de 8.000
  chars ya guardado → mejora la granularidad del retrieval pero **no** recupera
  el contenido faltante. El salto de calidad grande exige los PDFs completos.

## 4. Cambios de esquema (dos opciones)

### Opción A — mínima (recomendada para empezar)
Mantener la tabla `documentos` y permitir **varias filas por fuente**:

```sql
ALTER TABLE documentos ADD COLUMN fuente_id INTEGER;   -- agrupa chunks de un mismo PDF
ALTER TABLE documentos ADD COLUMN chunk_idx INTEGER DEFAULT 0;
ALTER TABLE documentos ADD COLUMN titulo_limpio TEXT;  -- título ya normalizado
```

- Cada chunk = una fila con su `id` propio → su vector en Vectorize (id = id de
  fila, como hoy). Retrieval casi no cambia; solo hay que **agrupar por
  `fuente_id`** al armar `fuentes[]` para no repetir el mismo documento.
- FTS sigue funcionando (indexa por fila). Rebuild tras la carga.

### Opción B — tabla dedicada (más limpia, más refactor)
`fuentes(id, titulo, titulo_limpio, autor, anio, tipo, url)` +
`chunks(id, fuente_id, chunk_idx, texto, palabras)` + FTS sobre `chunks`.
Mejor a largo plazo; obliga a tocar `retrieval.ts`, `sync.ts` y el backfill.

## 5. Pipeline de ingesta (script, preferible en Python — stack del autor)

1. **Extraer** texto por PDF: `pymupdf`/`pdfplumber` (Python) o `pdfjs-dist`
   server-side. Conservar orden de páginas.
2. **Limpiar**: quitar cabeceras/pies repetidos, boilerplate de ResearchGate
   ("See discussions, stats…"), guiones de corte de línea.
3. **Chunkear**: ~800–1.200 tokens por chunk con ~150 de solape, respetando
   límites de párrafo. `bge-m3` acepta hasta ~8.192 tokens, así que el chunk
   entra holgado.
4. **Título limpio + metadata**: aplicar la misma lógica de `limpiarTitulo`;
   extraer autor/año cuando sea posible.
5. **Cargar a D1**: upsert de chunks (Opción A o B) + `INSERT INTO
   documentos_fts(documentos_fts) VALUES('rebuild')`.
6. **Re-embed con bge-m3** → Vectorize, `id = id del chunk`,
   `metadata = { fuente_id, titulo_limpio }`.

## 6. Vectorize — recrear el índice

Como cambian los ids (de documento a chunk) y el modelo (bge-large-en → bge-m3),
conviene **recrear** el índice para no dejar vectores huérfanos:

```bash
npx wrangler vectorize delete sociologia-embeddings
npx wrangler vectorize create sociologia-embeddings --dimensions=1024 --metric=cosine
```

(1024 dims sigue valiendo: bge-m3 densa = 1024.) Luego correr el backfill.

**Ojo (independiente de esto):** Vectorize **no** borra solo los vectores de
documentos eliminados de D1. Tras cualquier borrado en `documentos`, los
vectores viejos quedan (el retrieval los ignora porque filtra por `id IN` contra
D1, pero ocupan espacio). El re-embed/recreación los limpia.

## 7. Decisiones pendientes del usuario

1. **¿Se conservan los PDFs originales? ¿Dónde?** (bloqueante — ver §3).
2. **Opción A vs B** de esquema.
3. **Presupuesto de neuronas**: N chunks × costo de embedding bge-m3. Estimar
   tras conocer el nº real de chunks (depende de si se re-extraen los PDFs
   completos o solo se re-parte el texto actual).

## 8. Riesgos

- Sin los PDFs, la mejora es marginal (solo granularidad).
- El re-embed masivo consume neuronas; hacerlo una sola vez, reanudable (el
  backfill actual ya guarda progreso en KV).
- Recrear el índice deja el chat sin vía semántica hasta terminar el backfill;
  el retrieval cae a FTS (léxico), que tras la sesión 39 es sólido → aceptable.
