CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  realistic SMALLINT CHECK (realistic BETWEEN 1 AND 5),
  helpful SMALLINT CHECK (helpful BETWEEN 1 AND 5),
  scoring_fair SMALLINT CHECK (scoring_fair BETWEEN 1 AND 5),
  issues TEXT,
  would_use_again TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

