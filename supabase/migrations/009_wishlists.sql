-- 009_wishlists.sql
-- Nyam v2: wishlists 테이블
-- SSOT: DATA_MODEL.md §2 wishlists

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  source VARCHAR(10) NOT NULL DEFAULT 'direct',
  source_record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  is_visited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type),

  CONSTRAINT chk_wishlists_target_type CHECK (target_type IN ('restaurant', 'wine')),
  CONSTRAINT chk_wishlists_source CHECK (source IN ('direct', 'bubble', 'ai', 'web'))
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id, target_type, is_visited);
