-- 008: 알림
-- TECH_SPEC Section 3-5

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id        UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  type            VARCHAR NOT NULL CHECK (type IN ('reaction', 'share', 'group_invite', 'level_up', 'streak', 'comparison_complete')),
  target_type     VARCHAR NULL CHECK (target_type IN ('record', 'group', 'comparison')),
  target_id       UUID NULL,
  title           TEXT NULL,
  body            TEXT NULL,
  metadata        JSONB NULL,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 미읽은 알림 빠른 조회
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = false;
