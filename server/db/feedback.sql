CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  felt_real INT CHECK (felt_real BETWEEN 1 AND 5),
  helpful_feedback INT CHECK (helpful_feedback BETWEEN 1 AND 5),
  score_fair INT CHECK (score_fair BETWEEN 1 AND 5),
  issues TEXT[] DEFAULT '{}',
  would_use_again TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

