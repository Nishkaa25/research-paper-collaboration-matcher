import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PREDEFINED_QUERIES: Record<string, { title: string; category: string; description: string; sql: string }> = {
  Q1: {
    title: 'Top Published Researchers with Institution',
    category: 'JOIN & Aggregation',
    description: 'Multi-table INNER JOIN with GROUP BY and aggregate COUNT()',
    sql: `SELECT r.full_name, a.name AS institution, COUNT(pa.paper_id) AS papers
FROM researcher r
JOIN affiliation a ON a.affiliation_id = r.affiliation_id
JOIN paper_author pa ON pa.researcher_id = r.researcher_id
GROUP BY r.researcher_id, r.full_name, a.name
ORDER BY papers DESC, r.full_name
LIMIT 5;`,
  },
  Q2: {
    title: 'Venues with at least 4 papers',
    category: 'GROUP BY & HAVING',
    description: 'Filter grouped rows using HAVING COUNT(*) >= 4 and average publication year',
    sql: `SELECT jc.name AS venue, jc.type, COUNT(*) AS papers, ROUND(AVG(p.publication_year), 1) AS avg_year
FROM paper p JOIN journal_conference jc ON jc.venue_id = p.venue_id
GROUP BY jc.venue_id, jc.name, jc.type
HAVING COUNT(*) >= 4
ORDER BY papers DESC, venue;`,
  },
  Q3: {
    title: 'Institutions Ranked by Distinct Papers',
    category: 'Multi-Join & COUNT DISTINCT',
    description: 'Counts distinct researchers and distinct papers per institution',
    sql: `SELECT a.name AS institution, a.country,
       COUNT(DISTINCT r.researcher_id) AS researchers,
       COUNT(DISTINCT pa.paper_id)     AS papers
FROM affiliation a
JOIN researcher r    ON r.affiliation_id = a.affiliation_id
JOIN paper_author pa ON pa.researcher_id = r.researcher_id
GROUP BY a.affiliation_id, a.name, a.country
HAVING COUNT(DISTINCT pa.paper_id) >= 4
ORDER BY papers DESC;`,
  },
  Q4: {
    title: 'Researchers with More Papers than Average',
    category: 'Subqueries',
    description: 'Nested aggregate subquery in WHERE clause comparing against global average',
    sql: `SELECT r.full_name, x.papers
FROM researcher r
JOIN (SELECT researcher_id, COUNT(*) AS papers FROM paper_author GROUP BY researcher_id) x
       ON x.researcher_id = r.researcher_id
WHERE x.papers > (SELECT AVG(c) FROM (SELECT COUNT(*) AS c FROM paper_author GROUP BY researcher_id) t)
ORDER BY x.papers DESC, r.full_name;`,
  },
  Q5: {
    title: 'Researchers with No Requests Sent',
    category: 'NOT EXISTS Subquery',
    description: 'Correlated subquery with NOT EXISTS finding inactive collaboration senders',
    sql: `SELECT r.researcher_id, r.full_name
FROM researcher r
WHERE r.role = 'researcher'
  AND NOT EXISTS (SELECT 1 FROM collaboration_request cr WHERE cr.sender_id = r.researcher_id)
ORDER BY r.researcher_id
LIMIT 6;`,
  },
  Q6: {
    title: 'Co-Authorship Network (Self-Join)',
    category: 'Self-Join',
    description: 'Self-join on paper_author to discover existing collaboration partnerships',
    sql: `SELECT r1.full_name AS author_1, r2.full_name AS author_2, COUNT(*) AS joint_papers
FROM paper_author a1
JOIN paper_author a2 ON a2.paper_id = a1.paper_id AND a1.researcher_id < a2.researcher_id
JOIN researcher r1 ON r1.researcher_id = a1.researcher_id
JOIN researcher r2 ON r2.researcher_id = a2.researcher_id
GROUP BY r1.full_name, r2.full_name
HAVING COUNT(*) >= 2
ORDER BY joint_papers DESC, author_1;`,
  },
  Q7: {
    title: 'Rank Researchers by H-Index per Institution',
    category: 'CTE & Window Functions',
    description: 'Common Table Expression (WITH) and RANK() OVER (PARTITION BY ...)',
    sql: `WITH ranked AS (
    SELECT a.name AS institution, r.full_name, r.h_index,
           RANK() OVER (PARTITION BY a.affiliation_id ORDER BY r.h_index DESC) AS rank_in_institution
    FROM researcher r JOIN affiliation a ON a.affiliation_id = r.affiliation_id
    WHERE r.h_index IS NOT NULL
)
SELECT * FROM ranked WHERE rank_in_institution = 1 ORDER BY h_index DESC;`,
  },
  Q8: {
    title: 'Cloud Computing ∩ Machine Learning',
    category: 'Set Operations (INTERSECT)',
    description: 'Set intersection of researchers active in both research domains',
    sql: `SELECT r.full_name FROM researcher r JOIN researcher_topic rt ON rt.researcher_id = r.researcher_id
JOIN topic t ON t.topic_id = rt.topic_id WHERE t.name = 'Cloud Computing'
INTERSECT
SELECT r.full_name FROM researcher r JOIN researcher_topic rt ON rt.researcher_id = r.researcher_id
JOIN topic t ON t.topic_id = rt.topic_id WHERE t.name = 'Machine Learning'
ORDER BY 1;`,
  },
  Q9: {
    title: 'Materialized View Research Trends',
    category: 'Materialized View',
    description: 'Reads pre-aggregated data from mv_topic_trends',
    sql: `SELECT topic, publication_year, papers, researchers
FROM mv_topic_trends
ORDER BY papers DESC, topic, publication_year DESC
LIMIT 8;`,
  },
  Q10: {
    title: 'Full-Text Search with Highlighting Snippet',
    category: 'Full-Text Search (GIN)',
    description: 'Calls search_papers_text with ts_rank and ts_headline snippet highlighting',
    sql: `SELECT paper_id, title, ROUND(rank::numeric, 3) AS rank, snippet
FROM search_papers_text('reinforcement learning', 4);`,
  },
  Q13: {
    title: 'pgvector Cosine Distance Query',
    category: 'Vector Similarity Search',
    description: 'pgvector <=> operator computing 1 - cosine distance with HNSW index',
    sql: `SELECT p.paper_id, p.title, ROUND((1 - (pe.embedding <=> q.embedding))::numeric, 4) AS cosine_similarity
FROM paper_embedding pe
JOIN paper p ON p.paper_id = pe.paper_id
CROSS JOIN (SELECT embedding FROM paper_embedding WHERE paper_id = 9) q
WHERE pe.paper_id <> 9
ORDER BY pe.embedding <=> q.embedding
LIMIT 5;`,
  },
  Q14: {
    title: 'Stored Function: find_similar_researchers',
    category: 'Stored Functions',
    description: 'Executes find_similar_researchers() with vector similarity and relational enrichment',
    sql: `SELECT * FROM find_similar_researchers(1, 5);`,
  },
  Q16: {
    title: 'Collaboration Request Pipeline Summary',
    category: 'GROUP BY Status',
    description: 'Monitors the status transitions of collaboration requests',
    sql: `SELECT status, COUNT(*) AS requests FROM collaboration_request GROUP BY status ORDER BY requests DESC, status;`,
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qKey = searchParams.get('key');

    if (qKey && PREDEFINED_QUERIES[qKey]) {
      const qDef = PREDEFINED_QUERIES[qKey];
      const start = Date.now();
      const results = await query(qDef.sql);
      const executionTimeMs = Date.now() - start;

      return NextResponse.json({
        key: qKey,
        ...qDef,
        executionTimeMs,
        count: results.length,
        results,
      });
    }

    // Return query directory list
    const catalog = Object.entries(PREDEFINED_QUERIES).map(([key, def]) => ({
      key,
      title: def.title,
      category: def.category,
      description: def.description,
      sql: def.sql,
    }));

    return NextResponse.json({ queries: catalog });
  } catch (err: any) {
    console.error('Error running benchmark query:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
