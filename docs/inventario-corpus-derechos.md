# Inventario de derechos del corpus del asistente IA

> **Sesión 41 (2026-09-26).** Primera clasificación del corpus RAG por estatus
> de derechos de autor / confidencialidad. Base para (a) la **lista blanca** del
> asistente y (b) el **plan de borrado** en D1 + Vectorize.
>
> **Advertencia honesta:** esta clasificación es una **primera pasada por
> heurística** (nombre de archivo, título, autor, patrón de fuente). NO es un
> dictamen legal y NO tiene certeza item por item. Lo marcado como "revisar"
> necesita tu ojo humano. No soy abogado; un abogado debe validar el criterio.

---

## 1. Composición real (verificada en D1 `llm_sociolog`, 2026-09-26)

| tipo | n | Qué es |
|---|---|---|
| `articulo` | **545** | Textos de terceros (526 PDF + 19 md) |
| `publicacion` | **43** | **Tus artículos propios** (sync desde rauldubon.org) |
| `skill` | 1 | Interno |

**De los 545 `articulo`, solo 1 es de tu autoría** (id 253, "Economía invisible…
Dubón 2024"). Es decir: **~99,8% del corpus `articulo` es material de terceros.**

---

## 2. Categorías de clasificación

| Categoría | Significado legal (grueso, no dictamen) | Acción por defecto |
|---|---|---|
| **PROPIO** | Obra tuya. Puedes usarla libremente. | ✅ Lista blanca |
| **NORMATIVA_OFICIAL** | Leyes, decretos, Diario Oficial, estadística pública oficial. Las leyes y textos oficiales **no son objeto de derecho de autor** (principio general; confirmar edición). | ⚠️ Candidato a lista blanca tras revisar |
| **DOMINIO_PUBLICO** | Autor fallecido hace +70 años. **Ojo:** una *traducción* moderna tiene copyright propio del traductor aunque el original sea de dominio público. | ⚠️ Revisar traducción/edición |
| **ACCESO_ABIERTO** | Artículo de revista con licencia abierta (CC). Uso permitido **con atribución** y según la licencia (algunas prohíben uso comercial/derivadas). | ⚠️ Revisar licencia por artículo |
| **IGO_INFORME** | Informe de organismo (ONU, CEPAL, PNUD, UNICEF, UNESCO, BID, OCDE, Banco Mundial…). Tienen copyright del organismo; muchos permiten reproducción **con atribución y sin fines comerciales**. | ⚠️ Revisar términos del organismo |
| **TERCEROS_COPYRIGHT** | Libro/obra comercial con copyright vigente, o bajado de biblioteca pirata (Anna's Archive, z-lib, Scribd). **Riesgo alto.** | ❌ Excluir del asistente + borrar de la base |
| **CONFIDENCIAL_POSIBLE** | Documento de consultoría / política interna de una organización (posible cliente). Riesgo de **confidencialidad**, distinto al de copyright. | ❌ Excluir + preguntarte antes de nada |
| **REVISAR** | No clasificable por el nombre. | ❌ Fuera de la lista blanca hasta revisar |

**Estrategia elegida: lista blanca (opt-in), no lista negra.** Con 545 textos
mayoritariamente ajenos, es más seguro *permitir explícitamente lo verificado*
que *intentar bloquear lo malo* y arriesgar que algo se escape. El asistente
arranca con lo PROPIO y crece a medida que verifiques categorías libres.

---

## 3. PROPIO — semilla de la lista blanca ✅

- Los **43 `tipo='publicacion'`** (tus artículos del sitio) — siempre permitidos por regla (`tipo='publicacion'`).
- **id 253** — "Economía invisible: mujeres y su contribución en el deporte infantil (Dubón, 2024)". Único `articulo` de tu autoría detectado.

> **Pregunta para ti:** ¿hay otros `articulo` que sean tuyos (ponencias,
> informes de consultoría que TÚ redactaste y sobre los que conservas
> derechos, tesis propia)? Si me pasas los títulos o ids, los agrego a la
> lista blanca. Ejemplo candidato: id 1152 "Propuesta técnica y económica
> PNUD" — ¿es una propuesta **tuya**?

---

## 4. TERCEROS_COPYRIGHT — riesgo alto: excluir y borrar primero ❌

Libros comerciales, textos con ISBN, o bajados de bibliotecas piratas
(el nombre del archivo contiene "Anna's Archive", "z-lib.org", o un id de
Scribd). **Alta confianza.** Estos son los que primero deben salir del corpus
(del asistente y de la base):

| id | Título | Señal |
|---|---|---|
| 11 | Investigación feminista (Blázquez Graf) | Anna's Archive + ISBN |
| 19 | Metodología de la investigación (Bernal, Pearson) | Anna's Archive + ISBN |
| 12 | Jonathan Heath — Lo que indican los indicadores | Libro comercial |
| 68 | Bertrand Russell — La perspectiva científica | Traducción con copyright |
| 245 | Havemann — Dialéctica sin dogma | id Scribd 251689322 |
| 275 | Trotsky — En defensa del marxismo | id Scribd 94977489 (traducción) |
| 324 | Giddens — La transformación de la intimidad | Libro comercial |
| 404 | Milton Friedman — Capitalism and Freedom | Libro comercial |
| 421 | Cole — Historia del pensamiento socialista | Libro comercial |
| 571 | Larraín — El concepto de ideología (2007) | Libro comercial |
| 609 | Erich Fromm — El arte de amar | Libro comercial |
| 645 | Scurati — Fascismo y populismo | Libro comercial reciente |
| 686 | Goldstein — La cuarta ola extrema derecha | Libro comercial reciente |
| 703 | Laclau — Hegemonía y estrategia socialista | Libro comercial |
| 725 | Imperialismo humanitario | Libro comercial |
| 771, 772, 773 | Kant (Crítica razón práctica / Lo bello / Teoría y praxis) | Traducciones con copyright |
| 781 | Lyotard — La condición posmoderna | Libro comercial |
| 998 | Mike Davis — Planeta de ciudades miseria | Libro comercial |
| 1204 | Cómo hacer investigación cualitativa | id Scribd 126551713 |
| 1213 | Sociología del deporte | id Scribd 463972900 |
| 1231 | Visauta — Análisis estadístico con SPSS (McGraw Hill) | Libro comercial |
| 1239 | Avanessian & Reis — Aceleracionismo | Libro comercial |
| 1260 | Bolívar — Didáctica y currículum | Libro comercial |
| 1266 | Illades & Santiago — Estado de guerra | Libro comercial |
| 1278 | China en América Latina (Ray & Gallagher) | Libro comercial |
| 1297 | Cultura, desarrollo y cooperación (Maass Moreno) | Libro comercial |
| 1310 | Terry Eagleton — Después de la teoría (Debate) | Anna's Archive + ISBN |
| 1359 | Eric Ries — El método Lean Startup (Deusto) | ISBN + hash biblioteca |
| 1410 | Handbook of Critical Studies of AI (Edward Elgar 2023) | Libro comercial |
| 1412 | David Harvey — El enigma del capital | Libro comercial |
| 1414 | Karl Mannheim — Ideología y utopía | z-lib.org |
| 1417 | Alan Sokal — Imposturas intelectuales | Libro comercial |
| 1433 | Correa Morales — Estadística Bayesiana | Libro de texto |
| 1438 | John Bolton — The Room Where It Happened | Memorias con copyright |
| 1443–1450 | Karl Marx — El Capital (Tomos I–III) | Traducciones (original de dominio público) |
| 1451 | Knorr Cetina — La fabricación del conocimiento | Libro comercial |
| 1453 | Lanceros — La herida trágica (Anthropos 1997) | Libro comercial |
| 1477 | Estadística descriptiva multivariada | Libro de texto |
| 1502 | McCall & Álvarez — Mapeando con la gente (UNAM) | ISBN 9786073082464 |
| 1507 | Lariguet — Metodología de la investigación jurídica (Brujas) | ISBN |
| 1519 | Oyewumi — La invención de las mujeres | Libro comercial |
| 1528 | Pizarro — Tratado de metodología de las ciencias sociales | Libro comercial |
| 1562 | Roswitha Scholz — El patriarcado productor de mercancías | Libro comercial |
| 1566 | Sacristán — Sobre dialéctica (El Viejo Topo) | ISBN |
| 1568 | Sociología del consumo e investigación de mercados | Libro comercial |
| 1569 | Socio-ecological Studies (cap. Springer) | Capítulo comercial |
| 1594, 1595 | Zemelman — Los horizontes de la razón (I, II) | Libro comercial |
| 1673, 1674 | García Ferrando — Sociología del deporte (manual) | Manual comercial |
| 1733 | Perelman — Matemática recreativa | Traducción |

> Esta tabla es **representativa de alta confianza**, no exhaustiva. Al revisar
> la base pueden aparecer más (p. ej. otros manuales/monografías). Los textos de
> Marx/Engels/Lenin/Trotsky/Kant: el **original** suele ser de dominio público,
> pero la **traducción al español** que está en la base casi siempre conserva
> copyright del traductor/editorial. Trátalos como TERCEROS salvo que se
> verifique una edición libre.

---

## 5. CONFIDENCIAL_POSIBLE — preguntarte antes de nada ❌

Parecen documentos de consultoría o políticas internas de una organización.
Si vienen de un cliente, el riesgo es de **confidencialidad/contrato**, no solo
de copyright. **Ninguno debe estar en un asistente público sin tu confirmación.**

- Políticas internas tipo "SCI" (¿Save the Children?): ids 207, 211, 232, 259 (Salvaguarda de la Niñez, Código de Conducta, Diversidad, Seguridad).
- Consultorías / propuestas / TDR: 435 (Consultoría OIM), 254 y 4372 (TDR MAPEO TIC), 1152 (Propuesta técnica PNUD), 1157 (Protocolo evaluación CAMPUS), 1589 (Guía de M&E), y otros documentos de proyecto.

> **Pregunta para ti:** ¿cuáles de estos son **tuyos** (tú los redactaste y
> puedes publicarlos) y cuáles son **de un cliente** (confidenciales)? Esto solo
> lo sabes tú.

---

## 6. Candidatos de bajo riesgo (revisar para promover a lista blanca) ⚠️

Estos **probablemente** puedan usarse, pero requieren verificación por item
antes de entrar a la lista blanca:

- **NORMATIVA_OFICIAL de El Salvador** (leyes, reglamentos, Diario Oficial, estadística oficial MINED/DIGESTYC/BCR): ids 808, 809, 813, 814, 815, 818, 819, 1136, 1188, 1192, 1193, 366–391 (Boletines Estadísticos MINED por departamento), 728–730, 1418, 1168 (EHPM), 1319, etc. Las leyes no son objeto de derecho de autor; la estadística oficial suele ser de libre uso con cita.
- **DOMINIO_PUBLICO por antigüedad** (publicaciones salvadoreñas históricas, s. XIX–mediados s. XX): ids 1226 (1954), 1227 (1919), 1442 (1895), 1473, 1474 (1895), 1181 (1959), 1261 (Las Casas 1552), 1267 (Alvarado, s. XVI), 1462, y el archivo "El universitario"/"opinión estudiantil" 1961–1980 (revisar titularidad de la UES). Cuidado con traducciones/ediciones modernas.
- **ACCESO_ABIERTO** (revistas OJS/Dialnet — verificar licencia CC de cada una): los archivos con patrón OJS (`..._Texto_del_articulo_..._1_10_YYYYMMDD.pdf`) y los `Dialnet_...`. Dialnet **aloja** pero no otorga licencia; hay que mirar la licencia de la revista fuente.
- **IGO_INFORME** (CEPAL, PNUD, UNICEF, UNESCO, OCDE, BID, OIT, Banco Mundial, USAID, GIZ, OIM): muchos permiten reproducción con atribución y sin uso comercial. Revisar la nota de copyright de cada informe. Ejemplos: 1207, 1273, 1274, 1521, 1571, 1578, 1579, 1585, 1587, 1715, etc.

---

## 7. Cómo se traduce esto a la operación

1. **Asistente (ya implementado en sesión 41):** el retrieval solo considera
   `tipo='publicacion'` + `CORPUS_ALLOWLIST_IDS` (en
   `workers/sociologia/src/config.ts`). Todo lo de la §4/§5 queda **fuera** por
   defecto. Los candidatos de la §6 se agregan a `CORPUS_ALLOWLIST_IDS` a medida
   que se verifiquen.

   **Lista blanca activa (sesión 41)** — además de los 43 `tipo='publicacion'`:
   - Propio: `253`.
   - Normativa oficial ES (no copyrightable): `808, 809, 813, 814, 815, 818, 819, 1136, 1188, 1192, 1193`.
   - Estadística pública oficial ES: `366, 368, 370, 372, 374, 376, 378, 380, 382, 383, 385, 387, 389, 391, 728, 729, 730, 975, 1168, 1382, 1418`.
   - Acceso abierto (Dialnet + patrón OJS + revistas por nombre; decisión del usuario, sesión 41): `494, 495, 496, 497, 498, 499, 500, 501, 503, 504, 505, 506, 507, 508, 1315, 1316, 1317, 1318` (Dialnet) + `214, 221, 255, 256, 262, 265, 270, 273, 343` (OJS) + `225, 298, 351, 1077, 1514, 1597, 1598, 1600` (revistas por nombre). **Caveat:** estar en Dialnet/OJS/revista no garantiza licencia libre; riesgo bajo por ser académico con atribución (el asistente cita por título).
   - Informes de organismos (CEPAL/PNUD/UNICEF/UNESCO/OCDE/BID/OIT/USAID/GIZ/UNODC/OIJ/OEA/SICA/FMI): `285, 509, 739, 745, 1207, 1212, 1220, 1263, 1273, 1274, 1388, 1389, 1390, 1401, 1423, 1430, 1432, 1517, 1529, 1530, 1571, 1585, 1586, 1587, 1715, 1724, 1731`. **Caveat:** reproducción con atribución, a veces solo no comercial. Excluido `1152` (posible consultoría, revisar propio vs cliente).
   - Dominio público por antigüedad (pre-1930 + fuentes coloniales): `1227, 1442, 1473, 1474, 1261, 1267`. **Caveat:** cuidar ediciones/traducciones modernas.
   - Total corpus permitido: ~144 documentos.
   - **Aún NO en la lista blanca** (pendiente de revisar por item): artículos académicos con nombre autor-año (probable acceso abierto, pero podría colarse un capítulo de libro); documentos de consultoría/ONG §5 (decidir propio vs cliente).
2. **Borrado de la base (tú, en consola D1):** ver `docs/plan-borrado-corpus.md`
   (pendiente de generar) con el SQL para borrar §4 y §5 de `documentos` +
   `documentos_fts`, y el `deleteByIds` de Vectorize.

---

## 8. Método (para reproducir/auditar)

- Fuente: `SELECT id, titulo, fuente FROM documentos WHERE tipo='articulo'`.
- Señales usadas: "anna", "z-lib", id de Scribd (dígitos largos al inicio del
  nombre), ISBN (10/13 dígitos), nombres de editorial, palabras "ley/reglamento/
  boletín/indicadores", años ≤ ~1955, siglas de organismos, patrón OJS/Dialnet.
- Confianza: alta para §4 (señal fuerte). Media/baja para §6 (requiere ver la
  nota de copyright real del documento).
