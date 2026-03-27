-- 010_filters_recs.sql
-- Nyam v2: 저장 필터 + AI 추천 테이블
-- SSOT: DATA_MODEL.md §5-1, §5-2

-- saved_filters
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(20) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  context_id UUID,
  rules JSONB NOT NULL,
  sort_by VARCHAR(20),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sf_target_type CHECK (target_type IN (
    'restaurant', 'wine', 'bubble', 'bubbler',
    'bubble_feed', 'bubble_ranking', 'bubble_member'
  )),
  CONSTRAINT chk_sf_sort_by CHECK (sort_by IS NULL OR sort_by IN (
    'latest', 'score_high', 'score_low', 'name', 'visit_count'
  ))
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id, target_type);
CREATE INDEX idx_saved_filters_context ON saved_filters(user_id, target_type, context_id) WHERE context_id IS NOT NULL;

-- ai_recommendations
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  reason TEXT NOT NULL,
  algorithm VARCHAR(30),
  confidence DECIMAL(3,2),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT chk_ai_rec_target_type CHECK (target_type IN ('restaurant', 'wine')),
  CONSTRAINT chk_ai_rec_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

CREATE INDEX idx_ai_rec_user ON ai_recommendations(user_id, target_type, is_dismissed);
CREATE INDEX idx_ai_rec_expires ON ai_recommendations(expires_at) WHERE NOT is_dismissed;
