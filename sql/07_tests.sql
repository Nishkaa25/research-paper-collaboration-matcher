-- =====================================================================
--  File 07 : Automated integrity & constraint tests
--  Every test runs inside one transaction that is rolled back at the end,
--  so the database is left exactly as it was.
-- =====================================================================
\set QUIET on
\o /dev/null
BEGIN;

CREATE TEMP TABLE test_results (id TEXT, category TEXT, description TEXT, expected TEXT, actual TEXT, result TEXT);

-- helper: statement MUST fail with the given SQLSTATE.
-- If it unexpectedly succeeds, a deliberate exception rolls its effects back so later tests stay valid.
CREATE FUNCTION pg_temp.expect_error(p_id TEXT, p_cat TEXT, p_desc TEXT, p_sql TEXT, p_state TEXT, p_label TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'statement was accepted' USING ERRCODE = 'XX999';
EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'XX999' THEN
        INSERT INTO test_results VALUES (p_id, p_cat, p_desc, 'rejected (' || p_label || ')', 'accepted', 'FAIL');
    ELSE
        INSERT INTO test_results VALUES (p_id, p_cat, p_desc, 'rejected (' || p_label || ')',
            'rejected (' || SQLSTATE || ')', CASE WHEN SQLSTATE = p_state THEN 'PASS' ELSE 'FAIL' END);
    END IF;
END $$ LANGUAGE plpgsql;

-- helper: a boolean query MUST return true
CREATE FUNCTION pg_temp.expect_true(p_id TEXT, p_cat TEXT, p_desc TEXT, p_expected TEXT, p_ok BOOLEAN)
RETURNS VOID AS $$
BEGIN
    INSERT INTO test_results VALUES (p_id, p_cat, p_desc, p_expected,
        CASE WHEN p_ok THEN p_expected ELSE 'different' END, CASE WHEN p_ok THEN 'PASS' ELSE 'FAIL' END);
END $$ LANGUAGE plpgsql;

-- ---------------- Domain / CHECK constraints ----------------
SELECT pg_temp.expect_error('T01','Domain','Invalid e-mail format',
  $q$INSERT INTO researcher(full_name,email,affiliation_id) VALUES ('X','not-an-email',1)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T02','Domain','Blank researcher name',
  $q$INSERT INTO researcher(full_name,email,affiliation_id) VALUES ('   ','blank@x.example.edu',1)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T03','Domain','Invalid affiliation type',
  $q$INSERT INTO affiliation(name,type) VALUES ('Test Org','Club')$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T04','Domain','Website must start with http(s)',
  $q$INSERT INTO affiliation(name,website) VALUES ('Test Org','ftp://x')$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T05','Domain','Publication year out of range (1800)',
  $q$INSERT INTO paper(title,publication_year) VALUES ('Old',1800)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T06','Domain','Malformed DOI',
  $q$INSERT INTO paper(title,doi) VALUES ('Bad DOI','doi:123')$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T07','Domain','Expertise level outside 1-5',
  $q$INSERT INTO researcher_topic(researcher_id,topic_id,expertise_level) VALUES (21,1,9)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T08','Domain','Negative impact factor',
  $q$INSERT INTO journal_conference(name,type,impact_factor) VALUES ('J','Journal',-1)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T09','Domain','Similarity score above 1',
  $q$INSERT INTO match_result(researcher_1_id,researcher_2_id,similarity_score) VALUES (20,21,1.5)$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T10','Domain','ORCID in wrong format',
  $q$UPDATE researcher SET orcid = '1234' WHERE researcher_id = 1$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T11','Domain','Unknown role value',
  $q$UPDATE researcher SET role = 'superuser' WHERE researcher_id = 1$q$,'23514','CHECK');

-- ---------------- Security ----------------
SELECT pg_temp.expect_error('T12','Security','Plain-text password rejected (must be bcrypt hash)',
  $q$UPDATE researcher SET password_hash = 'Welcome@123' WHERE researcher_id = 1$q$,'23514','CHECK');
SELECT pg_temp.expect_true('T13','Security','Stored passwords are bcrypt hashes for every account','all 21 hashed',
  (SELECT COUNT(*) = 21 FROM researcher WHERE password_hash ~ '^\$2a\$06\$'));

-- ---------------- NOT NULL / UNIQUE ----------------
SELECT pg_temp.expect_error('T14','Uniqueness','NULL researcher name',
  $q$INSERT INTO researcher(full_name,email,affiliation_id) VALUES (NULL,'n@x.example.edu',1)$q$,'23502','NOT NULL');
SELECT pg_temp.expect_error('T15','Uniqueness','Duplicate e-mail (case-insensitive via trigger)',
  $q$INSERT INTO researcher(full_name,email,affiliation_id) VALUES ('Dup','ANANYA.RAO@pes.example.edu',1)$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T16','Uniqueness','Duplicate DOI',
  $q$INSERT INTO paper(title,doi) VALUES ('Copy','10.5555/rpcm.2023.001')$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T17','Uniqueness','Duplicate topic name',
  $q$INSERT INTO topic(name) VALUES ('Databases')$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T18','Uniqueness','Same researcher added twice to a paper (composite PK)',
  $q$INSERT INTO paper_author(paper_id,researcher_id,author_position) VALUES (1,1,3)$q$,'23505','PK');
SELECT pg_temp.expect_error('T19','Uniqueness','Two authors in the same position on a paper',
  $q$INSERT INTO paper_author(paper_id,researcher_id,author_position) VALUES (1,2,1)$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T20','Uniqueness','Second corresponding author on a paper',
  $q$INSERT INTO paper_author(paper_id,researcher_id,author_position,corresponding_author) VALUES (1,2,3,TRUE)$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T21','Uniqueness','Duplicate match pair',
  $q$INSERT INTO match_result(researcher_1_id,researcher_2_id,similarity_score) SELECT researcher_1_id,researcher_2_id,0.5 FROM match_result LIMIT 1$q$,'23505','UNIQUE');
SELECT pg_temp.expect_error('T22','Uniqueness','Duplicate PENDING request (partial unique index)',
  $q$INSERT INTO collaboration_request(sender_id,receiver_id,proposed_topic_id,title) VALUES (6,7,10,'again')$q$,'23505','UNIQUE');

-- ---------------- Referential integrity ----------------
SELECT pg_temp.expect_error('T23','Referential','Researcher with non-existent affiliation',
  $q$INSERT INTO researcher(full_name,email,affiliation_id) VALUES ('Ghost','g@x.example.edu',999)$q$,'23503','FK');
SELECT pg_temp.expect_error('T24','Referential','Authorship for non-existent paper',
  $q$INSERT INTO paper_author(paper_id,researcher_id,author_position) VALUES (999,1,1)$q$,'23503','FK');
SELECT pg_temp.expect_error('T25','Referential','Deleting a researcher who has papers (RESTRICT)',
  $q$DELETE FROM researcher WHERE researcher_id = 1$q$,'23503','FK');
SELECT pg_temp.expect_error('T26','Referential','Deleting an affiliation that has researchers (RESTRICT)',
  $q$DELETE FROM affiliation WHERE affiliation_id = 1$q$,'23503','FK');
SELECT pg_temp.expect_error('T27','Referential','Collaboration request to non-existent receiver',
  $q$INSERT INTO collaboration_request(sender_id,receiver_id,title) VALUES (1,999,'x')$q$,'23503','FK');

-- ---------------- Vector integrity ----------------
SELECT pg_temp.expect_error('T28','Vector','Embedding with wrong dimension (3 instead of 384)',
  $q$INSERT INTO paper_embedding(paper_id,embedding) VALUES (1,'[1,2,3]')$q$,'22000','dimension');
SELECT pg_temp.expect_error('T29','Vector','Second embedding for the same paper (1:1 via PK)',
  $q$INSERT INTO paper_embedding(paper_id,embedding) SELECT paper_id, embedding FROM paper_embedding WHERE paper_id = 1$q$,'23505','PK');

-- ---------------- Triggers ----------------
SELECT pg_temp.expect_error('T30','Trigger','Self-collaboration request',
  $q$INSERT INTO collaboration_request(sender_id,receiver_id,title) VALUES (1,1,'me')$q$,'23514','CHECK');
SELECT pg_temp.expect_error('T31','Trigger','Reverting an Accepted request to Pending',
  $q$UPDATE collaboration_request SET status = 'Pending' WHERE request_id = 1$q$,'23514','trigger');
SELECT pg_temp.expect_error('T32','Trigger','Changing the receiver of an existing request',
  $q$UPDATE collaboration_request SET receiver_id = 9 WHERE request_id = 4$q$,'23514','trigger');
SELECT pg_temp.expect_error('T33','Trigger','Invalid request status value',
  $q$UPDATE collaboration_request SET status = 'Maybe' WHERE request_id = 4$q$,'23514','CHECK');

DO $$
DECLARE v_id INT; a INT; b INT; t_old TIMESTAMP; t_new TIMESTAMP;
BEGIN
    -- e-mail lower-casing trigger
    INSERT INTO researcher(full_name,email,affiliation_id) VALUES ('Case Test','  CaseTest@PES.Example.EDU ',1) RETURNING researcher_id INTO v_id;
    PERFORM pg_temp.expect_true('T34','Trigger','E-mail normalised to lower case and trimmed','casetest@pes.example.edu',
            (SELECT email = 'casetest@pes.example.edu' FROM researcher WHERE researcher_id = v_id));

    -- match pair normalisation (reverse order is stored canonical)
    INSERT INTO match_result(researcher_1_id,researcher_2_id,similarity_score) VALUES (v_id, 1, 0.5) RETURNING researcher_1_id, researcher_2_id INTO a, b;
    PERFORM pg_temp.expect_true('T35','Trigger','Match pair (larger,smaller) is stored as (smaller,larger)','researcher_1_id < researcher_2_id', a < b);

    -- updated_at trigger
    SELECT updated_at INTO t_old FROM collaboration_request WHERE request_id = 4;
    PERFORM pg_sleep(0.01);
    UPDATE collaboration_request SET message = message || '.' WHERE request_id = 4;
    SELECT updated_at INTO t_new FROM collaboration_request WHERE request_id = 4;
    PERFORM pg_temp.expect_true('T36','Trigger','updated_at refreshed automatically on UPDATE','updated_at increased', t_new > t_old);

    -- inactive sender
    UPDATE researcher SET is_active = FALSE WHERE researcher_id = v_id;
    PERFORM pg_temp.expect_error('T37','Trigger','Deactivated researcher cannot send a request',
        format('INSERT INTO collaboration_request(sender_id,receiver_id,title) VALUES (%s,1,''hi'')', v_id),'23514','trigger');
    PERFORM pg_temp.expect_true('T38','Security','Deactivated account cannot authenticate','0 rows',
        (SELECT COUNT(*) = 0 FROM authenticate_researcher('casetest@pes.example.edu','x')));
END $$;

-- ---------------- Stored procedures / transactions ----------------
SELECT pg_temp.expect_error('T39','Procedure','Only the receiver may respond to a request',
  $q$CALL respond_to_request(4, 1, 'Accepted')$q$,'P0001','raise');
SELECT pg_temp.expect_error('T40','Procedure','A finished request cannot be answered again',
  $q$CALL respond_to_request(1, 17, 'Rejected')$q$,'P0001','raise');
SELECT pg_temp.expect_error('T41','Procedure','Invalid decision value',
  $q$CALL respond_to_request(4, 7, 'Maybe')$q$,'P0001','raise');
SELECT pg_temp.expect_error('T42','Procedure','Cannot send a request when the other party already has one pending to you',
  $q$CALL send_collaboration_request(7, 6, 10, 'reverse', 'x')$q$,'P0001','raise');
SELECT pg_temp.expect_error('T43','Procedure','Only the sender may withdraw a request',
  $q$CALL withdraw_request(4, 7)$q$,'P0001','raise');

DO $$
DECLARE before_cnt INT; after_cnt INT;
BEGIN
    -- failed procedure leaves no partial change (atomicity)
    SELECT COUNT(*) INTO before_cnt FROM match_result;
    BEGIN
        CALL respond_to_request(4, 1, 'Accepted');       -- wrong receiver -> error
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    SELECT COUNT(*) INTO after_cnt FROM match_result;
    PERFORM pg_temp.expect_true('T44','Transaction','Failed procedure leaves no partial change (atomicity)','row counts equal', before_cnt = after_cnt
            AND (SELECT status FROM collaboration_request WHERE request_id = 4) = 'Pending');

    -- successful accept creates the match in the same transaction
    CALL respond_to_request(4, 7, 'Accepted');
    PERFORM pg_temp.expect_true('T45','Transaction','Accepting a request records the pair in match_result','status Accepted + match row',
            (SELECT status = 'Accepted' FROM collaboration_request WHERE request_id = 4)
        AND EXISTS (SELECT 1 FROM match_result WHERE researcher_1_id = 6 AND researcher_2_id = 7));
END $$;

-- ---------------- Cascades ----------------
DO $$
DECLARE n_emb INT; n_pt INT; n_pa INT; v INT;
BEGIN
    DELETE FROM paper WHERE paper_id = 1;
    SELECT COUNT(*) INTO n_emb FROM paper_embedding WHERE paper_id = 1;
    SELECT COUNT(*) INTO n_pt  FROM paper_topic     WHERE paper_id = 1;
    SELECT COUNT(*) INTO n_pa  FROM paper_author    WHERE paper_id = 1;
    PERFORM pg_temp.expect_true('T46','Cascade','Deleting a paper removes its embedding, topics and author links','0 dependent rows', n_emb + n_pt + n_pa = 0);

    SELECT venue_id INTO v FROM paper WHERE paper_id = 2;
    DELETE FROM journal_conference WHERE venue_id = v;
    PERFORM pg_temp.expect_true('T47','Cascade','Deleting a venue keeps the paper and sets venue_id to NULL','paper kept, venue NULL',
            (SELECT venue_id IS NULL FROM paper WHERE paper_id = 2));

    DELETE FROM topic WHERE name = 'Robotics';
    PERFORM pg_temp.expect_true('T48','Cascade','Deleting a topic removes its paper/researcher links only','links gone, papers kept',
            NOT EXISTS (SELECT 1 FROM paper_topic pt JOIN topic t ON t.topic_id = pt.topic_id WHERE t.name = 'Robotics')
        AND (SELECT COUNT(*) FROM paper) = 39);
END $$;

-- ---------------- Search ----------------
SELECT pg_temp.expect_true('T49','Search','Full-text search finds papers by stemmed keyword','>= 3 results',
  (SELECT COUNT(*) >= 3 FROM search_papers_text('reinforcement learning', 10)));
SELECT pg_temp.expect_true('T50','Search','A paper is its own nearest neighbour (similarity = 1)','similarity 1.0000',
  (SELECT similarity = 1 FROM search_papers_semantic((SELECT embedding FROM paper_embedding WHERE paper_id = 9), 1)));

-- ---------------- Report ----------------
\o
\set QUIET off
SELECT id, category, description, result FROM test_results ORDER BY id;
SELECT COUNT(*) AS total_tests,
       COUNT(*) FILTER (WHERE result = 'PASS') AS passed,
       COUNT(*) FILTER (WHERE result = 'FAIL') AS failed
FROM test_results;
SELECT id, description, expected, actual FROM test_results WHERE result = 'FAIL' ORDER BY id;

ROLLBACK;
