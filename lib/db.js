import { Pool } from 'pg';

// Re-use connection pool across hot-reloads in development
const globalForPg = globalThis;

if (!globalForPg._pgPool) {
  globalForPg._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  globalForPg._pgPool.on('error', (err) => {
    console.error('[db] Unexpected pool error:', err);
  });
}

const pool = globalForPg._pgPool;

export default pool;
