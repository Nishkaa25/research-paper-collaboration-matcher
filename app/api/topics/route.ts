import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await query(
      `SELECT t.topic_id, t.name, t.description,
              COUNT(DISTINCT pt.paper_id) as paper_count,
              COUNT(DISTINCT rt.researcher_id) as researcher_count
       FROM topic t
       LEFT JOIN paper_topic pt ON pt.topic_id = t.topic_id
       LEFT JOIN researcher_topic rt ON rt.topic_id = t.topic_id
       GROUP BY t.topic_id, t.name, t.description
       ORDER BY paper_count DESC, t.name ASC`
    );

    return NextResponse.json({ topics });
  } catch (err: any) {
    console.error('Error fetching topics:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
