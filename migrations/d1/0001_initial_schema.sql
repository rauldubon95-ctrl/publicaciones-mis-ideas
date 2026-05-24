-- =====================================================
-- CLOUDFLARE D1: AI KNOWLEDGE STORE
-- Migration: 0001_initial_schema
-- =====================================================

-- Documentos indexados (PDFs, DOCX, web articles)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  title TEXT,
  author TEXT,
  publication_year INTEGER,
  category TEXT,
  doc_type TEXT DEFAULT 'pdf',
  total_chunks INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',       -- pending | indexed | error | quarantined
  trust_score REAL DEFAULT 0.8,
  language TEXT DEFAULT 'es',
  indexed_at INTEGER,
  updated_at INTEGER,
  metadata TEXT                        -- JSON blob
);

-- Chunks de documentos
CREATE TABLE IF NOT EXISTS doc_chunks (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_summary TEXT,
  token_count INTEGER NOT NULL DEFAULT 0,
  page_start INTEGER,
  page_end INTEGER,
  section TEXT,
  subsection TEXT,
  topic_keywords TEXT,                 -- JSON array as text
  entities TEXT,                       -- JSON array as text
  language TEXT DEFAULT 'es',
  density_score REAL DEFAULT 0.5,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Referencia de embeddings a Cloudflare Vectorize
CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id TEXT PRIMARY KEY,
  vectorize_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_dim INTEGER NOT NULL DEFAULT 1024,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  cache_key TEXT,
  FOREIGN KEY (chunk_id) REFERENCES doc_chunks(id) ON DELETE CASCADE
);

-- Citation graph
CREATE TABLE IF NOT EXISTS citations (
  id TEXT PRIMARY KEY,
  chunk_id TEXT,
  doc_id TEXT,
  citation_text TEXT NOT NULL,
  format_apa TEXT,
  format_mla TEXT,
  doi TEXT,
  isbn TEXT,
  url TEXT,
  verified INTEGER DEFAULT 0,         -- boolean as integer (SQLite)
  verification_source TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (chunk_id) REFERENCES doc_chunks(id) ON DELETE SET NULL,
  FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Skill registry
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  version TEXT NOT NULL,
  category TEXT,
  description TEXT,
  permissions TEXT,                    -- JSON
  dependencies TEXT,                   -- JSON
  trust_level TEXT DEFAULT 'medium',
  enabled INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- Rate limiting (migrar de Supabase a D1 para el Worker)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,               -- format: 'hash:route'
  counter INTEGER DEFAULT 0,
  reset_at INTEGER NOT NULL,
  blocked_until INTEGER
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chunks_doc ON doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_section ON doc_chunks(section);
CREATE INDEX IF NOT EXISTS idx_chunks_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_docs_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_docs_year ON documents(publication_year);
CREATE INDEX IF NOT EXISTS idx_docs_language ON documents(language);
CREATE INDEX IF NOT EXISTS idx_citations_doc ON citations(doc_id);
CREATE INDEX IF NOT EXISTS idx_citations_chunk ON citations(chunk_id);
CREATE INDEX IF NOT EXISTS idx_citations_doi ON citations(doi);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
