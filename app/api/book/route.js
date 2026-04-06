import { storePendingBooking } from '@/lib/bookingStore';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// CORS headers — restrict to the configured origin, or allow all in development.
// Set ALLOWED_ORIGIN in your Vercel environment variables to your Shopify store domain.
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
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

  if (hours <= 0 || price <= 0) {
    console.warn('[/api/book] hours and price must be greater than zero');
    return NextResponse.json(
      { success: false, error: 'hours and price must be greater than zero' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.warn('[/api/book] Invalid email format:', email);
    return NextResponse.json(
      { success: false, error: 'Invalid email format' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const refId = randomUUID();
    storePendingBooking(refId, { name, email, postcode, hours, price });
    console.log('[/api/book] Stored pending booking, refId:', refId);

    const baseUrl = process.env.SHOPIFY_CHECKOUT_URL || 'https://YOUR-SHOPIFY-CHECKOUT';
    const checkoutUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}note=${refId}`;

    return NextResponse.json(
      { success: true, refId, checkoutUrl },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[/api/book] Error storing pending booking:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to store booking. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
