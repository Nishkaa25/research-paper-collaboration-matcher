-- RPCM: store full-text demonstration documents for the existing synthetic papers.
-- This does NOT add fake external URLs or DOIs. The application creates an internal
-- reader route at /papers/<paper_id>/read for each stored document.

CREATE TABLE IF NOT EXISTS paper_document (
    paper_id          INT PRIMARY KEY,
    reader_path       TEXT GENERATED ALWAYS AS ('/papers/' || paper_id::text || '/read') STORED,
    document_content  JSONB NOT NULL,
    document_kind     VARCHAR(40) NOT NULL DEFAULT 'synthetic_demo',
    is_synthetic      BOOLEAN NOT NULL DEFAULT TRUE,
    generated_by      VARCHAR(80) NOT NULL DEFAULT 'rpcm_synthetic_document_builder_v1',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_paper_document_paper
        FOREIGN KEY (paper_id) REFERENCES paper(paper_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_paper_document_json
        CHECK (jsonb_typeof(document_content) = 'object'),
    CONSTRAINT ck_paper_document_kind
        CHECK (document_kind IN ('synthetic_demo', 'author_supplied'))
);

CREATE INDEX IF NOT EXISTS idx_paper_document_synthetic
    ON paper_document(is_synthetic);

COMMENT ON TABLE paper_document IS
    'Full-text documents for RPCM papers. Synthetic demo documents are clearly labelled and are not real publications.';

COMMENT ON COLUMN paper_document.document_content IS
    'Structured JSON containing an abstract and full-text sections rendered by the internal paper reader.';
