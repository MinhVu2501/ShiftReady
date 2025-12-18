# ShiftReady MVP

Full-stack AI mock interview app for MSN nursing students.

## Stack
- Backend: Node.js (ESM) + Express + PostgreSQL + Stripe + OpenAI
- Frontend: React + Vite + React Router

## Setup
1) Install deps
```
cd /Users/minhvu/Documents/ShiftReady/server && npm install
cd /Users/minhvu/Documents/ShiftReady/client && npm install
```
2) Create env file
```
cd /Users/minhvu/Documents/ShiftReady/server
cp env.example .env
```
Fill DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, STRIPE_* keys.

3) Init database (example)
```
psql "$DATABASE_URL" -f db/init.sql
```

4) Run backend
```
cd /Users/minhvu/Documents/ShiftReady/server
npm run dev
```

5) Run frontend
```
cd /Users/minhvu/Documents/ShiftReady/client
npm run dev
```

## Stripe webhook (raw body)
- Ensure Stripe CLI forwarding: `stripe listen --forward-to localhost:4000/api/billing/webhook`
- Webhook route uses `express.raw({ type: "application/json" })`; global JSON parsing is skipped for that path.

## MVP API routes
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/interviews/start
- POST /api/interviews/:id/answer
- GET /api/interviews
- GET /api/interviews/:id
- POST /api/billing/checkout
- POST /api/billing/webhook

## Notes
- Free trial: one quick session (marks trial_used). Paid entitlements unlocked via Stripe webhook.
- OpenAI model defaults to gpt-4o-mini; responses are forced to strict JSON schema.

