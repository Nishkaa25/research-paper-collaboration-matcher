import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // 'inbox', 'outbox', 'all'

    // Inbox: requests where logged-in user is receiver
    const inbox = await query(
      `SELECT cr.request_id, cr.status, cr.title, cr.message, cr.created_at, cr.updated_at,
              cr.sender_id, cr.sender_name, cr.receiver_id, cr.receiver_name, cr.proposed_topic,
              a.name AS sender_institution
       FROM v_collaboration_requests cr
       JOIN researcher s ON s.researcher_id = cr.sender_id
       JOIN affiliation a ON a.affiliation_id = s.affiliation_id
       WHERE cr.receiver_id = $1
       ORDER BY cr.created_at DESC`,
      [user.researcher_id]
    );

    // Outbox: requests where logged-in user is sender
    const outbox = await query(
      `SELECT cr.request_id, cr.status, cr.title, cr.message, cr.created_at, cr.updated_at,
              cr.sender_id, cr.sender_name, cr.receiver_id, cr.receiver_name, cr.proposed_topic,
              a.name AS receiver_institution
       FROM v_collaboration_requests cr
       JOIN researcher r ON r.researcher_id = cr.receiver_id
       JOIN affiliation a ON a.affiliation_id = r.affiliation_id
       WHERE cr.sender_id = $1
       ORDER BY cr.created_at DESC`,
      [user.researcher_id]
    );

    if (type === 'inbox') {
      return NextResponse.json({ requests: inbox });
    }
    if (type === 'outbox') {
      return NextResponse.json({ requests: outbox });
    }

    return NextResponse.json({ inbox, outbox });
  } catch (err: any) {
    console.error('Error fetching requests:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const { receiver_id, proposed_topic_id, title, message } = await req.json();

    if (!receiver_id || !title) {
      return NextResponse.json({ error: 'Receiver and request title are required' }, { status: 400 });
    }

    if (receiver_id === user.researcher_id) {
      return NextResponse.json({ error: 'Cannot send collaboration request to yourself' }, { status: 400 });
    }

    // Call stored procedure send_collaboration_request
    await query(
      'CALL send_collaboration_request($1, $2, $3, $4, $5)',
      [user.researcher_id, receiver_id, proposed_topic_id || null, title.trim(), message ? message.trim() : '']
    );

    return NextResponse.json({
      success: true,
      message: 'Collaboration request sent successfully!',
    });
  } catch (err: any) {
    console.error('Error sending collaboration request:', err);
    return NextResponse.json({ error: err.message || 'Failed to send request' }, { status: 500 });
  }
}
