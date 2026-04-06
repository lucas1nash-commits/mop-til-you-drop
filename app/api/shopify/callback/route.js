import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import pool from '@/lib/db';
import { ensureShopifySchema } from '@/lib/shopifyDb';

// How long (in minutes) an OAuth state nonce remains valid.
const OAUTH_STATE_TIMEOUT_MINUTES = 10;

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);

  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const hmac = searchParams.get('hmac');

  if (!shop || !code || !state || !hmac) {
    return NextResponse.json({ error: 'Missing required OAuth parameters' }, { status: 400 });
  }

  // Validate the shop domain strictly before it is used in any network request.
  if (!/^[a-zA-Z0-9-]+\.myshopify\.com$/.test(shop)) {
    console.warn('[/api/shopify/callback] Invalid shop domain:', shop);
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Shopify credentials are not configured' }, { status: 500 });
  }

  // Verify the HMAC signature from Shopify to confirm the callback is genuine.
  // Build the message from all query params except 'hmac' itself.
  const params = {};
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'hmac') params[key] = value;
  }
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const digest = createHmac('sha256', clientSecret).update(message).digest('hex');
  const digestBuf = Buffer.from(digest, 'hex');
  const hmacBuf = Buffer.from(hmac, 'hex');

  if (digestBuf.length !== hmacBuf.length || !timingSafeEqual(digestBuf, hmacBuf)) {
    console.warn('[/api/shopify/callback] HMAC verification failed');
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  // Verify and consume the state nonce to prevent CSRF attacks.
  // Match only on the state value so the shop cannot be tampered with in the callback URL;
  // the authoritative shop is read from the stored row.
  await ensureShopifySchema();

  const stateResult = await pool.query(
    `DELETE FROM shopify_oauth_states
     WHERE state = $1
       AND created_at > NOW() - ($2 || ' minutes')::INTERVAL
     RETURNING shop`,
    [state, OAUTH_STATE_TIMEOUT_MINUTES]
  );

  if (stateResult.rowCount === 0) {
    console.warn('[/api/shopify/callback] Invalid or expired OAuth state');
    return NextResponse.json({ error: 'Invalid or expired OAuth state' }, { status: 401 });
  }

  // Use the shop from the stored nonce record — not the query parameter — to prevent tampering.
  const trustedShop = stateResult.rows[0].shop;
  if (trustedShop !== shop) {
    console.warn('[/api/shopify/callback] Shop mismatch: expected', trustedShop, 'got', shop);
    return NextResponse.json({ error: 'Shop domain mismatch' }, { status: 401 });
  }

  // Exchange the authorization code for a permanent offline access token.
  // The shop domain is validated above so the URL is safe to construct.
  let accessToken;
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[/api/shopify/callback] Token exchange failed:', tokenRes.status, errText);
      return NextResponse.json(
        { error: `Token exchange failed (${tokenRes.status})` },
        { status: 502 }
      );
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[/api/shopify/callback] Token exchange error:', err);
    return NextResponse.json({ error: 'Token exchange request failed' }, { status: 502 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token returned by Shopify' }, { status: 502 });
  }

  // Persist the access token so /api/book can use it without a manually set env var.
  await pool.query(
    `INSERT INTO shopify_tokens (shop, access_token, installed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (shop) DO UPDATE SET access_token = $2, installed_at = NOW()`,
    [shop, accessToken]
  );

  console.log('[/api/shopify/callback] Access token stored for shop:', shop);

  // Redirect back to the app home with a success indicator.
  const appUrl = process.env.APP_URL || origin;
  return NextResponse.redirect(`${appUrl}/?shopify_installed=1`);
}
