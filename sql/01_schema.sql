-- =====================================================================
--  Research Paper Collaboration Matcher  |  DBMS Level 3 Mini Project
--  File 01 : DDL  - extensions, tables, constraints, indexes
--  Target  : PostgreSQL 15+ with pgvector 0.5+ (HNSW support)
-- =====================================================================

-- ---------- Clean slate (safe to re-run) ----------
DROP TABLE IF EXISTS collaboration_request  CASCADE;
DROP TABLE IF EXISTS match_result           CASCADE;
DROP TABLE IF EXISTS paper_embedding        CASCADE;
DROP TABLE IF EXISTS researcher_embedding   CASCADE;
DROP TABLE IF EXISTS paper_author           CASCADE;
DROP TABLE IF EXISTS paper_topic            CASCADE;
DROP TABLE IF EXISTS researcher_topic       CASCADE;
DROP TABLE IF EXISTS paper                  CASCADE;
DROP TABLE IF EXISTS journal_conference     CASCADE;
DROP TABLE IF EXISTS researcher             CASCADE;
DROP TABLE IF EXISTS topic                  CASCADE;
DROP TABLE IF EXISTS affiliation            CASCADE;

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector: vector type, <=> operator, HNSW
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- crypt()/gen_salt() : bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram index : fuzzy researcher-name search

-- =====================================================================
--  1. Independent (parent) tables
-- =====================================================================

CREATE TABLE affiliation (
    affiliation_id  INT GENERATED ALWAYS AS IDENTITY,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(30)  NOT NULL DEFAULT 'University',
    city            VARCHAR(100),
    country         VARCHAR(100),
    website         VARCHAR(255),
    CONSTRAINT pk_affiliation        PRIMARY KEY (affiliation_id),
    CONSTRAINT uq_affiliation_name   UNIQUE (name),
    CONSTRAINT ck_affiliation_type   CHECK (type IN ('University','Research Institute','Industry','Government','Other')),
    CONSTRAINT ck_affiliation_site   CHECK (website IS NULL OR website ~* '^https?://')
);

CREATE TABLE topic (
    topic_id     INT GENERATED ALWAYS AS IDENTITY,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    CONSTRAINT pk_topic       PRIMARY KEY (topic_id),
    CONSTRAINT uq_topic_name  UNIQUE (name),
    CONSTRAINT ck_topic_name  CHECK (length(btrim(name)) > 0)
);

CREATE TABLE journal_conference (
    venue_id       INT GENERATED ALWAYS AS IDENTITY,
    name           VARCHAR(200) NOT NULL,
    type           VARCHAR(20)  NOT NULL DEFAULT 'Journal',
    publisher      VARCHAR(150),
    impact_factor  NUMERIC(6,2),
    CONSTRAINT pk_venue          PRIMARY KEY (venue_id),
    CONSTRAINT uq_venue_name     UNIQUE (name),
    CONSTRAINT ck_venue_type     CHECK (type IN ('Journal','Conference','Workshop','Preprint')),
    CONSTRAINT ck_venue_impact   CHECK (impact_factor IS NULL OR impact_factor >= 0)
);

-- =====================================================================
--  2. Core entities
-- =====================================================================

CREATE TABLE researcher (
    researcher_id  INT GENERATED ALWAYS AS IDENTITY,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(254) NOT NULL,
    bio            TEXT,
    department     VARCHAR(120),
    join_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    affiliation_id INT NOT NULL,
    CONSTRAINT pk_researcher       PRIMARY KEY (researcher_id),
    CONSTRAINT uq_researcher_email UNIQUE (email),
    CONSTRAINT ck_researcher_name  CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT ck_researcher_email CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT fk_researcher_affiliation
        FOREIGN KEY (affiliation_id) REFERENCES affiliation(affiliation_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE paper (
    paper_id          INT GENERATED ALWAYS AS IDENTITY,
    title             VARCHAR(300) NOT NULL,
    abstract          TEXT,
    publication_year  INT,
    venue_id          INT,
    doi               VARCHAR(120),
    CONSTRAINT pk_paper        PRIMARY KEY (paper_id),
    CONSTRAINT uq_paper_doi    UNIQUE (doi),
    CONSTRAINT ck_paper_title  CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_paper_year   CHECK (publication_year IS NULL OR publication_year BETWEEN 1900 AND 2100),
    CONSTRAINT ck_paper_doi    CHECK (doi IS NULL OR doi ~ '^10\.[0-9]{4,9}/\S+$'),
    CONSTRAINT fk_paper_venue
        FOREIGN KEY (venue_id) REFERENCES journal_conference(venue_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- =====================================================================
--  3. Associative tables (resolve M:N relationships, composite PKs)
-- =====================================================================

CREATE TABLE paper_author (
    paper_id             INT NOT NULL,
    researcher_id        INT NOT NULL,
    author_position      INT NOT NULL,
    corresponding_author BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_paper_author PRIMARY KEY (paper_id, researcher_id),
    CONSTRAINT uq_paper_author_position UNIQUE (paper_id, author_position),
    CONSTRAINT ck_author_position CHECK (author_position >= 1),
    CONSTRAINT fk_pa_paper
        FOREIGN KEY (paper_id) REFERENCES paper(paper_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pa_researcher
        FOREIGN KEY (researcher_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE paper_topic (
    paper_id  INT NOT NULL,
    topic_id  INT NOT NULL,
    CONSTRAINT pk_paper_topic PRIMARY KEY (paper_id, topic_id),
    CONSTRAINT fk_pt_paper
        FOREIGN KEY (paper_id) REFERENCES paper(paper_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pt_topic
        FOREIGN KEY (topic_id) REFERENCES topic(topic_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE researcher_topic (
    researcher_id   INT NOT NULL,
    topic_id        INT NOT NULL,
    expertise_level INT NOT NULL DEFAULT 3,
    CONSTRAINT pk_researcher_topic PRIMARY KEY (researcher_id, topic_id),
    CONSTRAINT ck_expertise_level  CHECK (expertise_level BETWEEN 1 AND 5),
    CONSTRAINT fk_rt_researcher
        FOREIGN KEY (researcher_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rt_topic
        FOREIGN KEY (topic_id) REFERENCES topic(topic_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================================
--  4. Vector tables (pgvector) - 1:1 with paper / researcher
--     384 dimensions = output size of the all-MiniLM-L6-v2 model
-- =====================================================================

CREATE TABLE paper_embedding (
    paper_id         INT NOT NULL,
    embedding        vector(384) NOT NULL,
    embedding_model  VARCHAR(80) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    generated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_paper_embedding PRIMARY KEY (paper_id),
    CONSTRAINT fk_pe_paper
        FOREIGN KEY (paper_id) REFERENCES paper(paper_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE researcher_embedding (
    researcher_id    INT NOT NULL,
    embedding        vector(384) NOT NULL,
    embedding_model  VARCHAR(80) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    generated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_researcher_embedding PRIMARY KEY (researcher_id),
    CONSTRAINT fk_re_researcher
        FOREIGN KEY (researcher_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- =====================================================================
--  5. Interaction tables
-- =====================================================================

CREATE TABLE match_result (
    match_id         INT GENERATED ALWAYS AS IDENTITY,
    researcher_1_id  INT NOT NULL,
    researcher_2_id  INT NOT NULL,
    similarity_score NUMERIC(5,4),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_match_result  PRIMARY KEY (match_id),
    -- canonical ordering: a pair (A,B) can exist only once, never as both (A,B) and (B,A)
    CONSTRAINT ck_match_order   CHECK (researcher_1_id < researcher_2_id),
    CONSTRAINT uq_match_pair    UNIQUE (researcher_1_id, researcher_2_id),
    CONSTRAINT ck_match_score   CHECK (similarity_score IS NULL OR similarity_score BETWEEN -1 AND 1),
    CONSTRAINT fk_match_r1
        FOREIGN KEY (researcher_1_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_match_r2
        FOREIGN KEY (researcher_2_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE collaboration_request (
    request_id         INT GENERATED ALWAYS AS IDENTITY,
    sender_id          INT NOT NULL,
    receiver_id        INT NOT NULL,
    proposed_topic_id  INT,
    title              VARCHAR(200),
    message            TEXT,
    status             VARCHAR(15) NOT NULL DEFAULT 'Pending',
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_collab_request   PRIMARY KEY (request_id),
    CONSTRAINT ck_collab_status    CHECK (status IN ('Pending','Accepted','Rejected','Withdrawn')),
    CONSTRAINT ck_collab_not_self  CHECK (sender_id <> receiver_id),
    CONSTRAINT ck_collab_times     CHECK (updated_at >= created_at),
    CONSTRAINT fk_cr_sender
        FOREIGN KEY (sender_id)   REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cr_receiver
        FOREIGN KEY (receiver_id) REFERENCES researcher(researcher_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cr_topic
        FOREIGN KEY (proposed_topic_id) REFERENCES topic(topic_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- =====================================================================
--  6. Indexes
--     (PK / UNIQUE constraints already create their own B-tree indexes)
-- =====================================================================

-- B-tree indexes on foreign keys not covered by a PK/UNIQUE prefix
CREATE INDEX idx_researcher_affiliation ON researcher(affiliation_id);
CREATE INDEX idx_paper_venue            ON paper(venue_id);
CREATE INDEX idx_paper_year             ON paper(publication_year);
CREATE INDEX idx_paper_author_res       ON paper_author(researcher_id);
CREATE INDEX idx_paper_topic_topic      ON paper_topic(topic_id);
CREATE INDEX idx_res_topic_topic        ON researcher_topic(topic_id);
CREATE INDEX idx_match_r2               ON match_result(researcher_2_id);
CREATE INDEX idx_match_score            ON match_result(similarity_score DESC);
CREATE INDEX idx_cr_sender              ON collaboration_request(sender_id);
CREATE INDEX idx_cr_receiver_status     ON collaboration_request(receiver_id, status);

-- Only one live (Pending) request per sender -> receiver -> topic
CREATE UNIQUE INDEX uq_cr_one_pending
    ON collaboration_request (sender_id, receiver_id, COALESCE(proposed_topic_id, 0))
    WHERE status = 'Pending';

-- Trigram index: fuzzy / partial name search  (ILIKE '%anj%', similarity())
CREATE INDEX idx_researcher_name_trgm ON researcher USING gin (full_name gin_trgm_ops);

-- pgvector HNSW indexes for approximate nearest-neighbour search (cosine distance)
CREATE INDEX idx_paper_embedding_hnsw
    ON paper_embedding      USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_researcher_embedding_hnsw
    ON researcher_embedding USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- =====================================================================
--  7. Full-text demo documents
--     Structured synthetic documents are stored in Neon and served by the
--     internal application route /papers/<paper_id>/read.
-- =====================================================================

CREATE TABLE paper_document (
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

CREATE INDEX idx_paper_document_synthetic ON paper_document(is_synthetic);
