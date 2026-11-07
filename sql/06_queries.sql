-- =====================================================================
--  File 06 : Important queries (read-only)
--  JOIN | GROUP BY | HAVING | ORDER BY | aggregates | subqueries | CTE |
--  window functions | set operations | full-text | vector | trigram
-- =====================================================================
\echo '--- Q1  JOIN + aggregate: most published researchers with their institution'
SELECT r.full_name, a.name AS institution, COUNT(pa.paper_id) AS papers
FROM   researcher r
JOIN   affiliation a  ON a.affiliation_id = r.affiliation_id
JOIN   paper_author pa ON pa.researcher_id = r.researcher_id
GROUP  BY r.researcher_id, r.full_name, a.name
ORDER  BY papers DESC, r.full_name
LIMIT  5;

\echo '--- Q2  GROUP BY + HAVING: venues with at least 4 papers, and their average year'
SELECT jc.name AS venue, jc.type, COUNT(*) AS papers, ROUND(AVG(p.publication_year), 1) AS avg_year
FROM   paper p JOIN journal_conference jc ON jc.venue_id = p.venue_id
GROUP  BY jc.venue_id, jc.name, jc.type
HAVING COUNT(*) >= 4
ORDER  BY papers DESC, venue;

\echo '--- Q3  Institutions ranked by distinct papers (multi-join, COUNT DISTINCT)'
SELECT a.name AS institution, a.country,
       COUNT(DISTINCT r.researcher_id) AS researchers,
       COUNT(DISTINCT pa.paper_id)     AS papers
FROM   affiliation a
JOIN   researcher r    ON r.affiliation_id = a.affiliation_id
JOIN   paper_author pa ON pa.researcher_id = r.researcher_id
GROUP  BY a.affiliation_id, a.name, a.country
HAVING COUNT(DISTINCT pa.paper_id) >= 6
ORDER  BY papers DESC;

\echo '--- Q4  Subquery: researchers with more papers than the average author'
SELECT r.full_name, x.papers
FROM   researcher r
JOIN  (SELECT researcher_id, COUNT(*) AS papers FROM paper_author GROUP BY researcher_id) x
       ON x.researcher_id = r.researcher_id
WHERE  x.papers > (SELECT AVG(c) FROM (SELECT COUNT(*) AS c FROM paper_author GROUP BY researcher_id) t)
ORDER  BY x.papers DESC, r.full_name;

\echo '--- Q5  NOT EXISTS: researchers who have never sent a collaboration request'
SELECT r.researcher_id, r.full_name
FROM   researcher r
WHERE  r.role = 'researcher'
  AND  NOT EXISTS (SELECT 1 FROM collaboration_request cr WHERE cr.sender_id = r.researcher_id)
ORDER  BY r.researcher_id
LIMIT  6;

\echo '--- Q6  Self-join: strongest existing co-authorship pairs'
SELECT r1.full_name AS author_1, r2.full_name AS author_2, COUNT(*) AS joint_papers
FROM   paper_author a1
JOIN   paper_author a2 ON a2.paper_id = a1.paper_id AND a1.researcher_id < a2.researcher_id
JOIN   researcher r1 ON r1.researcher_id = a1.researcher_id
JOIN   researcher r2 ON r2.researcher_id = a2.researcher_id
GROUP  BY r1.full_name, r2.full_name
HAVING COUNT(*) >= 2
ORDER  BY joint_papers DESC, author_1;

\echo '--- Q7  CTE + window function: rank researchers by h-index inside each institution'
WITH ranked AS (
    SELECT a.name AS institution, r.full_name, r.h_index,
           RANK() OVER (PARTITION BY a.affiliation_id ORDER BY r.h_index DESC) AS rank_in_institution
    FROM   researcher r JOIN affiliation a ON a.affiliation_id = r.affiliation_id
    WHERE  r.h_index IS NOT NULL
)
SELECT * FROM ranked WHERE rank_in_institution = 1 ORDER BY h_index DESC;

\echo '--- Q8  INTERSECT: researchers active in BOTH Cloud Computing and Machine Learning'
SELECT r.full_name FROM researcher r JOIN researcher_topic rt ON rt.researcher_id = r.researcher_id
JOIN topic t ON t.topic_id = rt.topic_id WHERE t.name = 'Cloud Computing'
INTERSECT
SELECT r.full_name FROM researcher r JOIN researcher_topic rt ON rt.researcher_id = r.researcher_id
JOIN topic t ON t.topic_id = rt.topic_id WHERE t.name = 'Machine Learning'
ORDER BY 1;

\echo '--- Q9  Materialised view: research-topic trend (papers per topic per year, top rows)'
SELECT topic, publication_year, papers, researchers
FROM   mv_topic_trends
ORDER  BY papers DESC, topic, publication_year DESC
LIMIT  6;

\echo '--- Q10 Full-text search: ranked keyword search with highlighted snippet'
SELECT paper_id, title, ROUND(rank::numeric, 3) AS rank, snippet
FROM   search_papers_text('reinforcement learning', 4);

\echo '--- Q11 Full-text search: boolean operators (websearch syntax)'
SELECT paper_id, title FROM search_papers_text('graph neural -protein OR "knowledge graph"', 5);

\echo '--- Q12 Fuzzy name search (pg_trgm): tolerates spelling mistakes'
SELECT full_name, ROUND(similarity(full_name, 'Karthick Subramaniam')::numeric, 3) AS name_similarity
FROM   researcher
WHERE  full_name % 'Karthick Subramaniam'
ORDER  BY name_similarity DESC;

\echo '--- Q13 Vector similarity: papers most similar to paper 9 (cosine distance operator <=>)'
SELECT p.paper_id, p.title, ROUND((1 - (pe.embedding <=> q.embedding))::numeric, 4) AS cosine_similarity
FROM   paper_embedding pe
JOIN   paper p ON p.paper_id = pe.paper_id
CROSS  JOIN (SELECT embedding FROM paper_embedding WHERE paper_id = 9) q
WHERE  pe.paper_id <> 9
ORDER  BY pe.embedding <=> q.embedding
LIMIT  5;

\echo '--- Q14 Collaborator recommendation for researcher 1 (vector search + relational enrichment)'
SELECT * FROM find_similar_researchers(1, 5);

\echo '--- Q15 Hybrid: cross-country matches with no shared paper and no existing request'
SELECT m.researcher_1, m.institution_1, m.researcher_2, m.institution_2, m.similarity_score
FROM   v_top_matches m
JOIN   researcher x ON x.researcher_id = m.researcher_1_id
JOIN   affiliation ax ON ax.affiliation_id = x.affiliation_id
JOIN   researcher y ON y.researcher_id = m.researcher_2_id
JOIN   affiliation ay ON ay.affiliation_id = y.affiliation_id
WHERE  ax.country <> ay.country
  AND  NOT EXISTS (SELECT 1 FROM collaboration_request cr
                   WHERE (cr.sender_id, cr.receiver_id) IN ((m.researcher_1_id, m.researcher_2_id),
                                                            (m.researcher_2_id, m.researcher_1_id)))
ORDER  BY m.similarity_score DESC
LIMIT  5;

\echo '--- Q16 Request pipeline summary (GROUP BY status) '
SELECT status, COUNT(*) AS requests FROM collaboration_request GROUP BY status ORDER BY requests DESC, status;

\echo '--- Q17 Inbox of researcher 7 (view)'
SELECT request_id, sender_name, proposed_topic, title, status
FROM   v_collaboration_requests WHERE receiver_id = 7 ORDER BY created_at DESC;

\echo '--- Q18 Profile view'
SELECT researcher_id, full_name, institution, paper_count, topics, has_embedding
FROM   v_researcher_profile WHERE researcher_id IN (1, 21) ORDER BY researcher_id;

\echo '--- Q19 Authentication: correct password, wrong password, unknown user'
SELECT 'correct password' AS attempt, COUNT(*) AS rows_returned FROM authenticate_researcher('ananya.rao@pes.example.edu', 'Welcome@123')
UNION ALL
SELECT 'wrong password',   COUNT(*) FROM authenticate_researcher('ananya.rao@pes.example.edu', 'guess')
UNION ALL
SELECT 'unknown user',     COUNT(*) FROM authenticate_researcher('nobody@nowhere.example', 'Welcome@123');
SELECT * FROM authenticate_researcher('Admin@pes.example.edu', 'Admin@123');

\echo '--- Q20 Query plan: HNSW index used for nearest-neighbour search'
SET enable_seqscan = off;   -- the demo table is tiny, so force the planner to show the index path
EXPLAIN (COSTS OFF)
SELECT paper_id FROM paper_embedding
ORDER BY embedding <=> (SELECT embedding FROM paper_embedding WHERE paper_id = 9) LIMIT 5;
RESET enable_seqscan;

\echo '--- Q21 Query plan: GIN index used for full-text search'
SET enable_seqscan = off;
EXPLAIN (COSTS OFF)
SELECT paper_id FROM paper WHERE search_vector @@ websearch_to_tsquery('english', 'cloud scheduling');
RESET enable_seqscan;
