-- 006_create_stats_tables.sql
-- Aggregated stats: user, group, restaurant

-- =============================================================================
-- user_stats
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Record counts
  total_records INTEGER DEFAULT 0,
  total_photos INTEGER DEFAULT 0,
  records_this_week INTEGER DEFAULT 0,
  records_this_month INTEGER DEFAULT 0,

  -- Frequency
  avg_weekly_frequency DECIMAL(3,1) DEFAULT 0.0,

  -- Streaks
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,

  -- Quality
  avg_completeness SMALLINT DEFAULT 0,

  -- Leveling
  nyam_level SMALLINT DEFAULT 1,
  points INTEGER DEFAULT 0,

  -- Social
  groups_count INTEGER DEFAULT 0,
  shared_records_count INTEGER DEFAULT 0,
  reactions_received INTEGER DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_stats IS 'Aggregated user statistics, system-managed';

-- =============================================================================
-- group_stats
-- =============================================================================

CREATE TABLE IF NOT EXISTS group_stats (
  group_id UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,

  -- Counts
  member_count INTEGER DEFAULT 0,
  record_count INTEGER DEFAULT 0,
  records_this_week INTEGER DEFAULT 0,

  -- Scores (0-100)
  activity_score SMALLINT DEFAULT 0,
  quality_score SMALLINT DEFAULT 0,
  diversity_score SMALLINT DEFAULT 0,
  external_citation INTEGER DEFAULT 0,

  -- Growth
  growth_rate DECIMAL(4,1) DEFAULT 0.0,
  overall_score SMALLINT DEFAULT 0,

  -- Top items
  top_restaurants JSONB DEFAULT '[]',
  top_categories JSONB DEFAULT '[]',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE group_stats IS 'Aggregated group statistics, system-managed';

-- =============================================================================
-- restaurant_stats
-- =============================================================================

CREATE TABLE IF NOT EXISTS restaurant_stats (
  restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Counts
  record_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,

  -- Average ratings
  avg_taste DECIMAL(2,1),
  avg_value DECIMAL(2,1),
  avg_service DECIMAL(2,1),
  avg_atmosphere DECIMAL(2,1),
  avg_overall DECIMAL(2,1),

  -- Timestamps
  latest_record_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE restaurant_stats IS 'Aggregated restaurant statistics, system-managed';
