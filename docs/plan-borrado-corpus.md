# Plan de borrado del corpus de terceros (D1 + Vectorize)

> **Sesión 41.** Pasos para retirar de la base los textos de terceros con
> riesgo (categorías TERCEROS_COPYRIGHT y CONFIDENCIAL_POSIBLE de
> `docs/inventario-corpus-derechos.md`).
>
> **Estos pasos los ejecutas TÚ en la consola de Cloudflare.** El borrado masivo
> desde la IA está bloqueado por una salvaguarda (evita que un asistente borre
> datos en lote). El asistente **ya** dejó de usar estos documentos (lista
> blanca en el worker), así que no hay urgencia de minutos; pero guardar copias
> de libros pirateados es en sí un riesgo, conviene depurarlo.

---

## Orden recomendado

1. **Confirmar la lista final** contra `docs/inventario-corpus-derechos.md`.
   Antes de borrar, decide sobre CONFIDENCIAL_POSIBLE (§5 del inventario): marca
   cuáles son tuyos (se quedan o pasan a lista blanca) y cuáles de cliente (se
   borran).
2. **Exportar respaldo** (opcional pero recomendado): en la consola D1, exporta
   la tabla `documentos` o guarda un dump antes de borrar. El borrado no es
   reversible.
3. **Borrar de D1** (tabla `documentos` + índice FTS).
4. **Purgar Vectorize** (los vectores NO se borran solos al borrar de D1).
5. **Re-vectorizar** el corpus limpio desde `/admin/embed-backfill`.

---

## Paso 3 — Borrar de D1

En **Cloudflare Dashboard → Workers & Pages → D1 → `llm_sociolog` → Console**.

> Sustituye la lista de ids por la definitiva del inventario. Ejemplo con los
> ids de alta confianza de la §4 del inventario (verifícalos antes):

```sql
-- 1) Ver qué se va a borrar ANTES de borrar (revisión)
SELECT id, titulo, fuente FROM documentos WHERE id IN (
  11,12,19,68,245,275,324,404,421,571,609,645,686,703,725,771,772,773,781,998,
  1204,1213,1231,1239,1260,1266,1278,1297,1310,1359,1410,1412,1414,1417,1433,
  1438,1443,1444,1445,1446,1448,1449,1450,1451,1453,1477,1502,1507,1519,1528,
  1562,1566,1568,1569,1594,1595,1673,1674,1733
);

-- 2) Borrar (cuando la lista de arriba sea la correcta)
DELETE FROM documentos WHERE id IN ( /* … misma lista … */ );

-- 3) Reconstruir el índice FTS para que no queden referencias colgando
INSERT INTO documentos_fts(documentos_fts) VALUES('rebuild');
```

> **Nota:** la lista de arriba es la de **alta confianza** (§4). Los candidatos
> de bajo riesgo (§6: normativa, dominio público, acceso abierto, informes de
> organismos) NO se borran por defecto — se revisan para *promoverlos* a la
> lista blanca del asistente. La decisión de conservarlos como material de
> lectura/insumo tuyo es aparte del asistente.

Quedó pendiente de sesión 39 borrar además ids sensibles/basura:
`DELETE FROM documentos WHERE id IN (260,257,271,985,1262);` + rebuild.

---

## Paso 4 — Purgar Vectorize

El índice `sociologia-embeddings` conserva un vector por cada id, aunque el doc
ya no exista en D1. Dos opciones:

- **Opción A (simple, recomendada):** borrar y recrear el índice completo, luego
  re-vectorizar solo lo que quede en D1. En la consola/CLI de Cloudflare:
  ```
  wrangler vectorize delete sociologia-embeddings
  wrangler vectorize create sociologia-embeddings --dimensions=1024 --metric=cosine
  ```
  (o desde el Dashboard → AI → Vectorize). El binding en `wrangler.toml` no
  cambia (mismo nombre).
- **Opción B (quirúrgica):** implementar un endpoint admin que llame
  `env.VECTORIZE.deleteByIds([...])` con los ids borrados. Requiere código nuevo
  en el worker. Solo vale la pena si el corpus válido es grande y re-vectorizar
  todo es caro. Hoy no lo es.

---

## Paso 5 — Re-vectorizar

Tras limpiar D1 y el índice, entra a **`/admin/embed-backfill`** y corre el
backfill. Con la lista blanca activa, el asistente solo recuperará lo permitido
aunque el índice tuviera de más; pero re-vectorizar solo lo limpio mantiene el
índice ordenado y barato.

---

## Verificación final

```sql
SELECT tipo, COUNT(*) FROM documentos GROUP BY tipo;
```
Y una prueba en el chat: preguntar por un tema que solo cubría un libro de
terceros (p. ej. algo muy específico de un manual borrado) → el asistente debe
responder "no tengo información suficiente", no citar el libro.
