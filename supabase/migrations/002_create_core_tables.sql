-- 002_create_core_tables.sql
-- Core enum types and tables: users, restaurants, records, record_photos, record_journals

-- =============================================================================
-- Enum Types
-- =============================================================================

CREATE TYPE record_type AS ENUM ('restaurant', 'wine', 'homemade');
CREATE TYPE visibility_type AS ENUM ('private', 'group', 'public');
CREATE TYPE auth_provider_type AS ENUM ('kakao', 'naver', 'google', 'apple');
CREATE TYPE data_source_type AS ENUM ('kakao', 'naver', 'google', 'user');

-- =============================================================================
-- users (profile extension of auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(30) NOT NULL,
  avatar_url TEXT,
  email VARCHAR(255) UNIQUE,
  auth_provider auth_provider_type NOT NULL DEFAULT 'kakao',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Public profile extending auth.users';

-- =============================================================================
-- restaurants
-- =============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  region VARCHAR(30),
  category VARCHAR(30),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB DEFAULT '{}',
  source data_source_type DEFAULT 'user',
  external_id VARCHAR(100),
  external_url TEXT,
  menu_items JSONB DEFAULT '[]',  -- [{name, price, category}]
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dedup: one entry per source + external_id pair
  UNIQUE(source, external_id)
);

COMMENT ON TABLE restaurants IS 'Restaurant master data from external APIs or user input';
COMMENT ON COLUMN restaurants.menu_items IS 'Array of {name, price, category} objects';

-- =============================================================================
-- records (core food/wine/homemade records)
-- =============================================================================

CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  record_type record_type NOT NULL DEFAULT 'restaurant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Basic info
  menu_name VARCHAR(100),
  category VARCHAR(30),
  sub_category VARCHAR(30),
  price_per_person INTEGER,

  -- Restaurant ratings (1-5)
  rating_taste SMALLINT CHECK (rating_taste BETWEEN 1 AND 5),
  rating_value SMALLINT CHECK (rating_value BETWEEN 1 AND 5),
  rating_service SMALLINT CHECK (rating_service BETWEEN 1 AND 5),
  rating_atmosphere SMALLINT CHECK (rating_atmosphere BETWEEN 1 AND 5),
  rating_cleanliness SMALLINT CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_portion SMALLINT CHECK (rating_portion BETWEEN 1 AND 5),

  -- Wine ratings (1-5)
  rating_aroma SMALLINT CHECK (rating_aroma BETWEEN 1 AND 5),
  rating_body SMALLINT CHECK (rating_body BETWEEN 1 AND 5),
  rating_acidity SMALLINT CHECK (rating_acidity BETWEEN 1 AND 5),
  rating_finish SMALLINT CHECK (rating_finish BETWEEN 1 AND 5),
  rating_balance SMALLINT CHECK (rating_balance BETWEEN 1 AND 5),

  -- Homemade ratings (1-5)
  rating_difficulty SMALLINT CHECK (rating_difficulty BETWEEN 1 AND 5),
  rating_time_spent SMALLINT CHECK (rating_time_spent BETWEEN 1 AND 5),
  rating_reproducibility SMALLINT CHECK (rating_reproducibility BETWEEN 1 AND 5),

  -- Auto-calculated overall rating
  rating_overall DECIMAL(2,1),

  -- Content
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  flavor_tags TEXT[] DEFAULT '{}',
  texture_tags TEXT[] DEFAULT '{}',
  atmosphere_tags TEXT[] DEFAULT '{}',

  -- Metadata
  visibility visibility_type NOT NULL DEFAULT 'private',
  ai_recognized BOOLEAN DEFAULT false,
  completeness_score SMALLINT DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION
);

COMMENT ON TABLE records IS 'Core food/wine/homemade experience records';

-- Indexes for common query patterns
CREATE INDEX idx_records_user_created ON records (user_id, created_at DESC);
CREATE INDEX idx_records_restaurant ON records (restaurant_id);
CREATE INDEX idx_records_type ON records (record_type);
CREATE INDEX idx_records_visibility ON records (visibility);

-- =============================================================================
-- record_photos
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  order_index SMALLINT DEFAULT 0,
  ai_labels TEXT[] DEFAULT '{}'
);

COMMENT ON TABLE record_photos IS 'Photos attached to records';

CREATE INDEX idx_record_photos_record ON record_photos (record_id);

-- =============================================================================
-- record_journals (1:1 extension for journal/diary data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL UNIQUE REFERENCES records(id) ON DELETE CASCADE,
  companions JSONB DEFAULT '[]',
  occasion VARCHAR(50),
  mood_tags TEXT[] DEFAULT '{}',
  memo TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE record_journals IS 'Optional journal/diary extension for records';
