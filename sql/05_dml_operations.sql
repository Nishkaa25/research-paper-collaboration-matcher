-- =====================================================================
--  File 05 : DML operations - INSERT / UPDATE / DELETE / Transactions
--  A new researcher is onboarded end-to-end, edited, then removed, so the
--  database returns to the seeded state when the script finishes.
-- =====================================================================
\echo '=== INSERT ==========================================================='

-- I1. New affiliation
INSERT INTO affiliation (name, type, city, country, website)
VALUES ('Indian Institute of Technology Bombay', 'University', 'Mumbai', 'India', 'https://www.iitb.ac.in')
RETURNING affiliation_id, name;

-- I2. New researcher (mixed-case e-mail is lower-cased by trigger; password stored as bcrypt hash)
INSERT INTO researcher (full_name, email, bio, department, affiliation_id, orcid, h_index, password_hash)
SELECT 'Ishaan Verma', 'Ishaan.Verma@iitb.example.edu',
       'Works on vector databases and semantic search for scholarly data.',
       'Computer Science', a.affiliation_id, '0000-0002-1900-0099', 6,
       crypt('Welcome@123', gen_salt('bf', 6))
FROM affiliation a WHERE a.name = 'Indian Institute of Technology Bombay'
RETURNING researcher_id, full_name, email, role, left(password_hash, 7) AS hash_prefix;

-- I3. New paper, its author link, topics and embedding (multi-table insert in ONE transaction)
BEGIN;
    INSERT INTO paper (title, abstract, publication_year, venue_id, doi)
    SELECT 'Approximate Nearest Neighbour Search for Scholarly Recommendation',
           'We evaluate HNSW and IVF indexes for recommending related research papers and researchers using dense embeddings.',
           2025, v.venue_id, '10.5555/rpcm.2025.901'
    FROM journal_conference v WHERE v.name = 'VLDB';

    INSERT INTO paper_author (paper_id, researcher_id, author_position, corresponding_author)
    SELECT p.paper_id, r.researcher_id, 1, TRUE
    FROM paper p, researcher r
    WHERE p.doi = '10.5555/rpcm.2025.901' AND r.email = 'ishaan.verma@iitb.example.edu';

    INSERT INTO paper_topic (paper_id, topic_id)
    SELECT p.paper_id, t.topic_id
    FROM paper p, topic t
    WHERE p.doi = '10.5555/rpcm.2025.901' AND t.name IN ('Databases', 'Information Retrieval');

    INSERT INTO researcher_topic (researcher_id, topic_id, expertise_level)
    SELECT r.researcher_id, t.topic_id, 4
    FROM researcher r, topic t
    WHERE r.email = 'ishaan.verma@iitb.example.edu' AND t.name IN ('Databases', 'Information Retrieval');

    -- vector for the new paper (stand-in: copy the vector of the closest existing paper, id 9)
    INSERT INTO paper_embedding (paper_id, embedding)
    SELECT p.paper_id, (SELECT embedding FROM paper_embedding WHERE paper_id = 9)
    FROM paper p WHERE p.doi = '10.5555/rpcm.2025.901';
COMMIT;

-- I4. Build his profile vector, then ask the system who he should collaborate with
SELECT refresh_researcher_embeddings() AS profiles_refreshed;

SELECT researcher_id, full_name, institution, similarity, shared_topics, already_coauthored
FROM   find_similar_researchers((SELECT researcher_id FROM researcher WHERE email = 'ishaan.verma@iitb.example.edu'), 4);

-- I5. Send him a collaboration request (stored procedure)
DO $$
DECLARE v_new INT; v_topic INT;
BEGIN
    SELECT researcher_id INTO v_new   FROM researcher WHERE email = 'ishaan.verma@iitb.example.edu';
    SELECT topic_id      INTO v_topic FROM topic      WHERE name  = 'Databases';
    CALL send_collaboration_request(12, v_new, v_topic,
         'Benchmarking ANN indexes', 'Would you like to co-author a benchmark of ANN indexes?');
END $$;

\echo '=== UPDATE ==========================================================='

-- U1. Single-row update
UPDATE researcher SET h_index = 7, bio = bio || ' Currently building a hybrid search engine.'
WHERE  email = 'ishaan.verma@iitb.example.edu'
RETURNING researcher_id, h_index, bio;

-- U2. Update driven by a correlated subquery (run inside a transaction and rolled back, so seed data is unchanged):
--     promote expertise to 5 for anyone with 2+ papers on that topic since 2023
BEGIN;
UPDATE researcher_topic rt
SET    expertise_level = 5
WHERE  expertise_level < 5
  AND (SELECT COUNT(*)
         FROM paper_author pa
         JOIN paper_topic pt ON pt.paper_id = pa.paper_id
         JOIN paper p        ON p.paper_id  = pa.paper_id
        WHERE pa.researcher_id = rt.researcher_id
          AND pt.topic_id      = rt.topic_id
          AND p.publication_year >= 2023) >= 2
RETURNING rt.researcher_id, rt.topic_id, rt.expertise_level;
ROLLBACK;

-- U3. Update with FROM (join): the request is resolved, trigger stamps updated_at
UPDATE collaboration_request cr
SET    message = cr.message || ' (Thank you - looking forward to it!)'
FROM   researcher s
WHERE  cr.sender_id = s.researcher_id AND s.email = 'aisha.rahman@mpi.example.edu' AND cr.status = 'Pending'
RETURNING cr.request_id, cr.status, cr.updated_at > cr.created_at AS updated_at_changed;

-- U4. Refresh materialised view after the data change
REFRESH MATERIALIZED VIEW mv_topic_trends;

\echo '=== TRANSACTIONS ======================================================'

-- T1. ROLLBACK: a destructive change that is undone
BEGIN;
    SELECT COUNT(*) AS matches_before FROM match_result;
    DELETE FROM match_result;
    SELECT COUNT(*) AS matches_inside_txn FROM match_result;
ROLLBACK;
SELECT COUNT(*) AS matches_after_rollback FROM match_result;

-- T2. SAVEPOINT: undo only part of a transaction
BEGIN;
    UPDATE researcher SET h_index = h_index + 1 WHERE researcher_id = 1;
    SAVEPOINT before_mistake;
    UPDATE researcher SET h_index = 0 WHERE researcher_id = 1;          -- mistake
    ROLLBACK TO SAVEPOINT before_mistake;                                -- undo only the mistake
    SELECT researcher_id, h_index AS h_index_keeps_first_update FROM researcher WHERE researcher_id = 1;
ROLLBACK;                                                                -- leave demo data untouched

-- T3. Atomic business procedure: accept a request => status change + match row, all-or-nothing
BEGIN;
    CALL respond_to_request(4, 7, 'Accepted');
    SELECT request_id, status FROM collaboration_request WHERE request_id = 4;
    SELECT match_id, researcher_1_id, researcher_2_id, similarity_score
    FROM   match_result WHERE researcher_1_id = 6 AND researcher_2_id = 7;
ROLLBACK;

\echo '=== DELETE ==========================================================='

-- D1. Referential protection: an author cannot be deleted while papers reference them (RESTRICT)
DO $$
BEGIN
    DELETE FROM researcher WHERE email = 'ishaan.verma@iitb.example.edu';
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'BLOCKED as expected: %', SQLERRM;
END $$;

-- D2. Delete the paper: CASCADE removes its author link, topic links and embedding
DELETE FROM paper WHERE doi = '10.5555/rpcm.2025.901' RETURNING paper_id, title;

-- D3. Delete the request, then the researcher: CASCADE removes topic links and profile vector
DELETE FROM collaboration_request
WHERE  receiver_id = (SELECT researcher_id FROM researcher WHERE email = 'ishaan.verma@iitb.example.edu');

DELETE FROM researcher WHERE email = 'ishaan.verma@iitb.example.edu' RETURNING researcher_id, full_name;

-- D4. Delete an affiliation that nobody belongs to; deleting one that is in use is blocked
DELETE FROM affiliation WHERE name = 'Indian Institute of Technology Bombay' RETURNING affiliation_id, name;

DO $$
BEGIN
    DELETE FROM affiliation WHERE name = 'PES University';
EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'BLOCKED as expected: %', SQLERRM;
END $$;

REFRESH MATERIALIZED VIEW mv_topic_trends;
SELECT refresh_researcher_embeddings() AS profiles_refreshed_after_cleanup;
