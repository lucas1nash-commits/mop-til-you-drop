import pool from '@/lib/db';
import { getPendingBooking, deletePendingBooking } from '@/lib/bookingStore';
import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('[/api/shopify-webhook] Received POST request');

  let body;
  try {
    body = await request.json();
  } catch {
    console.error('[/api/shopify-webhook] Failed to parse request body');
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Extract booking reference ID from the order note
  const refId = body?.note?.trim();

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
