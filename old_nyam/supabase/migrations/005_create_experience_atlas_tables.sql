-- 005_create_experience_atlas_tables.sql
-- Experience Atlas: region/genre/scene-based experience tracking with leveling

-- =============================================================================
-- experience_atlas_regions (geographic experience)
-- =============================================================================

CREATE TABLE IF NOT EXISTS experience_atlas_regions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  region VARCHAR(30) NOT NULL,

  -- Counts
  record_count INTEGER DEFAULT 0,
  unique_restaurants INTEGER DEFAULT 0,
  sub_region_count INTEGER DEFAULT 0,

  -- Leveling system
  level SMALLINT DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,

  -- Dimension scores (0-100)
  volume_score SMALLINT DEFAULT 0,
  diversity_score SMALLINT DEFAULT 0,
  recency_score SMALLINT DEFAULT 0,
  consistency_score SMALLINT DEFAULT 0,

  -- Timestamps
  first_record_at TIMESTAMPTZ,
  last_record_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, region)
);

COMMENT ON TABLE experience_atlas_regions IS 'Per-region experience tracking with leveling';

-- =============================================================================
-- experience_atlas_genres (category/cuisine experience)
-- =============================================================================

CREATE TABLE IF NOT EXISTS experience_atlas_genres (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,

  -- Counts
  record_count INTEGER DEFAULT 0,
  sub_category_count INTEGER DEFAULT 0,
  sub_categories TEXT[] DEFAULT '{}',

  -- Quality
  avg_rating DECIMAL(2,1),
  percentage DECIMAL(4,1),  -- % of total records

  -- Leveling system
  level SMALLINT DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,

  -- Dimension scores (0-100)
  volume_score SMALLINT DEFAULT 0,
  diversity_score SMALLINT DEFAULT 0,
  recency_score SMALLINT DEFAULT 0,
  consistency_score SMALLINT DEFAULT 0,

  -- Timestamps
  first_record_at TIMESTAMPTZ,
  last_record_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, category)
);

COMMENT ON TABLE experience_atlas_genres IS 'Per-category experience tracking with leveling';

-- =============================================================================
-- experience_atlas_scenes (occasion/context experience)
-- =============================================================================

CREATE TABLE IF NOT EXISTS experience_atlas_scenes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scene VARCHAR(30) NOT NULL,

  -- Counts
  record_count INTEGER DEFAULT 0,
  unique_restaurants INTEGER DEFAULT 0,
  category_diversity INTEGER DEFAULT 0,

  -- Leveling system
  level SMALLINT DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  xp INTEGER DEFAULT 0,
  xp_to_next INTEGER DEFAULT 100,

  -- Dimension scores (0-100)
  volume_score SMALLINT DEFAULT 0,
  diversity_score SMALLINT DEFAULT 0,
  recency_score SMALLINT DEFAULT 0,
  consistency_score SMALLINT DEFAULT 0,

  -- Timestamps
  first_record_at TIMESTAMPTZ,
  last_record_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, scene)
);

COMMENT ON TABLE experience_atlas_scenes IS 'Per-scene/occasion experience tracking with leveling';
