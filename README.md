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
# If adding feedback table separately:
psql "$DATABASE_URL" -f db/feedback.sql
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
- POST /api/feedback
- GET /api/admin/feedback (admin)
- GET /api/admin/feedback.csv (admin)

## Feedback endpoints (examples)
```
# submit feedback (requires auth token)
curl -X POST "$API_BASE/api/feedback" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<uuid>","feltReal":4,"helpfulFeedback":4,"scoreFair":4,"issues":["too_generic"],"wouldUseAgain":"yes","note":""}'

# admin list (requires admin token)
curl -H "Authorization: Bearer $ADMIN_TOKEN" "$API_BASE/api/admin/feedback"
```

## Notes
- Free trial: one quick session (marks trial_used). Paid entitlements unlocked via Stripe webhook.
- OpenAI model defaults to gpt-4o-mini; responses are forced to strict JSON schema.

