import { Pool } from 'pg';

// Re-use connection pool across hot-reloads in development
const globalForPg = globalThis;

if (!globalForPg._pgPool) {
  globalForPg._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // SSL is required for most hosted Postgres providers (Neon, Supabase, Railway).
    // Set DATABASE_SSL_REJECT_UNAUTHORIZED=true if your provider uses a trusted CA cert.
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : false,
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
