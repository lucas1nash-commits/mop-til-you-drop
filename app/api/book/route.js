import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// CORS headers — allow Shopify (or any) frontend to call this API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  console.log('[/api/book] Received POST request');

  let body;
  try {
    body = await request.json();
  } catch {
    console.error('[/api/book] Failed to parse request body');
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders }
    );
  }

  const { name, email, postcode, hours, price } = body;

  console.log('[/api/book] Parsed body:', { name, email, postcode, hours, price });

  // Basic validation — all fields are required
  const missingFields = [];
  if (!name) missingFields.push('name');
  if (!email) missingFields.push('email');
  if (!postcode) missingFields.push('postcode');
  if (hours === undefined || hours === null) missingFields.push('hours');
  if (price === undefined || price === null) missingFields.push('price');

  if (missingFields.length > 0) {
    console.warn('[/api/book] Missing required fields:', missingFields);
    return NextResponse.json(
      { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
      { status: 400, headers: corsHeaders }
    );
  }

  if (typeof hours !== 'number' || typeof price !== 'number') {
    console.warn('[/api/book] hours and price must be numbers');
    return NextResponse.json(
      { success: false, error: 'hours and price must be numbers' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    console.log('[/api/book] Inserting booking into database...');

    const result = await pool.query(
      `INSERT INTO bookings (name, email, postcode, hours, price, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id, name, email, postcode, hours, price, status, created_at`,
      [name, email, postcode, hours, price]
    );

    const booking = result.rows[0];
    console.log('[/api/book] Booking created successfully, id:', booking.id);

    return NextResponse.json(
      { success: true, booking },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[/api/book] Database error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to save booking. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
