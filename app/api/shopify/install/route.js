import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import pool from '@/lib/db';
import { ensureShopifySchema } from '@/lib/shopifyDb';

// Scopes required by this app — must match what is configured in the Partner Dashboard.
const SCOPES = 'write_draft_orders,read_orders';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop || !/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: 'Missing or invalid shop parameter' }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'SHOPIFY_CLIENT_ID is not configured' }, { status: 500 });
  }

  await ensureShopifySchema();

  // Generate a random nonce for CSRF protection.
  const state = randomBytes(16).toString('hex');
  await pool.query(
    `INSERT INTO shopify_oauth_states (state, shop, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (state) DO NOTHING`,
    [state, shop]
  );

  // Use APP_URL env var if set, otherwise derive from the incoming request origin.
  const appUrl = process.env.APP_URL || origin;
  const redirectUri = `${appUrl}/api/shopify/callback`;

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  console.log('[/api/shopify/install] Redirecting to Shopify OAuth for shop:', shop);
  return NextResponse.redirect(authUrl);
}
