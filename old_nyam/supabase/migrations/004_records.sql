-- 004: 기록 핵심 테이블
-- TECH_SPEC Section 3-2 (records, record_photos, record_journals, record_ai_analyses, record_taste_profiles, phase_completions)

CREATE TABLE records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  restaurant_id     UUID NULL REFERENCES restaurants(id),
  record_type       record_type NOT NULL,
  menu_name         TEXT NULL,
  genre             VARCHAR NULL,  -- restaurant: FOOD_CATEGORIES / cooking: COOKING_GENRES / wine: null
  sub_genre         VARCHAR NULL,
  -- 평가 (0-100)
  rating_overall    NUMERIC NULL,
  rating_taste      SMALLINT NULL,
  rating_value      SMALLINT NULL,
  rating_service    SMALLINT NULL,
  rating_atmosphere SMALLINT NULL,
  rating_cleanliness SMALLINT NULL,
  rating_portion    SMALLINT NULL,
  -- 요리 전용
  rating_balance        SMALLINT NULL,
  rating_difficulty     SMALLINT NULL,
  rating_time_spent     SMALLINT NULL,
  rating_reproducibility SMALLINT NULL,
  rating_plating        SMALLINT NULL,
  rating_material_cost  SMALLINT NULL,
  -- 공통
  comment           TEXT NULL,
  tags              TEXT[] DEFAULT '{}',
  flavor_tags       TEXT[] DEFAULT '{}',
  texture_tags      TEXT[] DEFAULT '{}',
  atmosphere_tags   TEXT[] DEFAULT '{}',
  visibility        visibility DEFAULT 'private',
  ai_recognized     BOOLEAN DEFAULT false,
  completeness_score NUMERIC DEFAULT 0,
  location_lat      DOUBLE PRECISION NULL,
  location_lng      DOUBLE PRECISION NULL,
  price_per_person  INTEGER NULL,
  -- Phase 관리
  phase_status      SMALLINT DEFAULT 1,
  phase1_completed_at TIMESTAMPTZ NULL,
  phase2_completed_at TIMESTAMPTZ NULL,
  phase3_completed_at TIMESTAMPTZ NULL,
  -- Phase 3 비교 보정
  scaled_rating     NUMERIC NULL,
  comparison_count  INTEGER DEFAULT 0,
  -- 상황
  scene             VARCHAR NULL,
  -- 와인 전용
  pairing_food      TEXT NULL,
  purchase_price    INTEGER NULL,
  -- 방문 정보
  visit_time        VARCHAR NULL,
  companion_count   SMALLINT NULL,
  total_cost        INTEGER NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_created_at ON records(created_at DESC);
CREATE INDEX idx_records_restaurant_id ON records(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_records_genre ON records(genre) WHERE genre IS NOT NULL;

-- 기록 사진
CREATE TABLE record_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id     UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  order_index   SMALLINT DEFAULT 0,
  ai_labels     TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_record_photos_record_id ON record_photos(record_id);

-- Phase 2 블로그
CREATE TABLE record_journals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         UUID NOT NULL UNIQUE REFERENCES records(id) ON DELETE CASCADE,
  blog_title        TEXT NULL,
  blog_content      TEXT NULL,
  blog_sections     JSONB NULL,
  ai_questions      JSONB NULL,
  user_answers      JSONB NULL,
  published         BOOLEAN DEFAULT false,
  published_at      TIMESTAMPTZ NULL
);

-- AI 분석 결과 (1:N, 최신 1건 활용)
CREATE TABLE record_ai_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  raw_response      JSONB NULL,
  -- 식당용
  identified_restaurant JSONB NULL,
  extracted_menu_items  JSONB NULL,
  ordered_items     JSONB NULL,
  receipt_data      JSONB NULL,
  companion_data    JSONB NULL,
  -- 와인용
  wine_info         JSONB NULL,  -- {name, vintage, winery, origin, variety, estimated_price_krw, critic_score}
  pairing_food      TEXT NULL,
  wine_tasting_ai   JSONB NULL,  -- {acidity, body, tannin, sweetness, balance, finish, aroma}
  -- 공통
  photo_classifications JSONB NULL,
  estimated_visit_time VARCHAR NULL,
  confidence_score  NUMERIC DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_record_ai_analyses_record_id ON record_ai_analyses(record_id);

-- 맛 특성 프로필 (1:1)
CREATE TABLE record_taste_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         UUID NOT NULL UNIQUE REFERENCES records(id) ON DELETE CASCADE,
  -- 식당/요리 공통 6축
  spicy             NUMERIC NULL,
  sweet             NUMERIC NULL,
  salty             NUMERIC NULL,
  sour              NUMERIC NULL,
  umami             NUMERIC NULL,
  rich              NUMERIC NULL,
  -- 와인 WSET 7축 (AI+사용자 평균)
  wine_acidity      NUMERIC NULL,
  wine_body         NUMERIC NULL,
  wine_tannin       NUMERIC NULL,
  wine_sweetness    NUMERIC NULL,
  wine_balance      NUMERIC NULL,
  wine_finish       NUMERIC NULL,
  wine_aroma        NUMERIC NULL,
  -- 와인 사용자 입력 원본
  wine_acidity_user   NUMERIC NULL,
  wine_body_user      NUMERIC NULL,
  wine_tannin_user    NUMERIC NULL,
  wine_sweetness_user NUMERIC NULL,
  wine_balance_user   NUMERIC NULL,
  wine_finish_user    NUMERIC NULL,
  wine_aroma_user     NUMERIC NULL,
  -- 메타
  source            VARCHAR DEFAULT 'ai' CHECK (source IN ('ai', 'pending_user', 'ai_user_avg', 'manual')),
  confidence        NUMERIC DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  summary           TEXT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Phase 완료 + XP
CREATE TABLE phase_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  record_id    UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  phase        SMALLINT NOT NULL,
  xp_earned    INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_phase_completions_user_id ON phase_completions(user_id);
