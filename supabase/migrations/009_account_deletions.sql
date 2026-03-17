-- 009: 계정 삭제
-- TECH_SPEC Section 3-6

CREATE TABLE account_deletions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  reason          TEXT NULL,
  reason_category VARCHAR NULL,
  requested_at    TIMESTAMPTZ DEFAULT now(),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  cancelled_at    TIMESTAMPTZ NULL,
  completed_at    TIMESTAMPTZ NULL,
  status          VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed'))
);
