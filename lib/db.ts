import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
  	const connectionString = process.env.DATABASE_URL;

  	if (!connectionString) {
  		throw new Error('DATABASE_URL is not set. Add it to .env.local');
    	}
    	const isNeon = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');

    pool = new Pool({
      connectionString,
      ssl: isNeon ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 500) {
      console.log(`Slow query (${duration}ms):`, text.slice(0, 80));
    }
    return res.rows;
  } catch (error: any) {
    console.error('Database query error:', error.message, '\nQuery:', text);
    throw error;
  }
}

export async function execute(text: string, params?: any[]): Promise<any> {
  const p = getPool();
  return p.query(text, params);
}
