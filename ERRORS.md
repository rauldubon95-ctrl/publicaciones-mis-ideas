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
**Commit:** [pendiente]

---

### [FIX] Bot patterns desincronizados

**Archivos:** `middleware.ts:4-8` vs `lib/security.ts:151-170`  
**Problema:** `middleware.ts` tiene 14 patrones de bot. `lib/security.ts` tiene 17. No están sincronizados. Algunos bots que security.ts bloquea, middleware.ts los deja pasar.  
**Solución:** Centralizar en un solo array en `lib/security.ts`, importar en `middleware.ts`.  
**Commit:** [pendiente]

---

### [FIX] X-Trace-ID faltante

**Archivo:** `middleware.ts`  
**Problema:** No hay correlación de requests. Si hay un error o ataque, no se puede trazar la cadena completa de eventos.  
**Solución:** Agregar `X-Trace-ID` header (UUID v4) en todas las responses del middleware.  
**Commit:** [pendiente]

---

### [FEAT] Cloudflare Worker — Asistente AI

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
**Commit:** [pendiente]

---

## HISTORIAL DE COMMITS (se actualiza con cada commit)

| Fecha | Hash | Descripción | Estado |
|---|---|---|---|
| 2026-05-24 | ab4c10d | Add professional AI architecture design | ✅ |
| 2026-05-24 | 380a256 | Add ERRORS.md change tracking | ✅ |
| 2026-05-24 | 9979edd | security: fail-close login, centralize bot patterns, X-Trace-ID | ✅ |
| 2026-05-24 | 1a08f87 | feat: Cloudflare Worker v2 with Phase 1 AI improvements | ✅ |
| 2026-05-24 | 5f750f8 | feat: D1 setup script + legacy chunk migration | ✅ |

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
