import pool from '@/lib/db';

// Tracks whether the Shopify schema has been initialized in this process.
let initialized = false;

/**
 * Ensure the tables required for the Shopify OAuth flow exist.
 * Called lazily before the first OAuth operation so no separate migration step is needed.
 */
export async function ensureShopifySchema() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopify_oauth_states (
      state      TEXT PRIMARY KEY,
      shop       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS shopify_oauth_states_created_at_idx
      ON shopify_oauth_states (created_at)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopify_tokens (
      shop         TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  initialized = true;
}
