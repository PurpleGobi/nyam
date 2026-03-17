-- 006: Taste DNA + Style DNA + User Stats
-- TECH_SPEC Section 3-3

-- 사용자 통계
CREATE TABLE user_stats (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id),
  total_records         INTEGER DEFAULT 0,
  total_photos          INTEGER DEFAULT 0,
  records_this_week     INTEGER DEFAULT 0,
  records_this_month    INTEGER DEFAULT 0,
  avg_weekly_frequency  NUMERIC DEFAULT 0,
  current_streak_days   INTEGER DEFAULT 0,
  longest_streak_days   INTEGER DEFAULT 0,
  avg_completeness      NUMERIC DEFAULT 0,
  nyam_level            INTEGER DEFAULT 1,
  points                INTEGER DEFAULT 0,
  groups_count          INTEGER DEFAULT 0,
  shared_records_count  INTEGER DEFAULT 0,
  reactions_received    INTEGER DEFAULT 0,
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Taste DNA: 식당 (6축)
CREATE TABLE taste_dna_restaurant (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id),
  flavor_spicy         NUMERIC DEFAULT 50,
  flavor_sweet         NUMERIC DEFAULT 50,
  flavor_salty         NUMERIC DEFAULT 50,
  flavor_sour          NUMERIC DEFAULT 50,
  flavor_umami         NUMERIC DEFAULT 50,
  flavor_rich          NUMERIC DEFAULT 50,
  taste_type_code      VARCHAR NULL,
  taste_type_name      VARCHAR NULL,
  sample_count         INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Taste DNA: 와인 (WSET 7축)
CREATE TABLE taste_dna_wine (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id),
  pref_acidity         NUMERIC DEFAULT 50,
  pref_body            NUMERIC DEFAULT 50,
  pref_tannin          NUMERIC DEFAULT 50,
  pref_sweetness       NUMERIC DEFAULT 50,
  pref_balance         NUMERIC DEFAULT 50,
  pref_finish          NUMERIC DEFAULT 50,
  pref_aroma           NUMERIC DEFAULT 50,
  dna_summary          TEXT NULL,
  sample_count         INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Taste DNA: 요리 (6축)
CREATE TABLE taste_dna_cooking (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id),
  flavor_spicy         NUMERIC DEFAULT 50,
  flavor_sweet         NUMERIC DEFAULT 50,
  flavor_salty         NUMERIC DEFAULT 50,
  flavor_sour          NUMERIC DEFAULT 50,
  flavor_umami         NUMERIC DEFAULT 50,
  flavor_rich          NUMERIC DEFAULT 50,
  sample_count         INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Style DNA: 식당 (genre + area + scene)
CREATE TABLE style_dna_restaurant_genres (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  genre              VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  sub_genre_count    INTEGER DEFAULT 0,
  sub_genres         TEXT[] DEFAULT '{}',
  avg_rating         NUMERIC NULL,
  percentage         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, genre)
);

CREATE TABLE style_dna_restaurant_areas (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  area               VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  unique_restaurants INTEGER DEFAULT 0,
  sub_area_count     INTEGER DEFAULT 0,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, area)
);

CREATE TABLE style_dna_restaurant_scenes (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  scene              VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  unique_restaurants INTEGER DEFAULT 0,
  genre_diversity    INTEGER DEFAULT 0,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, scene)
);

-- Style DNA: 와인 (variety + region + type + scene)
CREATE TABLE style_dna_wine_varieties (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  variety            VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, variety)
);

CREATE TABLE style_dna_wine_regions (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  region             VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, region)
);

CREATE TABLE style_dna_wine_types (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  type               VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, type)
);

CREATE TABLE style_dna_wine_scenes (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  scene              VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, scene)
);

-- Style DNA: 요리 (genre + scene)
CREATE TABLE style_dna_cooking_genres (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  genre              VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, genre)
);

CREATE TABLE style_dna_cooking_scenes (
  user_id            UUID NOT NULL REFERENCES auth.users(id),
  scene              VARCHAR NOT NULL,
  record_count       INTEGER DEFAULT 0,
  avg_rating         NUMERIC NULL,
  level              INTEGER DEFAULT 1,
  xp                 INTEGER DEFAULT 0,
  xp_to_next         INTEGER DEFAULT 0,
  volume_score       NUMERIC DEFAULT 0,
  diversity_score    NUMERIC DEFAULT 0,
  recency_score      NUMERIC DEFAULT 0,
  consistency_score  NUMERIC DEFAULT 0,
  first_record_at    TIMESTAMPTZ NULL,
  last_record_at     TIMESTAMPTZ NULL,
  PRIMARY KEY (user_id, scene)
);
