import pool from '@/lib/db';
import { getPendingBooking, deletePendingBooking } from '@/lib/bookingStore';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export async function POST(request) {
  console.log('[/api/shopify-webhook] Received POST request');

  // Read the raw body for HMAC verification before parsing JSON.
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    console.error('[/api/shopify-webhook] Failed to read request body');
    return NextResponse.json({ success: false, error: 'Failed to read body' }, { status: 400 });
  }

  // Verify Shopify HMAC signature to confirm the request is genuine.
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[/api/shopify-webhook] SHOPIFY_WEBHOOK_SECRET is not set');
    return NextResponse.json({ success: false, error: 'Webhook secret not configured' }, { status: 500 });
  }

  const shopifyHmac = request.headers.get('x-shopify-hmac-sha256');
  if (!shopifyHmac) {
    console.warn('[/api/shopify-webhook] Missing x-shopify-hmac-sha256 header');
    return NextResponse.json({ success: false, error: 'Missing HMAC header' }, { status: 401 });
  }

  const digest = createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('base64');
  const digestBuf = Buffer.from(digest);
  const hmacBuf = Buffer.from(shopifyHmac);

  if (digestBuf.length !== hmacBuf.length || !timingSafeEqual(digestBuf, hmacBuf)) {
    console.warn('[/api/shopify-webhook] HMAC verification failed');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error('[/api/shopify-webhook] Failed to parse request body as JSON');
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Extract booking reference ID from the order note.
  // When a draft order invoice is paid, Shopify fires orders/paid and the note
  // is copied from the draft order. Also check note_attributes as a fallback
  // in case the note field is manually edited in the Shopify admin.
  const refIdFromNote = body?.note?.trim();
  const refIdFromAttributes = body?.note_attributes?.find?.(
    (attr) => attr.name === 'booking_ref'
  )?.value?.trim();
  const refId = refIdFromNote || refIdFromAttributes;

  if (!refId) {
    console.warn('[/api/shopify-webhook] No booking reference found in order note');
    return NextResponse.json({ success: false, error: 'No booking reference in order' }, { status: 400 });
  }

  const booking = getPendingBooking(refId);

  if (!booking) {
    console.warn('[/api/shopify-webhook] No pending booking found for refId:', refId);
    return NextResponse.json({ success: false, error: 'Booking reference not found' }, { status: 404 });
  }

  const { name, email, postcode, hours, price } = booking;

  try {
    console.log('[/api/shopify-webhook] Inserting booking into database, refId:', refId);

    const result = await pool.query(
      `INSERT INTO bookings (name, email, postcode, hours, price, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'confirmed', NOW())
       RETURNING id`,
      [name, email, postcode, hours, price]
    );

    deletePendingBooking(refId);
    console.log('[/api/shopify-webhook] Booking confirmed, id:', result.rows[0].id);

    return NextResponse.json({ success: true, bookingId: result.rows[0].id }, { status: 200 });
  } catch (err) {
    console.error('[/api/shopify-webhook] Database error:', err);
    return NextResponse.json({ success: false, error: 'Failed to save booking' }, { status: 500 });
  }
}
