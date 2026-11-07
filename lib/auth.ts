import { cookies } from 'next/headers';
import { query } from './db';

export interface UserSession {
  researcher_id: number;
  full_name: string;
  email: string;
  role: 'researcher' | 'admin';
  institution?: string;
}

const COOKIE_NAME = 'rpcm_session';

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8')) as UserSession;
    if (!parsed || !parsed.researcher_id) {
      return null;
    }

    // Verify user is still active in database
    const rows = await query<{ is_active: boolean; role: 'researcher' | 'admin' }>(
      'SELECT is_active, role FROM researcher WHERE researcher_id = $1',
      [parsed.researcher_id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return null;
    }

    parsed.role = rows[0].role;
    return parsed;
  } catch (err) {
    return null;
  }
}

export function createSessionCookie(user: UserSession): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export { COOKIE_NAME };
