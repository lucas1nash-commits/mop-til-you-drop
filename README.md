# Mop Til You Drop — Cleaning Service Booking API

A production-ready Next.js (App Router) project that provides a booking API for a cleaning service. Built for Vercel deployment.

---

## Project Structure

```
mop-til-you-drop/
├── app/
│   ├── api/
│   │   └── book/
│   │       └── route.js      # POST /api/book
│   ├── layout.js
│   └── page.js
├── lib/
│   └── db.js                 # PostgreSQL connection pool
├── .env.local.example        # Environment variable template
├── .gitignore
├── next.config.mjs
├── package.json
└── README.md
```

---

## API Endpoint

### `POST /api/book`

Creates a new cleaning service booking.

**Request body (JSON):**

| Field      | Type   | Required |
|------------|--------|----------|
| `name`     | string | ✅       |
| `email`    | string | ✅       |
| `postcode` | string | ✅       |
| `hours`    | number | ✅       |
| `price`    | number | ✅       |

**Success response (`201`):**
```json
{
  "success": true,
  "booking": {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@example.com",
    "postcode": "SW1A 1AA",
    "hours": 3,
    "price": 75.00,
    "status": "pending",
    "created_at": "2025-01-01T10:00:00.000Z"
  }
}
```

**Error response (`400` / `500`):**
```json
{
  "success": false,
  "error": "Missing required fields: email, hours"
}
```

---

## Database Setup

Create the `bookings` table in your PostgreSQL database:

```sql
CREATE TABLE bookings (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  postcode   VARCHAR(20)  NOT NULL,
  hours      NUMERIC      NOT NULL,
  price      NUMERIC      NOT NULL,
  status     VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## Running Locally

**1. Install dependencies:**
```bash
npm install
```

**2. Set up environment variables:**
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your DATABASE_URL
```

**3. Start the development server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/book`.

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/book \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","postcode":"SW1A 1AA","hours":3,"price":75}'
```

---

## Deploying to Vercel

**1. Push your code to GitHub** (this repo).

**2. Import the project in [Vercel](https://vercel.com/new):**
- Connect your GitHub repository
- Vercel will auto-detect Next.js — no configuration needed

**3. Add the environment variable:**
- In your Vercel project → **Settings → Environment Variables**
- Add: `DATABASE_URL` = your PostgreSQL connection string

**4. Deploy** — Vercel will build and deploy automatically.

> **Note:** Make sure your PostgreSQL database allows connections from Vercel's IP ranges (or use `0.0.0.0/0` for simplicity during development). Providers like [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) work out of the box.

---

## CORS

CORS headers are set to `Access-Control-Allow-Origin: *` so Shopify (or any) frontend can call the API directly from the browser. To restrict to a specific origin, update `corsHeaders` in `app/api/book/route.js`.

