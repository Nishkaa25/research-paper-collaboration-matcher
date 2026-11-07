import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const topic = searchParams.get('topic') || '';

    let sql = `
      SELECT r.researcher_id, r.full_name, r.email, r.department, r.role, r.h_index,
             a.name AS institution, a.country,
             COALESCE(pc.paper_count, 0) AS paper_count,
             COALESCE(tp.topics, '-') AS topics,
             (re.researcher_id IS NOT NULL) AS has_embedding,
             r.is_active
      FROM researcher r
      JOIN affiliation a ON a.affiliation_id = r.affiliation_id
      LEFT JOIN (
        SELECT researcher_id, COUNT(*) AS paper_count
        FROM paper_author GROUP BY researcher_id
      ) pc ON pc.researcher_id = r.researcher_id
      LEFT JOIN (
        SELECT rt.researcher_id,
               string_agg(t.name || ' (' || rt.expertise_level || ')', ', ' ORDER BY rt.expertise_level DESC, t.name) AS topics
        FROM researcher_topic rt
        JOIN topic t ON t.topic_id = rt.topic_id
        GROUP BY rt.researcher_id
      ) tp ON tp.researcher_id = r.researcher_id
      LEFT JOIN researcher_embedding re ON re.researcher_id = r.researcher_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (r.full_name ILIKE $${params.length} OR a.name ILIKE $${params.length} OR r.department ILIKE $${params.length})`;
    }

    if (topic.trim()) {
      params.push(topic.trim());
      sql += ` AND EXISTS (
        SELECT 1 FROM researcher_topic rt
        JOIN topic t ON t.topic_id = rt.topic_id
        WHERE rt.researcher_id = r.researcher_id AND t.name = $${params.length}
      )`;
    }

    sql += ` ORDER BY r.is_active DESC, paper_count DESC, r.full_name ASC LIMIT 50`;

    const rows = await query(sql, params);
    return NextResponse.json({ researchers: rows });
  } catch (err: any) {
    console.error('Error fetching researchers:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
