-- =====================================================================
--  File 03 : Advanced database features
--    Triggers | Stored functions & procedures | Views | Materialized view
--    Vector similarity search | Full-text search | Transactions
-- =====================================================================

-- One corresponding author per paper (partial unique index)
CREATE UNIQUE INDEX uq_one_corresponding_author
    ON paper_author (paper_id) WHERE corresponding_author;

-- =====================================================================
--  A. TRIGGERS
-- =====================================================================

-- A1. Keep collaboration_request.updated_at current
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cr_updated_at
    BEFORE UPDATE ON collaboration_request
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- A2. Request life-cycle: once a request leaves 'Pending' it is final
CREATE OR REPLACE FUNCTION fn_enforce_request_lifecycle() RETURNS trigger AS $$
BEGIN
    IF OLD.status <> 'Pending' AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Request % is already % and cannot change to %',
              OLD.request_id, OLD.status, NEW.status
              USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id THEN
        RAISE EXCEPTION 'Sender and receiver of a request cannot be changed'
              USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cr_lifecycle
    BEFORE UPDATE ON collaboration_request
    FOR EACH ROW EXECUTE FUNCTION fn_enforce_request_lifecycle();

-- A3. Store each match pair in canonical order (smaller id first)
CREATE OR REPLACE FUNCTION fn_normalize_match_pair() RETURNS trigger AS $$
DECLARE tmp INT;
BEGIN
    IF NEW.researcher_1_id > NEW.researcher_2_id THEN
        tmp := NEW.researcher_1_id;
        NEW.researcher_1_id := NEW.researcher_2_id;
        NEW.researcher_2_id := tmp;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_normalize
    BEFORE INSERT OR UPDATE ON match_result
    FOR EACH ROW EXECUTE FUNCTION fn_normalize_match_pair();

-- A4. Normalise e-mail addresses (case-insensitive uniqueness)
CREATE OR REPLACE FUNCTION fn_lower_email() RETURNS trigger AS $$
BEGIN
    NEW.email := lower(btrim(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_researcher_email
    BEFORE INSERT OR UPDATE OF email ON researcher
    FOR EACH ROW EXECUTE FUNCTION fn_lower_email();

-- A5. A deactivated researcher cannot send new requests
CREATE OR REPLACE FUNCTION fn_block_inactive_sender() RETURNS trigger AS $$
BEGIN
    IF NOT (SELECT is_active FROM researcher WHERE researcher_id = NEW.sender_id) THEN
        RAISE EXCEPTION 'Researcher % is deactivated and cannot send requests', NEW.sender_id
              USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cr_active_sender
    BEFORE INSERT ON collaboration_request
    FOR EACH ROW EXECUTE FUNCTION fn_block_inactive_sender();

-- =====================================================================
--  B. STORED FUNCTIONS
-- =====================================================================

-- B1. Authentication: returns the researcher if e-mail + password match (bcrypt via pgcrypto)
CREATE OR REPLACE FUNCTION authenticate_researcher(p_email TEXT, p_password TEXT)
RETURNS TABLE (researcher_id INT, full_name VARCHAR, role VARCHAR) AS $$
    SELECT r.researcher_id, r.full_name, r.role
    FROM   researcher r
    WHERE  r.email = lower(btrim(p_email))
      AND  r.is_active
      AND  r.password_hash = crypt(p_password, r.password_hash);
$$ LANGUAGE sql STABLE;

-- B2. Build each researcher's profile vector = mean of the embeddings of their papers
CREATE OR REPLACE FUNCTION refresh_researcher_embeddings() RETURNS INT AS $$
DECLARE n INT;
BEGIN
    INSERT INTO researcher_embedding (researcher_id, embedding, embedding_model, generated_at)
    SELECT pa.researcher_id, avg(pe.embedding), 'all-MiniLM-L6-v2 (mean of paper vectors)', CURRENT_TIMESTAMP
    FROM   paper_author pa
    JOIN   paper_embedding pe ON pe.paper_id = pa.paper_id
    GROUP  BY pa.researcher_id
    ON CONFLICT (researcher_id) DO UPDATE
       SET embedding = EXCLUDED.embedding,
           embedding_model = EXCLUDED.embedding_model,
           generated_at = EXCLUDED.generated_at;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$ LANGUAGE plpgsql;

-- B3. Populate MATCH_RESULT with each researcher's top-k semantic neighbours
--     (cosine similarity = 1 - cosine distance). Existing co-authors are skipped:
--     the goal is to discover NEW collaborators.
CREATE OR REPLACE FUNCTION generate_matches(p_top_k INT DEFAULT 5, p_min_score NUMERIC DEFAULT 0.30)
RETURNS INT AS $$
DECLARE n INT;
BEGIN
    INSERT INTO match_result (researcher_1_id, researcher_2_id, similarity_score)
    SELECT LEAST(x.a_id, x.b_id), GREATEST(x.a_id, x.b_id), MAX(x.sim)
    FROM (
        SELECT a.researcher_id AS a_id, nb.researcher_id AS b_id, ROUND(nb.sim::numeric, 4) AS sim
        FROM   researcher_embedding a
        CROSS JOIN LATERAL (
            SELECT b.researcher_id, 1 - (a.embedding <=> b.embedding) AS sim
            FROM   researcher_embedding b
            WHERE  b.researcher_id <> a.researcher_id
              AND  NOT EXISTS (SELECT 1
                               FROM paper_author x JOIN paper_author y ON y.paper_id = x.paper_id
                               WHERE x.researcher_id = a.researcher_id
                                 AND y.researcher_id = b.researcher_id)
            ORDER  BY a.embedding <=> b.embedding
            LIMIT  p_top_k
        ) nb
        WHERE nb.sim >= p_min_score
    ) x
    GROUP BY LEAST(x.a_id, x.b_id), GREATEST(x.a_id, x.b_id)
    ON CONFLICT (researcher_1_id, researcher_2_id)
    DO UPDATE SET similarity_score = EXCLUDED.similarity_score, created_at = CURRENT_TIMESTAMP;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$ LANGUAGE plpgsql;

-- B4. Recommend collaborators for one researcher (vector search + relational enrichment)
CREATE OR REPLACE FUNCTION find_similar_researchers(
    p_researcher_id INT,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    researcher_id INT,
    full_name VARCHAR,
    institution VARCHAR,
    similarity NUMERIC,
    shared_topics INT,
    already_coauthored BOOLEAN
) AS $$
    SELECT
        r.researcher_id,
        r.full_name,
        a.name,
        ROUND((1 - (re.embedding <=> me.embedding))::numeric, 4),

        (
            SELECT COUNT(*)::INT
            FROM researcher_topic t1
            JOIN researcher_topic t2
                ON t2.topic_id = t1.topic_id
            WHERE t1.researcher_id = p_researcher_id
              AND t2.researcher_id = r.researcher_id
        ),

        FALSE

    FROM researcher_embedding me
    JOIN researcher_embedding re
        ON re.researcher_id <> me.researcher_id
    JOIN researcher r
        ON r.researcher_id = re.researcher_id
    JOIN affiliation a
        ON a.affiliation_id = r.affiliation_id

    WHERE me.researcher_id = p_researcher_id
      AND r.is_active
      AND r.role <> 'admin'

      AND NOT EXISTS (
          SELECT 1
          FROM paper_author x
          JOIN paper_author y
              ON y.paper_id = x.paper_id
          WHERE x.researcher_id = p_researcher_id
            AND y.researcher_id = r.researcher_id
      )

    ORDER BY re.embedding <=> me.embedding
    LIMIT p_limit;

$$ LANGUAGE sql STABLE;
-- B5. Semantic paper search: nearest papers to a query vector
CREATE OR REPLACE FUNCTION search_papers_semantic(p_query vector(384), p_limit INT DEFAULT 5)
RETURNS TABLE (paper_id INT, title VARCHAR, publication_year INT, similarity NUMERIC) AS $$
    SELECT p.paper_id, p.title, p.publication_year,
           ROUND((1 - (pe.embedding <=> p_query))::numeric, 4)
    FROM   paper_embedding pe
    JOIN   paper p ON p.paper_id = pe.paper_id
    ORDER  BY pe.embedding <=> p_query
    LIMIT  p_limit;
$$ LANGUAGE sql STABLE;

-- B6. Keyword paper search (full-text, ranked, with highlighted snippet)
CREATE OR REPLACE FUNCTION search_papers_text(p_query TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (paper_id INT, title VARCHAR, rank REAL, snippet TEXT) AS $$
    SELECT p.paper_id, p.title,
           ts_rank(p.search_vector, q.tsq),
           ts_headline('english', coalesce(p.abstract, ''), q.tsq,
                       'MaxWords=18, MinWords=8, StartSel=[[, StopSel=]]')
    FROM   paper p, websearch_to_tsquery('english', p_query) AS q(tsq)
    WHERE  p.search_vector @@ q.tsq
    ORDER  BY 3 DESC
    LIMIT  p_limit;
$$ LANGUAGE sql STABLE;

-- =====================================================================
--  C. STORED PROCEDURES  (multi-statement business transactions)
-- =====================================================================

-- C1. Send a collaboration request (validates both parties before inserting)
CREATE OR REPLACE PROCEDURE send_collaboration_request(
    p_sender INT, p_receiver INT, p_topic INT, p_title VARCHAR, p_message TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM researcher WHERE researcher_id = p_receiver AND is_active) THEN
        RAISE EXCEPTION 'Receiver % does not exist or is inactive', p_receiver;
    END IF;
    IF EXISTS (SELECT 1 FROM collaboration_request
               WHERE sender_id = p_receiver AND receiver_id = p_sender AND status = 'Pending') THEN
        RAISE EXCEPTION 'Researcher % has already sent you a pending request - please respond to it', p_receiver;
    END IF;
    INSERT INTO collaboration_request (sender_id, receiver_id, proposed_topic_id, title, message)
    VALUES (p_sender, p_receiver, p_topic, p_title, p_message);
END;
$$;

-- C2. Accept / reject a request. ATOMIC: row lock -> validation -> status change
--     -> (if accepted) record the pair in match_result. Any failure rolls back everything.
CREATE OR REPLACE PROCEDURE respond_to_request(
    p_request_id INT, p_receiver_id INT, p_decision VARCHAR)
LANGUAGE plpgsql AS $$
DECLARE
    v_req   collaboration_request%ROWTYPE;
    v_score NUMERIC(5,4);
BEGIN
    IF p_decision NOT IN ('Accepted','Rejected') THEN
        RAISE EXCEPTION 'Decision must be Accepted or Rejected (got %)', p_decision;
    END IF;

    SELECT * INTO v_req FROM collaboration_request WHERE request_id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request % not found', p_request_id;
    END IF;
    IF v_req.receiver_id <> p_receiver_id THEN
        RAISE EXCEPTION 'Researcher % is not the receiver of request %', p_receiver_id, p_request_id;
    END IF;
    IF v_req.status <> 'Pending' THEN
        RAISE EXCEPTION 'Request % is already %', p_request_id, v_req.status;
    END IF;

    UPDATE collaboration_request SET status = p_decision WHERE request_id = p_request_id;

    IF p_decision = 'Accepted' THEN
        SELECT ROUND((1 - (a.embedding <=> b.embedding))::numeric, 4) INTO v_score
        FROM   researcher_embedding a, researcher_embedding b
        WHERE  a.researcher_id = v_req.sender_id AND b.researcher_id = v_req.receiver_id;

        INSERT INTO match_result (researcher_1_id, researcher_2_id, similarity_score)
        VALUES (v_req.sender_id, v_req.receiver_id, v_score)
        ON CONFLICT (researcher_1_id, researcher_2_id) DO NOTHING;
    END IF;
END;
$$;

-- C3. Sender withdraws a still-pending request
CREATE OR REPLACE PROCEDURE withdraw_request(p_request_id INT, p_sender_id INT)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE collaboration_request SET status = 'Withdrawn'
    WHERE  request_id = p_request_id AND sender_id = p_sender_id AND status = 'Pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No pending request % owned by researcher %', p_request_id, p_sender_id;
    END IF;
END;
$$;

-- =====================================================================
--  D. VIEWS
-- =====================================================================

-- D1. One row per researcher with institution, publication count and topics
CREATE OR REPLACE VIEW v_researcher_profile AS
SELECT r.researcher_id, r.full_name, r.email, r.department, r.role, r.h_index,
       a.name AS institution, a.country,
       COALESCE(pc.paper_count, 0)              AS paper_count,
       COALESCE(tp.topics, '-')                 AS topics,
       (re.researcher_id IS NOT NULL)           AS has_embedding
FROM   researcher r
JOIN   affiliation a ON a.affiliation_id = r.affiliation_id
LEFT JOIN (SELECT researcher_id, COUNT(*) AS paper_count
           FROM paper_author GROUP BY researcher_id) pc ON pc.researcher_id = r.researcher_id
LEFT JOIN (SELECT rt.researcher_id,
                  string_agg(t.name || ' (' || rt.expertise_level || ')', ', ' ORDER BY rt.expertise_level DESC, t.name) AS topics
           FROM researcher_topic rt JOIN topic t ON t.topic_id = rt.topic_id
           GROUP BY rt.researcher_id) tp ON tp.researcher_id = r.researcher_id
LEFT JOIN researcher_embedding re ON re.researcher_id = r.researcher_id;

-- D2. Paper with venue, ordered author list and topics
CREATE OR REPLACE VIEW v_paper_details AS
SELECT p.paper_id, p.title, p.publication_year, p.doi,
       jc.name AS venue, jc.type AS venue_type, jc.impact_factor,
       (SELECT string_agg(r.full_name, ', ' ORDER BY pa.author_position)
          FROM paper_author pa JOIN researcher r ON r.researcher_id = pa.researcher_id
         WHERE pa.paper_id = p.paper_id) AS authors,
       (SELECT string_agg(t.name, ', ' ORDER BY t.name)
          FROM paper_topic pt JOIN topic t ON t.topic_id = pt.topic_id
         WHERE pt.paper_id = p.paper_id) AS topics
FROM   paper p
LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id;

-- D3. Ranked match list with names, institutions and number of shared topics
CREATE OR REPLACE VIEW v_top_matches AS
SELECT m.match_id, m.similarity_score,
       r1.researcher_id AS researcher_1_id, r1.full_name AS researcher_1, a1.name AS institution_1,
       r2.researcher_id AS researcher_2_id, r2.full_name AS researcher_2, a2.name AS institution_2,
       (SELECT COUNT(*) FROM researcher_topic x
          JOIN researcher_topic y ON y.topic_id = x.topic_id
         WHERE x.researcher_id = r1.researcher_id AND y.researcher_id = r2.researcher_id) AS shared_topics
FROM   match_result m
JOIN   researcher  r1 ON r1.researcher_id = m.researcher_1_id
JOIN   researcher  r2 ON r2.researcher_id = m.researcher_2_id
JOIN   affiliation a1 ON a1.affiliation_id = r1.affiliation_id
JOIN   affiliation a2 ON a2.affiliation_id = r2.affiliation_id
ORDER  BY m.similarity_score DESC;

-- D4. Request inbox/outbox with human-readable names
CREATE OR REPLACE VIEW v_collaboration_requests AS
SELECT cr.request_id, cr.status, cr.title, cr.message, cr.created_at, cr.updated_at,
       s.researcher_id AS sender_id,   s.full_name AS sender_name,
       rc.researcher_id AS receiver_id, rc.full_name AS receiver_name,
       t.name AS proposed_topic
FROM   collaboration_request cr
JOIN   researcher s  ON s.researcher_id  = cr.sender_id
JOIN   researcher rc ON rc.researcher_id = cr.receiver_id
LEFT JOIN topic t    ON t.topic_id = cr.proposed_topic_id;

-- D5. Materialized view: research-topic trends (heavy aggregate, refreshed on demand)
CREATE MATERIALIZED VIEW mv_topic_trends AS
SELECT t.topic_id, t.name AS topic, p.publication_year,
       COUNT(DISTINCT p.paper_id)      AS papers,
       COUNT(DISTINCT pa.researcher_id) AS researchers
FROM   topic t
JOIN   paper_topic pt  ON pt.topic_id = t.topic_id
JOIN   paper p         ON p.paper_id  = pt.paper_id
JOIN   paper_author pa ON pa.paper_id = p.paper_id
GROUP  BY t.topic_id, t.name, p.publication_year;

CREATE UNIQUE INDEX uq_mv_topic_trends ON mv_topic_trends (topic_id, publication_year);
