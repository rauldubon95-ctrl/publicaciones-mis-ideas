# Diseño: razonamiento multi-paso + memoria conversacional (sesión 36)

**Estado:** DISEÑO — no implementado. Preparar sesión dedicada para el código.

Este documento es la base para la próxima iteración grande del asistente IA. No lo implementes sin ejemplos reales de uso que justifiquen la complejidad extra.

---

## 1. Multi-paso: cuándo hace falta

### Casos que la arquitectura actual NO cubre bien

La arquitectura actual (`workers/sociologia/src/index.ts`) es **una sola pasada** RAG → skill → LLM → respuesta. Sirve para consultas atómicas:

- ✅ "¿Qué es la hegemonía?" → recupera docs sobre hegemonía → responde con corpus
- ✅ "¿Qué dice Raúl sobre educación popular?" → recupera docs → responde

Rompe con consultas **compuestas** o **relacionales**:

- ❌ "Compara el pensamiento de Bourdieu y Gramsci sobre hegemonía" — el retrieval trae docs de ambos mezclados; el LLM no separa análisis.
- ❌ "¿Cómo evolucionó el pensamiento de Raúl sobre X entre 2020 y 2025?" — necesita filtrar por fecha, agrupar y comparar.
- ❌ "Resume los principales aportes teóricos del corpus sobre neoliberalismo en Centroamérica" — necesita agregar múltiples docs, no citar uno.
- ❌ "Explícame el concepto de habitus con un ejemplo del corpus" — necesita definir + buscar ejemplo → dos pasos.

### Umbral de decisión

Multi-paso vale la pena **solo si**:
- Hay ≥3 consultas reales/mes que hoy fallan por esto (medir con telemetría).
- El costo extra (más llamadas al LLM, más latencia) no rompe el plan gratuito de Workers AI (~10.000 neuronas/día).

Si no hay evidencia real de necesidad, **no implementar**.

---

## 2. Arquitectura propuesta

### Opción A — Multi-paso dentro del Worker actual (RECOMENDADA)

Un solo worker, un solo llamado del cliente. Internamente:

```
Cliente → Worker /
  ↓
Paso 1: Clasificador (LLM barato, temp=0)
  ↓ (decide si es simple o compuesta)
  ↓
  ├── simple → RAG + skill (flujo actual)
  └── compuesta → planner
                    ↓
              Paso 2: Descomponer en 2-3 subconsultas
                    ↓
              Paso 3: Ejecutar cada subconsulta (RAG paralelo)
                    ↓
              Paso 4: Sintetizador (LLM final que integra)
                    ↓
              Respuesta unificada
```

**Ventajas:**
- Cambio contenido al Worker existente
- Sin infraestructura nueva
- Retorno rápido si el clasificador dice "simple" (misma latencia que hoy)

**Desventajas:**
- 2-4 llamadas al LLM en consultas compuestas (vs 1 hoy)
- Latencia total ~3-5s en el peor caso

### Opción B — Multi-worker con orquestador (aplazada)

Ver §17 de CLAUDE.md. Válida para escala real; hoy overkill.

---

## 3. Cambios en el código (Opción A)

### Nuevo archivo `workers/sociologia/src/planner.ts`

```typescript
export interface PlanEjecucion {
  esCompuesta: boolean;
  subconsultas: string[]; // vacío si simple
  intencion: "definir" | "comparar" | "evolucion" | "resumir" | "ejemplo" | "otro";
}

export async function planificar(query: string, env: Env): Promise<PlanEjecucion> {
  // Llama al LLM con un prompt fijo que devuelve JSON:
  // { esCompuesta: bool, subconsultas: string[], intencion: string }
  //
  // Temperatura 0, max_tokens 200. Si falla, devolver plan simple.
}

export async function sintetizar(
  query: string,
  parciales: { subconsulta: string; respuesta: string; fuentes: string[] }[],
  env: Env,
  contextoSitio: ContextoSitio
): Promise<{ respuesta: string; fuentes: string[]; groundingRatio: number }> {
  // Llama al LLM con un prompt que integra las respuestas parciales
  // en una sola respuesta cohesiva, manteniendo las reglas del SYSTEM_PROMPT.
}
```

### Modificación en `index.ts`

Después del retrieval, antes del skill:

```typescript
const plan = await planificar(pregunta, env);

if (plan.esCompuesta && plan.subconsultas.length >= 2) {
  // Ejecutar cada subconsulta como pipeline completo (RAG + skill)
  const parciales = await Promise.all(
    plan.subconsultas.map(async (sub) => {
      const docs = await recuperarDocumentos(sub, env);
      const skillResult = await skillRegistry.execute(
        detectarSkill(sub),
        { query: sub, context: docs, depth: "shallow", contextoSitio },
        env
      );
      return { subconsulta: sub, respuesta: skillResult.analysis, fuentes: [...] };
    })
  );

  const sintesis = await sintetizar(pregunta, parciales, env, contextoSitio);
  respuestaLLM = sintesis.respuesta;
  // ...
} else {
  // Flujo simple actual (sin cambios)
}
```

### Rate limit adicional

Multi-paso consume 2-4x más neuronas por request. Añadir en `ratelimit.ts`:
- Contador aparte para queries multi-paso: 2 por día para free tier.
- Premium: sin límite (como hoy).

### Fallback obligatorio

Si el planner falla o la síntesis falla → volver al flujo simple. Nunca romper el chat.

---

## 4. Memoria conversacional corta

### Problema hoy

Cada request es independiente:
- Usuario: "¿Qué dice Raúl sobre neoliberalismo en Guatemala?"
- Asistente: [responde]
- Usuario: "¿Y en Honduras?"
- Asistente: no sabe qué era "eso" → responde sobre Honduras en general

### Diseño

Añadir 2 campos al request body del Worker:

```typescript
interface WorkerRequest {
  pregunta: string;
  contexto?: ContextoSitio;
  historial?: Array<{ rol: "usuario" | "asistente"; texto: string }>; // NUEVO
}
```

El frontend (`AsistenteChat.tsx`) guarda los últimos **3 turnos** (6 mensajes) en un estado React y los envía en cada request. No se persiste en DB — se pierde al recargar la página (aceptable para chat corto).

### Cambios en el Worker

En `construirMensajes` de las skills, prepend el historial ANTES del contexto documental:

```
[system: reglas absolutas]
[user: mensaje previo del historial]
[assistant: respuesta previa del historial]
[user: mensaje actual + contexto documental]
```

### Riesgos y mitigaciones

- **Tokens**: cada turno anterior ~200-400 tokens. Con 3 turnos, +600-1200 tokens. Aceptable en Llama 3.1 8B (128k contexto).
- **Prompt injection multi-turno**: un atacante podría "envenenar" con un mensaje falso en el historial. Mitigación: el frontend NO permite editar el historial (viene del estado React sellado); el Worker aún así sanitiza cada mensaje del historial con `analizarInyeccion`.
- **Contexto stale**: si el usuario cambia de tema, el historial confunde. Mitigación: prompt system dice explícitamente "si el historial no es relevante a la nueva pregunta, ignóralo".

### Botón "Limpiar conversación"

Ya existe en `AsistenteChat.tsx` (línea 152, ícono trash). Al hacer clic, borrar el historial local. Perfecto.

---

## 5. Orden de implementación sugerido

Cuando llegue el momento (sesión dedicada):

1. **Semana 1**: implementar memoria conversacional. Es más simple, impacto inmediato en UX. 2-3 días de trabajo.
2. **Semana 2**: telemetría de queries fallidas (agregar campo `intencionDetectada` para saber cuáles son compuestas hoy).
3. **Semana 3-4**: implementar multi-paso solo si la telemetría muestra ≥3 consultas compuestas/mes que hoy fallan.

**No implementar los dos juntos** — cada uno tiene su propia superficie de bugs.

---

## 6. Seguridad — checklist antes de mergear

- [ ] Todos los mensajes del historial pasan por `analizarInyeccion`
- [ ] El planner tiene fallback a flujo simple si el LLM devuelve JSON inválido
- [ ] Los subconsultas del planner NO se ejecutan si contienen tokens de sistema (`[SYSTEM]`, `<|im_start|>`, etc.)
- [ ] Rate limit contempla que multi-paso consume 2-4x más
- [ ] La síntesis final pasa por `validarOutput` (anti-leak de system prompt)
- [ ] Timeout global de 15s para toda la cadena multi-paso (no que un paso lento cuelgue el request)

---

*Redactado sesión 36 (2026-09-09). Ver §17 del CLAUDE.md para la visión multi-worker (aplazada).*
