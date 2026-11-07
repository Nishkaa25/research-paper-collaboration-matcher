import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createSessionCookie, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Call database stored function authenticate_researcher(email, password)
    const rows = await query<{
      researcher_id: number;
      full_name: string;
      role: 'researcher' | 'admin';
    }>(
      'SELECT researcher_id, full_name, role FROM authenticate_researcher($1, $2)',
      [email.trim(), password]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password, or account is deactivated' },
        { status: 401 }
      );
    }

    const authUser = rows[0];

    // Fetch institution and email
    const extraRows = await query<{ email: string; institution: string }>(
      `SELECT r.email, a.name AS institution
       FROM researcher r
       JOIN affiliation a ON a.affiliation_id = r.affiliation_id
       WHERE r.researcher_id = $1`,
      [authUser.researcher_id]
    );

    const sessionPayload = {
      researcher_id: authUser.researcher_id,
      full_name: authUser.full_name,
      email: extraRows[0]?.email || email,
      role: authUser.role,
      institution: extraRows[0]?.institution || 'Unknown Institution',
    };

    const cookieValue = createSessionCookie(sessionPayload);
    const response = NextResponse.json({
      success: true,
      user: sessionPayload,
    });

    response.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
