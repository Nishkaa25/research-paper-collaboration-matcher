import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Core summary stats
    const statsRes = await query(`
      SELECT
        (SELECT COUNT(*) FROM researcher) AS total_researchers,
        (SELECT COUNT(*) FROM researcher WHERE is_active = TRUE) AS active_researchers,
        (SELECT COUNT(*) FROM paper) AS total_papers,
        (SELECT COUNT(*) FROM affiliation) AS total_institutions,
        (SELECT COUNT(*) FROM topic) AS total_topics,
        (SELECT COUNT(*) FROM match_result) AS total_matches,
        (SELECT COUNT(*) FROM collaboration_request) AS total_requests
    `);

    // 2. Request status breakdown (Q16 in 06_queries.sql)
    const requestStatusBreakdown = await query(`
      SELECT status, COUNT(*) AS count
      FROM collaboration_request
      GROUP BY status
      ORDER BY count DESC
    `);

    // 3. Topic trends from materialized view mv_topic_trends (Q9 in 06_queries.sql)
    const topicTrends = await query(`
      SELECT topic, publication_year, papers, researchers
      FROM mv_topic_trends
      ORDER BY papers DESC, topic, publication_year DESC
      LIMIT 12
    `);

    // 4. Most active affiliations
    const topAffiliations = await query(`
      SELECT a.name AS institution, a.country,
             COUNT(DISTINCT r.researcher_id) AS researchers,
             COUNT(DISTINCT pa.paper_id) AS papers
      FROM affiliation a
      JOIN researcher r ON r.affiliation_id = a.affiliation_id
      LEFT JOIN paper_author pa ON pa.researcher_id = r.researcher_id
      GROUP BY a.affiliation_id, a.name, a.country
      ORDER BY papers DESC, researchers DESC
      LIMIT 6
    `);

    return NextResponse.json({
      summary: statsRes[0],
      request_breakdown: requestStatusBreakdown,
      topic_trends: topicTrends,
      top_affiliations: topAffiliations,
    });
  } catch (err: any) {
    console.error('Error fetching admin metrics:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
