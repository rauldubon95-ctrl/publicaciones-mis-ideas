# ESTRUCTURA DE CARPETAS: AI SYSTEM

Estructura target del sistema AI desacoplado.
Los archivos marcados con `[NUEVO]` no existen aún.

```
ai-system/                                    [NUEVO] - repo o carpeta separada
│
├── workers/
│   │
│   ├── orchestrator/                         [NUEVO]
│   │   ├── index.ts                          # Entry point: recibe query, coordina agentes
│   │   ├── planner.ts                        # Task decomposition
│   │   ├── router.ts                         # Routing: qué agente/skill usar
│   │   ├── response-builder.ts              # Ensambla respuesta final
│   │   └── wrangler.toml
│   │
│   ├── retrieval/                            [NUEVO]
│   │   ├── index.ts                          # Entry point del Worker
│   │   ├── hybrid-retriever.ts              # Vector + keyword + metadata
│   │   ├── vector-retriever.ts              # Cloudflare Vectorize
│   │   ├── keyword-retriever.ts             # D1 FTS
│   │   ├── metadata-retriever.ts            # D1 structured filters
│   │   ├── result-fusion.ts                 # RRF + deduplication
│   │   ├── reranker.ts                      # Heuristic reranker
│   │   ├── context-assembler.ts             # Token budget + compression
│   │   └── wrangler.toml
│   │
│   ├── security/                             [NUEVO]
│   │   ├── index.ts
│   │   ├── injection-detector.ts            # Multi-layer injection detection
│   │   ├── document-sanitizer.ts            # PDF content sandboxing
│   │   ├── output-validator.ts              # Post-LLM validation
│   │   ├── trust-scorer.ts                  # Per-source trust scoring
│   │   └── wrangler.toml
│   │
│   ├── ingestion/                            [NUEVO]
│   │   ├── index.ts                          # Queue consumer
│   │   ├── pdf-processor.ts                 # PDF parsing + structure
│   │   ├── semantic-chunker.ts              # Intelligent chunking
│   │   ├── metadata-extractor.ts            # Title, author, year, DOI
│   │   ├── entity-extractor.ts              # Named entity recognition
│   │   ├── citation-extractor.ts            # Citation parsing + verification
│   │   ├── embedding-generator.ts           # Batch embedding generation
│   │   ├── security-scanner.ts              # Scan document for threats
│   │   └── wrangler.toml
│   │
│   ├── observability/                        [NUEVO]
│   │   ├── index.ts                          # Telemetry collector
│   │   ├── telemetry.ts                     # Event types + emitters
│   │   ├── metrics.ts                       # Aggregations
│   │   └── wrangler.toml
│   │
│   └── embedding/                            [NUEVO]
│       ├── index.ts                          # Embedding service Worker
│       ├── embedding-service.ts             # Generate + cache embeddings
│       └── wrangler.toml
│
├── agents/
│   ├── retrieval-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md                          [NUEVO]
│   ├── citation-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   ├── security-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   ├── synthesis-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   ├── planner-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   ├── validator-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   ├── hallucination-agent/
│   │   ├── index.ts                          [NUEVO]
│   │   └── AGENT.md
│   └── memory-agent/
│       ├── index.ts                          [NUEVO]
│       └── AGENT.md
│
├── skills/
│   │
│   ├── academic/
│   │   ├── sociological-analysis/
│   │   │   ├── SKILL.md                      [NUEVO] - contrato de la skill
│   │   │   ├── index.ts                      [NUEVO] - implementación
│   │   │   ├── frameworks.ts                 [NUEVO] - teorías sociológicas
│   │   │   └── prompts/
│   │   │       ├── system.txt
│   │   │       └── analysis.txt
│   │   ├── political-analysis/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── discourse-analysis/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── bibliographic-review/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── citation-extraction/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── comparative-analysis/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   └── discourse-analysis/
│   │       ├── SKILL.md
│   │       └── index.ts
│   │
│   ├── data/
│   │   ├── statistical-analysis/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── timeline-extraction/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   └── indicator-analysis/
│   │       ├── SKILL.md
│   │       └── index.ts
│   │
│   ├── document/
│   │   ├── pdf-parser/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── semantic-chunker/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── metadata-extractor/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   └── entity-extractor/
│   │       ├── SKILL.md
│   │       └── index.ts
│   │
│   ├── security/
│   │   ├── injection-detector/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── document-sanitizer/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   ├── hallucination-detector/
│   │   │   ├── SKILL.md
│   │   │   └── index.ts
│   │   └── output-validator/
│   │       ├── SKILL.md
│   │       └── index.ts
│   │
│   └── orchestration/
│       ├── task-decomposer/
│       │   ├── SKILL.md
│       │   └── index.ts
│       ├── retrieval-optimizer/
│       │   ├── SKILL.md
│       │   └── index.ts
│       └── token-budgeter/
│           ├── SKILL.md
│           └── index.ts
│
├── tools/
│   ├── academic-summary/
│   │   ├── index.ts
│   │   └── schema.json                       # JSON Schema de input/output
│   ├── citation-extractor/
│   │   ├── index.ts
│   │   └── schema.json
│   ├── entity-extractor/
│   │   ├── index.ts
│   │   └── schema.json
│   ├── analytic-matrix/
│   │   ├── index.ts
│   │   └── schema.json
│   ├── timeline-extractor/
│   │   ├── index.ts
│   │   └── schema.json
│   ├── comparative-analysis/
│   │   ├── index.ts
│   │   └── schema.json
│   └── topic-classifier/
│       ├── index.ts
│       └── schema.json
│
├── lib/
│   ├── retrieval/
│   │   ├── types.ts                          # RetrievedChunk, Citation, etc.
│   │   ├── normalizer.ts                     # Query normalization
│   │   └── scorer.ts                         # Composite scoring
│   ├── embeddings/
│   │   ├── embedding-service.ts
│   │   ├── cache.ts                          # KV cache for embeddings
│   │   └── similarity.ts                     # cosine similarity utils
│   ├── chunker/
│   │   ├── semantic-chunker.ts
│   │   ├── sliding-window.ts
│   │   ├── hierarchical.ts
│   │   └── token-counter.ts
│   ├── memory/
│   │   ├── session-memory.ts                 # Durable Object
│   │   ├── working-memory.ts
│   │   └── retrieval-cache.ts
│   ├── security/
│   │   ├── injection-detector.ts
│   │   ├── document-sanitizer.ts
│   │   ├── output-validator.ts
│   │   └── trust-scorer.ts
│   ├── observability/
│   │   ├── telemetry.ts
│   │   ├── tracer.ts
│   │   └── metrics.ts
│   ├── tokenizer/
│   │   ├── counter.ts                        # Token counting (tiktoken-like)
│   │   └── budget-manager.ts
│   └── governance/
│       ├── context-governor.ts               # Context isolation per agent
│       ├── permission-checker.ts
│       └── trust-config.ts
│
├── config/
│   ├── models.ts                             # Model registry + selector
│   ├── sources.ts                            # Knowledge source registry
│   ├── trust-config.ts                       # Trust boundaries
│   ├── skills-registry.ts                    # Skill discovery + loading
│   └── prompts/
│       ├── system/
│       │   ├── v1.0.txt                      # Versioned system prompts
│       │   └── v1.1.txt
│       ├── retrieval/
│       │   └── query-expansion.txt
│       └── grounding/
│           └── citation-enforcement.txt
│
├── migrations/
│   ├── d1/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_add_fts.sql
│   │   ├── 0003_add_telemetry.sql
│   │   └── 0004_add_skills_registry.sql
│   └── supabase/
│       ├── 0001_add_fts_index.sql
│       └── 0002_add_doc_id_column.sql
│
├── tests/
│   ├── security/
│   │   ├── injection-attacks.test.ts         # 50+ injection test cases
│   │   └── document-sanitizer.test.ts
│   ├── retrieval/
│   │   ├── hybrid-retriever.test.ts
│   │   └── reranker.test.ts
│   ├── skills/
│   │   └── sociological-analysis.test.ts
│   └── anti-hallucination/
│       └── grounding-detector.test.ts
│
└── docs/
    ├── ARQUITECTURA.md                       # Este documento
    ├── SECURITY.md                           # Guía de seguridad
    ├── DEPLOYMENT.md                         # Guía de deploy
    ├── SKILLS-GUIDE.md                       # Cómo crear nuevas skills
    └── ADR/                                  # Architecture Decision Records
        ├── 001-vectorize-vs-external.md
        ├── 002-chunking-strategy.md
        └── 003-hybrid-retrieval.md
```

## Archivos Críticos a Crear Primero (Fase 1)

1. `lib/security/injection-detector.ts` — Mejora inmediata de seguridad
2. `lib/security/document-sanitizer.ts` — Sandboxing de PDFs
3. `lib/tokenizer/counter.ts` — Token counting real
4. `config/prompts/system/v1.1.txt` — System prompt mejorado
5. `migrations/d1/0001_initial_schema.sql` — Nuevo schema D1
6. `migrations/d1/0002_add_fts.sql` — Full-text search
