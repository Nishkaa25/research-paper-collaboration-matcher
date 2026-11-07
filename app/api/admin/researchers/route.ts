import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { researcher_id, is_active } = await req.json();

    if (!researcher_id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'researcher_id and boolean is_active required' }, { status: 400 });
    }

    // Protect the admin from deactivating themselves
    if (researcher_id === user.researcher_id && !is_active) {
      return NextResponse.json({ error: 'Cannot deactivate your own admin account' }, { status: 400 });
    }

    const res = await query(
      `UPDATE researcher
       SET is_active = $1
       WHERE researcher_id = $2
       RETURNING researcher_id, full_name, email, role, is_active`,
      [is_active, researcher_id]
    );

    if (res.length === 0) {
      return NextResponse.json({ error: 'Researcher not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Researcher ${res[0].full_name} is now ${is_active ? 'Active' : 'Deactivated'}`,
      researcher: res[0],
    });
  } catch (err: any) {
    console.error('Error toggling researcher status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
