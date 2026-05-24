# Instrucciones de despliegue — Worker sociologia v2

## Requisitos previos

- Node.js >= 18
- Wrangler CLI: `npm install -g wrangler`
- Cuenta Cloudflare autenticada: `wrangler login`

---

## 1. Desplegar el Worker (Phase 1 + 2)

```bash
cd workers/sociologia
npm install
wrangler deploy
```

Esto despliega el Worker en: `https://sociologia.raul-dubon95.workers.dev`

---

## 2. Crear el índice Vectorize (Phase 3 — una vez)

```bash
wrangler vectorize create sociologia-embeddings --dimensions=1024 --metric=cosine
```

Después de crearlo, descomentar el binding en `wrangler.toml`:

```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "sociologia-embeddings"
```

Luego volver a desplegar:

```bash
wrangler deploy
```

---

## 3. Poblar Vectorize con embeddings (Phase 3 — una vez)

El endpoint `POST /embed` procesa en batches de 10. Llamarlo repetidamente hasta completar los 1288 documentos.

**Obtener el admin key** (es el mismo `premium_master_token` en KV):

```bash
wrangler kv key get --namespace-id=2f279c63ddbf45f19aaf55a02d290b47 "premium_master_token"
```

**Llamar en loop** (desde terminal o script):

```bash
# Bash loop — llama hasta que devuelva status: "completo"
while true; do
  STATUS=$(curl -s -X POST https://sociologia.raul-dubon95.workers.dev/embed \
    -H "X-Admin-Key: TU_TOKEN_AQUI" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))")
  echo "Estado: $STATUS"
  if [ "$STATUS" = "completo" ]; then break; fi
  sleep 2
done
```

Cada llamada procesa 10 documentos. Con 1288 documentos se necesitan ~129 llamadas.

---

## 4. Verificar el Worker

```bash
# Health check
curl -X POST https://sociologia.raul-dubon95.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"pregunta":"hola"}'

# Query real
curl -X POST https://sociologia.raul-dubon95.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"pregunta":"¿Qué dice Raúl Dubón sobre la sociología?"}'
```

---

## 5. Rollback rápido

Si el nuevo Worker tiene problemas, el Worker anterior sigue en Cloudflare hasta que se sobreescriba. Para revertir:

```bash
git checkout 1a08f87 -- workers/sociologia/src/
wrangler deploy
```

---

## Variables de entorno / secretos

No hay secretos en `wrangler.toml`. Los valores sensibles viven en KV:

| Clave KV | Descripción |
|---|---|
| `premium_master_token` | Token premium + admin key |
| `embed_progress` | Progreso del batch de embeddings (auto-generado) |
| `telemetry:{fecha}` | Eventos de telemetría por día |
| `rl:{ip}:{fecha}` | Contadores de rate limit por IP |
