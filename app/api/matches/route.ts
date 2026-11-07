import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user = await getCurrentUser();

    const targetIdParam = searchParams.get('researcher_id');
    const targetId = targetIdParam ? parseInt(targetIdParam, 10) : user?.researcher_id || 1;
    const limit = parseInt(searchParams.get('limit') || '8', 10);

    // Call stored function find_similar_researchers
    const rawMatches = await query<{
      researcher_id: number;
      full_name: string;
      institution: string;
      similarity: string | number;
      shared_topics: number;
      already_coauthored: boolean;
    }>(
      'SELECT * FROM find_similar_researchers($1, $2)',
      [targetId, limit]
    );

    // Enrich with their primary topics and paper count
    const enrichedMatches = await Promise.all(
      rawMatches.map(async (m) => {
        const topics = await query<{ name: string; expertise_level: number }>(
          `SELECT t.name, rt.expertise_level
           FROM researcher_topic rt
           JOIN topic t ON t.topic_id = rt.topic_id
           WHERE rt.researcher_id = $1
           ORDER BY rt.expertise_level DESC, t.name LIMIT 3`,
          [m.researcher_id]
        );

        const countRes = await query<{ count: string }>(
          'SELECT COUNT(*) as count FROM paper_author WHERE researcher_id = $1',
          [m.researcher_id]
        );

        return {
          ...m,
          similarity: parseFloat(String(m.similarity)),
          topics,
          paper_count: parseInt(countRes[0]?.count || '0', 10),
        };
      })
    );

    // Also get information about the reference researcher
    const refUser = await query<{ full_name: string; institution: string }>(
      `SELECT r.full_name, a.name as institution
       FROM researcher r JOIN affiliation a ON a.affiliation_id = r.affiliation_id
       WHERE r.researcher_id = $1`,
      [targetId]
    );

    return NextResponse.json({
      target_researcher: {
        researcher_id: targetId,
        full_name: refUser[0]?.full_name || 'Selected Researcher',
        institution: refUser[0]?.institution || '',
      },
      matches: enrichedMatches,
    });
  } catch (err: any) {
    console.error('Error fetching matches:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
