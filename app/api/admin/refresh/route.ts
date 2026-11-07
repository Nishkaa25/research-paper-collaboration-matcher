import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'embeddings') {
      const res = await query('SELECT refresh_researcher_embeddings() AS count');
      return NextResponse.json({
        success: true,
        message: `Refreshed ${res[0]?.count || 0} researcher embedding profile vectors.`,
      });
    }

    if (action === 'matches') {
      const res = await query('SELECT generate_matches(5, 0.30) AS count');
      return NextResponse.json({
        success: true,
        message: `Generated ${res[0]?.count || 0} semantic collaborator matches.`,
      });
    }

    if (action === 'matview') {
      await query('REFRESH MATERIALIZED VIEW mv_topic_trends');
      return NextResponse.json({
        success: true,
        message: 'Materialized view mv_topic_trends refreshed successfully.',
      });
    }

    if (action === 'all') {
      const embRes = await query('SELECT refresh_researcher_embeddings() AS count');
      const matchRes = await query('SELECT generate_matches(5, 0.30) AS count');
      await query('REFRESH MATERIALIZED VIEW mv_topic_trends');
      return NextResponse.json({
        success: true,
        message: `System synchronized: ${embRes[0]?.count} profile vectors updated, ${matchRes[0]?.count} match pairs recomputed, mv_topic_trends refreshed.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Expected: embeddings, matches, matview, or all' }, { status: 400 });
  } catch (err: any) {
    console.error('Error executing admin refresh action:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
