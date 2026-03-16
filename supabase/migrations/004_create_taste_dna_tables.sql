-- 004_create_taste_dna_tables.sql
-- Taste DNA profiles: restaurant, wine, homecook

-- =============================================================================
-- taste_dna (restaurant taste profile)
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_dna (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Flavor preferences (0.00 ~ 1.00, default 0.50 = neutral)
  flavor_spicy DECIMAL(3,2) DEFAULT 0.50,
  flavor_sweet DECIMAL(3,2) DEFAULT 0.50,
  flavor_salty DECIMAL(3,2) DEFAULT 0.50,
  flavor_sour DECIMAL(3,2) DEFAULT 0.50,
  flavor_umami DECIMAL(3,2) DEFAULT 0.50,
  flavor_rich DECIMAL(3,2) DEFAULT 0.50,

  -- Texture preferences (0.00 ~ 1.00)
  texture_crispy DECIMAL(3,2) DEFAULT 0.50,
  texture_tender DECIMAL(3,2) DEFAULT 0.50,
  texture_chewy DECIMAL(3,2) DEFAULT 0.50,

  -- Atmosphere preferences (bipolar: -1.00 ~ 1.00, 0.00 = neutral)
  atmosphere_noise DECIMAL(3,2) DEFAULT 0.00,
  atmosphere_formality DECIMAL(3,2) DEFAULT 0.00,
  atmosphere_space DECIMAL(3,2) DEFAULT 0.00,

  -- Price preferences
  price_sensitivity DECIMAL(3,2) DEFAULT 0.50,
  price_avg INTEGER,
  price_range_min INTEGER,
  price_range_max INTEGER,

  -- Category preferences as JSON (e.g. {"korean": 0.8, "japanese": 0.6})
  category_preferences JSONB DEFAULT '{}',

  -- Behavioral patterns
  peak_day SMALLINT,   -- 0=Sun, 6=Sat
  peak_hour SMALLINT,  -- 0~23
  adventurousness DECIMAL(3,2) DEFAULT 0.50,

  -- Taste type classification
  taste_type_code VARCHAR(4),
  taste_type_name VARCHAR(50),

  -- Stats
  sample_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE taste_dna IS 'Restaurant taste DNA profile, auto-calculated from records';
COMMENT ON COLUMN taste_dna.atmosphere_noise IS 'Bipolar: -1 quiet ~ +1 lively';
COMMENT ON COLUMN taste_dna.atmosphere_formality IS 'Bipolar: -1 casual ~ +1 formal';
COMMENT ON COLUMN taste_dna.atmosphere_space IS 'Bipolar: -1 cozy ~ +1 spacious';

-- =============================================================================
-- taste_dna_wine
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_dna_wine (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Wine body/structure preferences (0.00 ~ 1.00)
  pref_body DECIMAL(3,2) DEFAULT 0.50,
  pref_acidity DECIMAL(3,2) DEFAULT 0.50,
  pref_tannin DECIMAL(3,2) DEFAULT 0.50,
  pref_sweetness DECIMAL(3,2) DEFAULT 0.50,

  -- Aroma preferences (0.00 ~ 1.00)
  aroma_fruit DECIMAL(3,2) DEFAULT 0.00,
  aroma_floral DECIMAL(3,2) DEFAULT 0.00,
  aroma_spice DECIMAL(3,2) DEFAULT 0.00,
  aroma_oak DECIMAL(3,2) DEFAULT 0.00,
  aroma_mineral DECIMAL(3,2) DEFAULT 0.00,
  aroma_herbal DECIMAL(3,2) DEFAULT 0.00,

  -- Wine preferences
  preferred_varieties TEXT[] DEFAULT '{}',
  preferred_origins TEXT[] DEFAULT '{}',
  price_range_min INTEGER,
  price_range_max INTEGER,

  -- Stats
  sample_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE taste_dna_wine IS 'Wine taste DNA profile, auto-calculated from wine records';

-- =============================================================================
-- taste_dna_homecook
-- =============================================================================

CREATE TABLE IF NOT EXISTS taste_dna_homecook (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Cooking preferences (0.00 ~ 1.00)
  pref_difficulty DECIMAL(3,2) DEFAULT 0.50,
  pref_time_investment DECIMAL(3,2) DEFAULT 0.50,

  -- Method preferences as JSON (e.g. {"grill": 0.8, "stir_fry": 0.6})
  method_preferences JSONB DEFAULT '{}',
  preferred_cuisines TEXT[] DEFAULT '{}',

  -- Stats
  sample_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE taste_dna_homecook IS 'Homecook taste DNA profile, auto-calculated from homemade records';
