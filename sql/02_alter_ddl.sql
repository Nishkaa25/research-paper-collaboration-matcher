-- =====================================================================
--  File 02 : DDL evolution - ALTER / DROP / RENAME
--  Adds authentication, ORCID, full-text search and demonstrates DROP.
-- =====================================================================

-- ---------- Authentication & role-based access (Requirements 11, 13) ----------
ALTER TABLE researcher
    ADD COLUMN password_hash TEXT,
    ADD COLUMN role          VARCHAR(10) NOT NULL DEFAULT 'researcher',
    ADD COLUMN is_active     BOOLEAN     NOT NULL DEFAULT TRUE;

ALTER TABLE researcher
    ADD CONSTRAINT ck_researcher_role CHECK (role IN ('researcher','admin')),
    -- bcrypt hashes look like $2a$06$... ; this rejects any plain-text password
    ADD CONSTRAINT ck_researcher_pwd_hashed CHECK (password_hash IS NULL OR password_hash ~ '^\$2[abxy]\$[0-9]{2}\$.{53}$');

-- ---------- Researcher identity fields ----------
ALTER TABLE researcher ADD COLUMN orcid   VARCHAR(19);
ALTER TABLE researcher ADD COLUMN h_index INT;

ALTER TABLE researcher
    ADD CONSTRAINT uq_researcher_orcid UNIQUE (orcid),
    ADD CONSTRAINT ck_researcher_orcid CHECK (orcid IS NULL OR orcid ~ '^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$'),
    ADD CONSTRAINT ck_researcher_hindex CHECK (h_index IS NULL OR h_index >= 0);

-- ---------- Full-text search on papers (weighted: title A, abstract B) ----------
ALTER TABLE paper
    ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title,    '')), 'A') ||
        setweight(to_tsvector('english', coalesce(abstract, '')), 'B')
    ) STORED;

CREATE INDEX idx_paper_fts ON paper USING gin (search_vector);

-- ---------- Tighten / modify existing definitions ----------
ALTER TABLE researcher ALTER COLUMN department SET DEFAULT 'Not specified';
ALTER TABLE collaboration_request ALTER COLUMN title SET NOT NULL;
ALTER TABLE researcher RENAME CONSTRAINT ck_researcher_email TO ck_researcher_email_format;

-- ---------- DROP demonstrations ----------
-- (a) scratch table created and dropped
CREATE TABLE scratch_notes (note_id INT PRIMARY KEY, note TEXT);
DROP TABLE scratch_notes;

-- (b) column added and dropped
ALTER TABLE match_result ADD COLUMN reviewer_note TEXT;
ALTER TABLE match_result DROP COLUMN reviewer_note;

-- (c) redundant index removed: (researcher_1_id, researcher_2_id) UNIQUE already serves lookups by researcher_1_id
CREATE INDEX idx_match_r1_redundant ON match_result(researcher_1_id);
DROP INDEX idx_match_r1_redundant;

-- (d) constraint added and dropped
ALTER TABLE paper ADD CONSTRAINT ck_temp_year CHECK (publication_year >= 1950);
ALTER TABLE paper DROP CONSTRAINT ck_temp_year;
