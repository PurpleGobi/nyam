-- 008_notifications.sql
-- Nyam v2: 알림 + 넛지 테이블
-- SSOT: DATA_MODEL.md §4 notifications, §5 nudge

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_status VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_notif_type CHECK (notification_type IN (
    'level_up', 'bubble_join_request', 'bubble_join_approved',
    'follow_request', 'follow_accepted',
    'bubble_invite', 'bubble_new_record', 'bubble_member_joined',
    'reaction_like', 'comment_reply'
  )),
  CONSTRAINT chk_notif_action_status CHECK (action_status IS NULL OR action_status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- nudge_history
CREATE TABLE nudge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  nudge_type VARCHAR(30) NOT NULL,
  target_id UUID,
  status VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_nudge_type CHECK (nudge_type IN ('location', 'time', 'photo', 'unrated', 'new_area', 'weekly')),
  CONSTRAINT chk_nudge_status CHECK (status IN ('sent', 'opened', 'acted', 'dismissed', 'skipped'))
);

CREATE INDEX idx_nudge_history_user ON nudge_history(user_id, created_at DESC);

-- nudge_fatigue
CREATE TABLE nudge_fatigue (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  score INT NOT NULL DEFAULT 0,
  last_nudge_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ
);
