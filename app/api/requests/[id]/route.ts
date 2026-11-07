import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Respond to collaboration request (Accept / Reject) via atomic stored procedure
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const requestId = parseInt(params.id, 10);
    const { decision } = await req.json();

    if (!['Accepted', 'Rejected'].includes(decision)) {
      return NextResponse.json({ error: "Decision must be 'Accepted' or 'Rejected'" }, { status: 400 });
    }

    // Call stored procedure respond_to_request(request_id, receiver_id, decision)
    await query(
      'CALL respond_to_request($1, $2, $3)',
      [requestId, user.researcher_id, decision]
    );

    return NextResponse.json({
      success: true,
      message: `Collaboration request marked as ${decision}`,
    });
  } catch (err: any) {
    console.error('Error responding to request:', err);
    return NextResponse.json({ error: err.message || 'Failed to update request' }, { status: 500 });
  }
}

// Withdraw pending request via stored procedure
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const requestId = parseInt(params.id, 10);

    // Call stored procedure withdraw_request(request_id, sender_id)
    await query(
      'CALL withdraw_request($1, $2)',
      [requestId, user.researcher_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Collaboration request withdrawn successfully',
    });
  } catch (err: any) {
    console.error('Error withdrawing request:', err);
    return NextResponse.json({ error: err.message || 'Failed to withdraw request' }, { status: 500 });
  }
}
