# REGISTRO DE ERRORES Y CAMBIOS

Archivo de trazabilidad de cambios críticos. Cada entrada tiene fecha, commit hash (cuando disponible), descripción del problema y la solución aplicada.

---

## CONVENCIÓN

- **[FIX]** — Corrección de bug o error de seguridad
- **[FEAT]** — Nueva funcionalidad
- **[REFACTOR]** — Mejora estructural sin cambio de comportamiento
- **[SECURITY]** — Corrección de vulnerabilidad de seguridad
- **[ROLLBACK]** — Si se reversa un cambio, documentar aquí el commit hash al que se volvió

---

## FASE 1 — QUICK WINS

---

### 2026-05-24 — Inicio de refactor arquitectónico

**Estado:** EN PROGRESO  
**Rama:** `claude/elegant-bardeen-HHEmr`

---

### [SECURITY] Fail-open en rate limiting

**Archivo:** `lib/security.ts:123`  
**Problema:** Si la base de datos (Supabase) falla durante el check de rate limit, el sistema permite todos los requests (`permitido: true`). Esto significa que un atacante que sature la DB puede saltarse el rate limiting completamente.  
**Riesgo:** ALTO para login. MEDIO para comentarios/reacciones.  
**Solución:** Cambiar comportamiento por tipo de ruta:
- Login → fail-close (403 si DB cae, mejor rechazar que permitir fuerza bruta)
- Comentarios/reacciones → fail-open (UX, no crítico)
- AI queries → fail-close (no servir AI si no podemos contabilizar tokens)  
**Commit:** `9979edd`

---

### [FIX] Bot patterns desincronizados

**Archivos:** `middleware.ts:4-8` vs `lib/security.ts:151-170`  
**Problema:** `middleware.ts` tiene 14 patrones de bot. `lib/security.ts` tiene 17. No están sincronizados. Algunos bots que security.ts bloquea, middleware.ts los deja pasar.  
**Solución:** Centralizar en un solo array en `lib/security.ts`, importar en `middleware.ts`.  
**Commit:** `9979edd`

---

### [FIX] X-Trace-ID faltante

**Archivo:** `middleware.ts`  
**Problema:** No hay correlación de requests. Si hay un error o ataque, no se puede trazar la cadena completa de eventos.  
**Solución:** Agregar `X-Trace-ID` header (UUID v4) en todas las responses del middleware.  
**Commit:** `9979edd`

---

### [FEAT] Cloudflare Worker v2 — Asistente AI Phase 1

**Directorio:** `workers/sociologia/`  
**Problema:** El Worker de IA no existe en este repositorio. No tiene control de versiones. Cualquier cambio es irreversible sin backup manual.  
**Solución:** Crear el Worker completo en este repo con Phase 1 mejoras:
- FTS5 en lugar de LIKE queries
- Document sandboxing
- System prompt v1.1 con grounding enforcement
- Injection detection multi-capa
- Token counting real
- Source citations en respuesta
- Telemetría básica  
**Commit:** `1a08f87`

---

## FASE 2+3 — WORKER REAL + EMBEDDINGS PIPELINE

---

### [FEAT] Worker v2 alineado con infraestructura real de Cloudflare

**Directorio:** `workers/sociologia/src/`  
**Problema:** El Worker v2 (Phase 1) usaba nombres de binding incorrectos (`env.KV` en lugar de `env.RATE_LIMIT`), tabla `doc_chunks` que no existe, y mecanismo de token premium incorrecto.  
**Causa:** Los tipos se diseñaron antes de consultar la infraestructura real de Cloudflare.  
**Solución:** Consultar Cloudflare MCP para obtener los IDs reales, luego corregir:
- `types.ts`: `RATE_LIMIT: KVNamespace` (binding real), `VECTORIZE?: VectorizeIndex` (opcional)
- `retrieval.ts`: Query FTS sobre tabla `documentos` real (no `doc_chunks`)
- `ratelimit.ts`: Lee `premium_master_token` desde KV (igual que v1)
- `wrangler.toml`: IDs reales de D1 `ea9cad56` y KV `2f279c63`  
**Commit:** [este commit]

---

### [FEAT] Pipeline de embeddings Phase 3 (Vectorize)

**Archivo:** `workers/sociologia/src/embed-worker.ts`  
**Descripción:** Generador de embeddings batch para poblar Cloudflare Vectorize:
- POST /embed con header `X-Admin-Key` para autenticación
- Procesa en batches de 10 documentos desde D1
- Guarda progreso en KV (`embed_progress`) para reanudabilidad
- Genera embeddings con `@cf/baai/bge-large-en-v1.5` (dimensión 1024)
- Hace upsert a Vectorize con id del documento + título como metadata  
**Estado:** Listo para despliegue. Requiere crear el índice Vectorize primero.  
**Commit:** [este commit]

---

### [FEAT] Routing /embed integrado en index.ts

**Archivo:** `workers/sociologia/src/index.ts`  
**Descripción:** Agregado despacho de ruta: `POST /embed` → `handleEmbedRequest()`.  
Todas las demás rutas POST continúan al flujo de query AI normal.  
**Commit:** [este commit]

---

## HISTORIAL DE COMMITS (se actualiza con cada commit)

| Fecha | Hash | Descripción | Estado |
|---|---|---|---|
| 2026-05-24 | ab4c10d | Add professional AI architecture design | ✅ |
| 2026-05-24 | 380a256 | Add ERRORS.md change tracking | ✅ |
| 2026-05-24 | 9979edd | security: fail-close login, centralize bot patterns, X-Trace-ID | ✅ |
| 2026-05-24 | 1a08f87 | feat: Cloudflare Worker v2 with Phase 1 AI improvements | ✅ |
| 2026-05-24 | 5f750f8 | feat: D1 setup script + legacy chunk migration | ✅ |
| 2026-05-24 | 8f99332 | docs: update ERRORS.md with Phase 1 commit history | ✅ |
| 2026-05-24 | [Phase 2+3] | feat: Worker v2 real bindings + embeddings pipeline | ⏳ |

---

## ROLLBACK GUIDE

Si algo se rompe, estos son los comandos para revertir:

```bash
# Ver historial
git log --oneline -20

# Revertir un commit específico (sin perder historial)
git revert <hash>

# Volver a un punto específico (destructivo - solo si es urgente)
git reset --hard <hash>
git push --force origin claude/elegant-bardeen-HHEmr
```

**IMPORTANTE:** Siempre usar `git revert` (no destructivo) en lugar de `git reset --hard` a menos que sea absolutamente necesario.
