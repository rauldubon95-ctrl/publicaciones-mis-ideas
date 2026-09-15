# Auditoría de cierre — Worker `sociologia` (2026-09-15, sesión 40)

Auditoría de seguridad, huérfanos/código muerto y eficiencia tras los
cambios de la sesión 39 (recuperación + fuentes + embeddings). Todo
verificado contra el código real.

## 1. Seguridad

- Los cambios de la sesión 39 **no tocaron ninguna capa de seguridad**
  (auth, CORS, rate-limit, `analizarInyeccion` sobre la pregunta del
  usuario, `validarOutput`). Verificado: no se editaron `security.ts`,
  `ratelimit.ts` ni la auth/CORS de `index.ts`.
- La búsqueda FTS nueva **no es inyectable**: usa parámetros `.bind()` y
  los términos son solo alfanuméricos (`extraerPalabras` descarta el resto).
- **Hallazgo (bajo) corregido en sesión 40**: la sanitización del contenido
  del corpus (`envolverDocumento`) había quedado desconectada de la ruta
  activa (las skills pasaban el texto crudo al modelo). Riesgo real bajo —
  el corpus es del autor, no lo sube un atacante— pero se corrigió: la
  lógica vive ahora en `sanitizarContenidoDoc` (`security.ts`) y **las 3
  skills la aplican** sobre el texto de cada documento recuperado.

## 2. Huérfanos / código muerto — ELIMINADO en sesión 40

Se detectó y eliminó el pipeline legado "Worker v1", sin uso desde la
migración a skills. Verificado con `tsc` tras el borrado:

| Archivo | Eliminado |
|---|---|
| `prompts.ts` | `SYSTEM_PROMPT`, `construirMensajes`, `construirContexto`, `extraerCita`, `construirAdvertencia`, `determinarConfianza` |
| `security.ts` | `envolverDocumento` (→ reemplazado por `sanitizarContenidoDoc`), `esQueryAcademica` |
| `types.ts` | `WorkerRequest`, `FuenteDoc`, campo `fuentesDetalle` |

`prompts.ts` conserva lo vivo: `instruccionesContexto`, `extraerFuentesTitulos`,
`esSaludo`, `esConsultaTrivial`.

Resto del repo: sin archivos basura (`.bak/.old/copy`). Los scripts de
`migrations/d1/` (confusos, "no ejecutar") se documentaron con un
`migrations/d1/README.md`.

## 3. Eficiencia

- El Worker está bien: recuperación en paralelo (FTS + vector), FTS
  indexado, sin N+1. El AND-primero agrega, como mucho, 1 query extra
  cuando la consulta trae pocos resultados. Bundle ~70 KiB.
- El cuello real **no es velocidad, es calidad**: el corte del corpus a
  8.000 caracteres. Ver `docs/re-ingesta-corpus-chunking-diseno.md`.

## 4. Pendientes tras esta auditoría

- 🔴 **Chunking del corpus** (mayor palanca de calidad). Bloqueante:
  ubicación de los PDFs originales.
- 🟢 Opcional: agregar un detector de código muerto (p. ej. `knip`) al
  Worker para que esto no vuelva a acumularse.
- ✅ Telemetría de `/admin/observabilidad`: **funcionando** (confirmado por
  el usuario, sesión 40).
