-- =====================================================
-- Migration: 0002_add_fts_and_telemetry
-- Adds full-text search and AI observability
-- =====================================================

-- Full-text search virtual table (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS doc_chunks_fts USING fts5(
  content,
  topic_keywords,
  content='doc_chunks',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 1'
);

-- Trigger: mantener FTS sincronizado con doc_chunks
CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON doc_chunks BEGIN
  INSERT INTO doc_chunks_fts(rowid, content, topic_keywords)
  VALUES (new.rowid, new.content, COALESCE(new.topic_keywords, ''));
END;

CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON doc_chunks BEGIN
  INSERT INTO doc_chunks_fts(doc_chunks_fts, rowid, content, topic_keywords)
  VALUES ('delete', old.rowid, old.content, COALESCE(old.topic_keywords, ''));
END;

CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE ON doc_chunks BEGIN
  INSERT INTO doc_chunks_fts(doc_chunks_fts, rowid, content, topic_keywords)
  VALUES ('delete', old.rowid, old.content, COALESCE(old.topic_keywords, ''));
  INSERT INTO doc_chunks_fts(rowid, content, topic_keywords)
  VALUES (new.rowid, new.content, COALESCE(new.topic_keywords, ''));
END;

-- Telemetry events para AI observability
CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration_ms INTEGER,

  -- Token accounting
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0,
  estimated_cost_usd REAL DEFAULT 0,

  -- Quality metrics
  confidence_score REAL,
  hallucination_risk REAL,
  injection_risk_score REAL DEFAULT 0,
  grounding_ratio REAL,
  citation_count INTEGER DEFAULT 0,

  -- Performance
  embedding_latency_ms INTEGER,
  retrieval_latency_ms INTEGER,
  reranking_latency_ms INTEGER,
  llm_latency_ms INTEGER,

  -- Context
  model_id TEXT,
  skill_used TEXT,
  user_hash TEXT,
  session_id TEXT,
  payload TEXT                         -- JSON blob for additional data
);

CREATE INDEX IF NOT EXISTS idx_telemetry_trace ON telemetry_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(type);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_user ON telemetry_events(user_hash);
CREATE INDEX IF NOT EXISTS idx_telemetry_skill ON telemetry_events(skill_used);

-- Hallucination log (para entrenamiento futuro y auditoría)
CREATE TABLE IF NOT EXISTS hallucination_log (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  response_excerpt TEXT,
  grounding_ratio REAL,
  ungrounded_claims TEXT,              -- JSON array
  risk_score REAL,
  action_taken TEXT,                   -- 'approved' | 'warned' | 'rejected' | 'regenerated'
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_hall_trace ON hallucination_log(trace_id);
CREATE INDEX IF NOT EXISTS idx_hall_risk ON hallucination_log(risk_score);

-- Injection attempts log
CREATE TABLE IF NOT EXISTS injection_log (
  id TEXT PRIMARY KEY,
  trace_id TEXT,
  user_hash TEXT,
  session_id TEXT,
  input_excerpt TEXT,                  -- Primeros 200 chars del input sospechoso
  patterns_matched TEXT,               -- JSON array
  risk_score REAL,
  action_taken TEXT,                   -- 'blocked' | 'flagged' | 'allowed'
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_inj_user ON injection_log(user_hash);
CREATE INDEX IF NOT EXISTS idx_inj_created ON injection_log(created_at);
