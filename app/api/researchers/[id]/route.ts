import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const researcherId = parseInt(params.id, 10);
    if (isNaN(researcherId)) {
      return NextResponse.json({ error: 'Invalid researcher ID' }, { status: 400 });
    }

    const researcherRows = await query(
      `SELECT r.researcher_id, r.full_name, r.email, r.bio, r.department, r.join_date,
              r.role, r.orcid, r.h_index, r.is_active,
              a.affiliation_id, a.name AS institution, a.type AS institution_type,
              a.city, a.country, a.website AS institution_website,
              (re.researcher_id IS NOT NULL) AS has_embedding
       FROM researcher r
       JOIN affiliation a ON a.affiliation_id = r.affiliation_id
       LEFT JOIN researcher_embedding re ON re.researcher_id = r.researcher_id
       WHERE r.researcher_id = $1`,
      [researcherId]
    );

    if (researcherRows.length === 0) {
      return NextResponse.json({ error: 'Researcher not found' }, { status: 404 });
    }

    // Topics with expertise level
    const topics = await query(
      `SELECT t.topic_id, t.name, t.description, rt.expertise_level
       FROM researcher_topic rt
       JOIN topic t ON t.topic_id = rt.topic_id
       WHERE rt.researcher_id = $1
       ORDER BY rt.expertise_level DESC, t.name`,
      [researcherId]
    );

    // Papers authored
    const papers = await query(
      `SELECT p.paper_id, p.title, p.abstract, p.publication_year, p.doi,
              jc.name AS venue, jc.type AS venue_type,
              pa.author_position, pa.corresponding_author,
              (SELECT string_agg(t.name, ', ' ORDER BY t.name)
               FROM paper_topic pt JOIN topic t ON t.topic_id = pt.topic_id
               WHERE pt.paper_id = p.paper_id) AS topics
       FROM paper_author pa
       JOIN paper p ON p.paper_id = pa.paper_id
       LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id
       WHERE pa.researcher_id = $1
       ORDER BY p.publication_year DESC, pa.author_position ASC`,
      [researcherId]
    );

    return NextResponse.json({
      researcher: researcherRows[0],
      topics,
      papers,
    });
  } catch (err: any) {
    console.error('Error fetching researcher profile:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetId = parseInt(params.id, 10);
    // Only user themselves or an admin can update profile
    if (user.role !== 'admin' && user.researcher_id !== targetId) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own profile' }, { status: 403 });
    }

    const { bio, department, h_index, orcid } = await req.json();

    const updated = await query(
      `UPDATE researcher
       SET bio = COALESCE($1, bio),
           department = COALESCE($2, department),
           h_index = COALESCE($3, h_index),
           orcid = COALESCE($4, orcid)
       WHERE researcher_id = $5
       RETURNING researcher_id, full_name, email, bio, department, h_index, orcid`,
      [bio, department, h_index, orcid, targetId]
    );

    return NextResponse.json({ success: true, researcher: updated[0] });
  } catch (err: any) {
    console.error('Error updating researcher:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
