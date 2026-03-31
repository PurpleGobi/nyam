-- ============================================================
-- Nyam v2 — 전체 스키마 레퍼런스 (2026-03-31 실사 기준)
-- ============================================================
-- 이 파일은 실행용이 아닌 코드 참조용입니다.
-- 실제 DB는 001~032 마이그레이션으로 구성됩니다.
-- ============================================================

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────

-- CREATE EXTENSION IF NOT EXISTS postgis;        -- 3.3.7 (근처 식당 검색)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- 1.3 (gen_random_uuid)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- 1.1

-- ─────────────────────────────────────────────
-- 1. users
-- ─────────────────────────────────────────────

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT UNIQUE,
  nickname             VARCHAR(20) NOT NULL,
  handle               VARCHAR(20) UNIQUE,
  avatar_url           TEXT,
  avatar_color         VARCHAR(20),
  bio                  VARCHAR(100),

  -- 맛 프로필
  taste_summary        TEXT,
  taste_tags           TEXT[],
  taste_updated_at     TIMESTAMPTZ,
  preferred_areas      TEXT[],

  -- 프라이버시
  privacy_profile      VARCHAR(20) NOT NULL DEFAULT 'bubble_only',   -- public | bubble_only | private
  privacy_records      VARCHAR(20) NOT NULL DEFAULT 'shared_only',   -- all | shared_only
  visibility_public    JSONB NOT NULL DEFAULT '{"level":true,"price":false,"score":true,"photos":true,"bubbles":false,"comment":true,"quadrant":true}',
  visibility_bubble    JSONB NOT NULL DEFAULT '{"level":true,"price":true,"score":true,"photos":true,"bubbles":true,"comment":true,"quadrant":true}',

  -- 알림
  notify_push          BOOLEAN NOT NULL DEFAULT true,
  notify_level_up      BOOLEAN NOT NULL DEFAULT true,
  notify_bubble_join   BOOLEAN NOT NULL DEFAULT true,
  notify_follow        BOOLEAN NOT NULL DEFAULT true,
  dnd_start            TIME,
  dnd_end              TIME,

  -- 사용자 설정
  pref_landing         VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_home_tab        VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_restaurant_sub  VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_wine_sub        VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_bubble_tab      VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_view_mode       VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_default_sort    VARCHAR(20) NOT NULL DEFAULT 'latest',
  pref_record_input    VARCHAR(20) NOT NULL DEFAULT 'camera',
  pref_bubble_share    VARCHAR(20) NOT NULL DEFAULT 'ask',
  pref_temp_unit       VARCHAR(5)  NOT NULL DEFAULT 'C',

  -- 계정 삭제
  deleted_at           TIMESTAMPTZ,
  delete_mode          VARCHAR(20),    -- anonymize | hard_delete
  delete_scheduled_at  TIMESTAMPTZ,

  -- 비정규화 캐시
  record_count         INT NOT NULL DEFAULT 0,  -- lists(visited/tasted) 기준
  follower_count       INT NOT NULL DEFAULT 0,
  following_count      INT NOT NULL DEFAULT 0,
  current_streak       INT NOT NULL DEFAULT 0,
  total_xp             INT NOT NULL DEFAULT 0,
  active_xp            INT NOT NULL DEFAULT 0,
  active_verified      INT NOT NULL DEFAULT 0,

  -- 인증
  auth_provider        VARCHAR(20) NOT NULL,     -- kakao | google | apple | naver
  auth_provider_id     VARCHAR(100) NOT NULL UNIQUE,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_users_auth_provider     CHECK (auth_provider IN ('kakao','google','apple','naver')),
  CONSTRAINT chk_users_privacy_profile   CHECK (privacy_profile IN ('public','bubble_only','private')),
  CONSTRAINT chk_users_privacy_records   CHECK (privacy_records IN ('all','shared_only')),
  CONSTRAINT chk_users_delete_mode       CHECK (delete_mode IS NULL OR delete_mode IN ('anonymize','hard_delete')),
  CONSTRAINT chk_users_pref_landing      CHECK (pref_landing IN ('last','home','bubbles','profile')),
  CONSTRAINT chk_users_pref_home_tab     CHECK (pref_home_tab IN ('last','restaurant','wine')),
  CONSTRAINT chk_users_pref_restaurant_sub CHECK (pref_restaurant_sub IN ('last','visited','wishlist','recommended','following')),
  CONSTRAINT chk_users_pref_wine_sub     CHECK (pref_wine_sub IN ('last','tasted','wishlist','cellar')),
  CONSTRAINT chk_users_pref_bubble_tab   CHECK (pref_bubble_tab IN ('last','bubble','bubbler')),
  CONSTRAINT chk_users_pref_view_mode    CHECK (pref_view_mode IN ('last','detailed','compact','calendar')),
  CONSTRAINT chk_users_pref_default_sort CHECK (pref_default_sort IN ('latest','score_high','score_low','name','visit_count')),
  CONSTRAINT chk_users_pref_record_input CHECK (pref_record_input IN ('camera','search')),
  CONSTRAINT chk_users_pref_bubble_share CHECK (pref_bubble_share IN ('ask','auto','never')),
  CONSTRAINT chk_users_pref_temp_unit    CHECK (pref_temp_unit IN ('C','F'))
);

-- ─────────────────────────────────────────────
-- 2. restaurants
-- ─────────────────────────────────────────────

CREATE TABLE restaurants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  address               TEXT,
  country               VARCHAR(50) NOT NULL DEFAULT '한국',
  city                  VARCHAR(50) NOT NULL DEFAULT '서울',
  area                  TEXT[],
  district              VARCHAR(50),
  genre                 VARCHAR(30),
  price_range           INT,             -- 1~3
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  phone                 VARCHAR(20),
  hours                 JSONB,
  photos                TEXT[],
  menus                 JSONB,
  naver_rating          NUMERIC,
  kakao_rating          NUMERIC,
  google_rating         NUMERIC,
  michelin_stars        INT,             -- 1~3
  has_blue_ribbon       BOOLEAN NOT NULL DEFAULT false,
  media_appearances     JSONB,
  nyam_score            NUMERIC,
  nyam_score_updated_at TIMESTAMPTZ,
  external_ids          JSONB,
  cached_at             TIMESTAMPTZ,
  next_refresh_at       TIMESTAMPTZ,
  kakao_map_url         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_restaurants_genre       CHECK (genre IS NULL OR genre IN ('한식','일식','중식','태국','베트남','인도','이탈리안','프렌치','스페인','지중해','미국','멕시칸','카페','바/주점','베이커리','기타')),
  CONSTRAINT chk_restaurants_price_range CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 3)),
  CONSTRAINT chk_restaurants_michelin    CHECK (michelin_stars IS NULL OR (michelin_stars >= 1 AND michelin_stars <= 3))
);

CREATE INDEX idx_restaurants_country_city ON restaurants(country, city);
CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(st_makepoint(lng, lat)) WHERE lng IS NOT NULL AND lat IS NOT NULL;

-- ─────────────────────────────────────────────
-- 3. wines
-- ─────────────────────────────────────────────

CREATE TABLE wines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(200) NOT NULL,
  producer              VARCHAR(100),
  region                VARCHAR(100),
  sub_region            VARCHAR(100),
  country               VARCHAR(50),
  variety               VARCHAR(100),
  grape_varieties       JSONB,
  wine_type             VARCHAR(20) NOT NULL,    -- red | white | rose | sparkling | orange | fortified | dessert
  vintage               INT,
  abv                   NUMERIC,
  label_image_url       TEXT,
  photos                TEXT[],
  body_level            INT,             -- 1~5
  acidity_level         INT,             -- 1~3
  sweetness_level       INT,             -- 1~3
  food_pairings         TEXT[],
  serving_temp          VARCHAR(20),
  decanting             VARCHAR(30),
  reference_price       INT,
  drinking_window_start INT,
  drinking_window_end   INT,
  vivino_rating         NUMERIC,
  critic_scores         JSONB,
  classification        VARCHAR(100),
  nyam_score            NUMERIC,
  nyam_score_updated_at TIMESTAMPTZ,
  external_ids          JSONB,
  cached_at             TIMESTAMPTZ,
  next_refresh_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_wines_type            CHECK (wine_type IN ('red','white','rose','sparkling','orange','fortified','dessert')),
  CONSTRAINT chk_wines_body_level      CHECK (body_level IS NULL OR (body_level >= 1 AND body_level <= 5)),
  CONSTRAINT chk_wines_acidity_level   CHECK (acidity_level IS NULL OR (acidity_level >= 1 AND acidity_level <= 3)),
  CONSTRAINT chk_wines_sweetness_level CHECK (sweetness_level IS NULL OR (sweetness_level >= 1 AND sweetness_level <= 3))
);

CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_region ON wines(country, region, sub_region);
CREATE INDEX idx_wines_type ON wines(wine_type);

-- ─────────────────────────────────────────────
-- 4. lists (사용자 × 식당/와인 관계)
-- ─────────────────────────────────────────────

CREATE TABLE lists (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  target_id         UUID NOT NULL,
  target_type       VARCHAR(10) NOT NULL,          -- restaurant | wine
  status            VARCHAR(20) NOT NULL,          -- visited | wishlist | cellar | tasted
  source            VARCHAR(10) DEFAULT 'direct',  -- direct | bubble | ai | web | onboarding
  source_record_id  UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, target_id, target_type)
);

CREATE INDEX idx_lists_user_type ON lists(user_id, target_type, status);
CREATE INDEX idx_lists_target ON lists(target_id, target_type);

-- ─────────────────────────────────────────────
-- 5. records (방문/시음 1회)
-- ─────────────────────────────────────────────

CREATE TABLE records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id               UUID NOT NULL REFERENCES lists(id),
  user_id               UUID NOT NULL REFERENCES users(id),      -- 비정규화
  target_id             UUID NOT NULL,                            -- 비정규화
  target_type           VARCHAR(10) NOT NULL,                     -- 비정규화

  -- 사분면 평가
  axis_x                NUMERIC(5,2),
  axis_y                NUMERIC(5,2),
  satisfaction          INT,

  -- 경험 데이터
  scene                 VARCHAR(20),
  comment               VARCHAR(200),
  total_price           INT,
  purchase_price        INT,
  visit_date            DATE,
  meal_time             VARCHAR(10),     -- breakfast | lunch | dinner | snack

  -- 메뉴/페어링
  menu_tags             TEXT[],
  pairing_categories    TEXT[],

  -- GPS
  has_exif_gps          BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified      BOOLEAN NOT NULL DEFAULT false,

  -- 와인 전용
  camera_mode           VARCHAR(10),     -- individual | shelf | receipt
  ocr_data              JSONB,
  aroma_regions         JSONB,
  aroma_labels          TEXT[],
  aroma_color           VARCHAR(7),
  complexity            INT,
  finish                NUMERIC(5,2),
  balance               NUMERIC(5,2),
  auto_score            INT,

  -- 메타
  private_note          TEXT,
  companion_count       INT,
  companions            TEXT[],
  linked_restaurant_id  UUID REFERENCES restaurants(id),
  linked_wine_id        UUID REFERENCES wines(id),
  record_quality_xp     INT NOT NULL DEFAULT 0,
  score_updated_at      TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_records_list ON records(list_id);
CREATE INDEX idx_records_user_type ON records(user_id, target_type, visit_date DESC);
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_satisfaction ON records(user_id, target_type, satisfaction) WHERE satisfaction IS NOT NULL;

-- ─────────────────────────────────────────────
-- 6. record_photos
-- ─────────────────────────────────────────────

CREATE TABLE record_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id     UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  order_index   INT NOT NULL DEFAULT 0,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);

-- ─────────────────────────────────────────────
-- 7. bubbles
-- ─────────────────────────────────────────────

CREATE TABLE bubbles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     VARCHAR(20) NOT NULL,
  description              VARCHAR(100),
  focus_type               VARCHAR(20) NOT NULL DEFAULT 'all',
  area                     VARCHAR(50),
  visibility               VARCHAR(20) NOT NULL DEFAULT 'private',
  content_visibility       VARCHAR(20) NOT NULL DEFAULT 'rating_only',
  allow_comments           BOOLEAN NOT NULL DEFAULT true,
  allow_external_share     BOOLEAN NOT NULL DEFAULT false,
  join_policy              VARCHAR(20) NOT NULL DEFAULT 'invite_only',
  min_records              INT NOT NULL DEFAULT 0,
  min_level                INT NOT NULL DEFAULT 0,
  max_members              INT,
  rules                    TEXT[],
  is_searchable            BOOLEAN NOT NULL DEFAULT true,
  search_keywords          TEXT[],

  -- 비정규화 캐시
  follower_count           INT NOT NULL DEFAULT 0,
  member_count             INT NOT NULL DEFAULT 0,
  record_count             INT NOT NULL DEFAULT 0,
  avg_satisfaction         NUMERIC,
  last_activity_at         TIMESTAMPTZ,
  unique_target_count      INT NOT NULL DEFAULT 0,
  weekly_record_count      INT NOT NULL DEFAULT 0,
  prev_weekly_record_count INT NOT NULL DEFAULT 0,

  -- 메타
  icon                     TEXT,
  icon_bg_color            VARCHAR(10),
  created_by               UUID REFERENCES users(id),
  invite_code              VARCHAR(20) UNIQUE,
  invite_expires_at        TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bubbles_focus_type          CHECK (focus_type IN ('all','restaurant','wine')),
  CONSTRAINT chk_bubbles_visibility          CHECK (visibility IN ('private','public')),
  CONSTRAINT chk_bubbles_content_visibility  CHECK (content_visibility IN ('rating_only','rating_and_comment')),
  CONSTRAINT chk_bubbles_join_policy         CHECK (join_policy IN ('invite_only','closed','manual_approve','auto_approve','open'))
);

-- ─────────────────────────────────────────────
-- 8. bubble_members
-- ─────────────────────────────────────────────

CREATE TABLE bubble_members (
  bubble_id                  UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id                    UUID NOT NULL REFERENCES users(id),
  role                       VARCHAR(20) NOT NULL DEFAULT 'member',
  status                     VARCHAR(10) NOT NULL DEFAULT 'active',
  visibility_override        JSONB,
  taste_match_pct            NUMERIC,
  common_target_count        INT NOT NULL DEFAULT 0,
  avg_satisfaction           NUMERIC,
  member_unique_target_count INT NOT NULL DEFAULT 0,
  weekly_share_count         INT NOT NULL DEFAULT 0,
  badge_label                VARCHAR(30),
  joined_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  share_rule                 JSONB,

  PRIMARY KEY (bubble_id, user_id),
  CONSTRAINT chk_bm_role   CHECK (role IN ('owner','admin','member','follower')),
  CONSTRAINT chk_bm_status CHECK (status IN ('pending','active','rejected'))
);

CREATE INDEX idx_bubble_members_active ON bubble_members(bubble_id, role, status) WHERE status = 'active';
CREATE INDEX idx_bubble_members_user ON bubble_members(user_id, bubble_id) WHERE status = 'active';

-- ─────────────────────────────────────────────
-- 9. bubble_shares
-- ─────────────────────────────────────────────

CREATE TABLE bubble_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  bubble_id   UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  shared_by   UUID NOT NULL REFERENCES users(id),
  shared_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto_synced BOOLEAN NOT NULL DEFAULT false,
  target_id   UUID NOT NULL,          -- 비정규화 (records.target_id)
  target_type VARCHAR(10) NOT NULL,   -- 비정규화 (records.target_type)

  UNIQUE(record_id, bubble_id)
);

CREATE INDEX idx_bubble_shares_bubble ON bubble_shares(bubble_id, shared_at DESC);
CREATE INDEX idx_bubble_shares_record ON bubble_shares(record_id);
CREATE INDEX idx_bubble_shares_user ON bubble_shares(shared_by);
CREATE INDEX idx_bubble_shares_target ON bubble_shares(target_id, target_type, bubble_id);
CREATE INDEX idx_bubble_shares_auto_synced ON bubble_shares(bubble_id, shared_by) WHERE auto_synced = true;

-- ─────────────────────────────────────────────
-- 10. bubble_ranking_snapshots
-- ─────────────────────────────────────────────

CREATE TABLE bubble_ranking_snapshots (
  bubble_id        UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id        UUID NOT NULL,
  target_type      VARCHAR(10) NOT NULL,
  period_start     DATE NOT NULL,
  rank_position    INT NOT NULL,
  avg_satisfaction NUMERIC,
  record_count     INT NOT NULL DEFAULT 0,

  PRIMARY KEY (bubble_id, target_id, target_type, period_start),
  CONSTRAINT chk_brs_target_type CHECK (target_type IN ('restaurant','wine'))
);

CREATE INDEX idx_ranking_snapshots_bubble_period ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);

-- ─────────────────────────────────────────────
-- 11. follows
-- ─────────────────────────────────────────────

CREATE TABLE follows (
  follower_id  UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status       VARCHAR(10) NOT NULL DEFAULT 'accepted',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT chk_follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT chk_follows_status  CHECK (status IN ('pending','accepted','rejected'))
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);

-- ─────────────────────────────────────────────
-- 12. comments
-- ─────────────────────────────────────────────

CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type  VARCHAR(20) NOT NULL,
  target_id    UUID NOT NULL,
  bubble_id    UUID REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id),
  content      VARCHAR(200) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comments_target_type CHECK (target_type = 'record')
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);

-- ─────────────────────────────────────────────
-- 13. reactions
-- ─────────────────────────────────────────────

CREATE TABLE reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type   VARCHAR(20) NOT NULL,
  target_id     UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL,
  user_id       UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(target_type, target_id, reaction_type, user_id),
  CONSTRAINT chk_reactions_target_type CHECK (target_type IN ('record','comment')),
  CONSTRAINT chk_reactions_type        CHECK (reaction_type IN ('like','bookmark','want','check','fire'))
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id, reaction_type);

-- ─────────────────────────────────────────────
-- 14. notifications
-- ─────────────────────────────────────────────

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  actor_id          UUID REFERENCES users(id),
  target_type       VARCHAR(20),
  target_id         UUID,
  bubble_id         UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  metadata          JSONB,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  action_status     VARCHAR(10),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_notif_type          CHECK (notification_type IN ('level_up','bubble_join_request','bubble_join_approved','follow_request','follow_accepted','bubble_invite','bubble_new_record','bubble_member_joined','reaction_like','comment_reply')),
  CONSTRAINT chk_notif_action_status CHECK (action_status IS NULL OR action_status IN ('pending','accepted','rejected'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────
-- 15. saved_filters
-- ─────────────────────────────────────────────

CREATE TABLE saved_filters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  name        VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  context_id  UUID,
  rules       JSONB NOT NULL,
  sort_by     VARCHAR(20),
  order_index INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sf_target_type CHECK (target_type IN ('restaurant','wine','bubble','bubbler','bubble_feed','bubble_ranking','bubble_member')),
  CONSTRAINT chk_sf_sort_by     CHECK (sort_by IS NULL OR sort_by IN ('latest','score_high','score_low','name','visit_count'))
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id, target_type);
CREATE INDEX idx_saved_filters_context ON saved_filters(user_id, target_type, context_id) WHERE context_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- 16. XP 테이블
-- ─────────────────────────────────────────────

-- xp_totals (축별 현재 XP + 레벨)
CREATE TABLE xp_totals (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  axis_type  VARCHAR(20) NOT NULL,
  axis_value VARCHAR(50) NOT NULL,
  total_xp   INT NOT NULL DEFAULT 0,
  level      INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, axis_type, axis_value),
  CONSTRAINT chk_ue_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region'))
);

CREATE INDEX idx_xp_totals_axis ON xp_totals(axis_type, axis_value);

-- xp_log_changes (XP 변동 이력)
CREATE TABLE xp_log_changes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  record_id  UUID,
  axis_type  VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount  INT,
  reason     VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_xp_reason CHECK (reason IN ('record_name','record_score','record_photo','record_full','detail_axis','category','social_share','social_like','social_follow','social_mutual','bonus_onboard','bonus_first_record','bonus_first_bubble','bonus_first_share','milestone','revisit'))
);

CREATE INDEX idx_xp_log_changes_axis ON xp_log_changes(user_id, axis_type, axis_value);
CREATE INDEX idx_xp_log_changes_user_created ON xp_log_changes(user_id, created_at DESC);

-- xp_log_milestones (마일스톤 달성 기록)
CREATE TABLE xp_log_milestones (
  user_id      UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES xp_seed_milestones(id),
  axis_value   VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, milestone_id, axis_value)
);

-- xp_seed_levels (레벨 정의, 99행 시드)
CREATE TABLE xp_seed_levels (
  level       INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title       VARCHAR(20),
  color       VARCHAR(10)
);

-- xp_seed_milestones (마일스톤 정의)
CREATE TABLE xp_seed_milestones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,
  metric    VARCHAR(30) NOT NULL,
  threshold INT NOT NULL,
  xp_reward INT NOT NULL,
  label     VARCHAR(50) NOT NULL,

  CONSTRAINT chk_milestones_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region','global'))
);

CREATE INDEX idx_xp_seed_milestones_axis_threshold ON xp_seed_milestones(axis_type, metric, threshold);

-- xp_seed_rules (XP 배분 규칙)
CREATE TABLE xp_seed_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(30) NOT NULL UNIQUE,
  xp_amount   INT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 17. 참조 테이블
-- ─────────────────────────────────────────────

-- area_zones (생활권 좌표, 시드)
CREATE TABLE area_zones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(50) NOT NULL,
  city      VARCHAR(50) NOT NULL,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  radius_m  INT NOT NULL DEFAULT 1500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_area_zones_city ON area_zones(city);

-- restaurant_accolades (미슐랭/블루리본/TV 수상)
CREATE TABLE restaurant_accolades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name      TEXT NOT NULL,
  restaurant_name_norm TEXT NOT NULL,
  region               TEXT,
  area                 TEXT,
  category             TEXT NOT NULL,
  source               TEXT NOT NULL,
  prestige_tier        TEXT NOT NULL DEFAULT 'B',
  detail               TEXT,
  year                 INT,
  season               INT,
  episode              TEXT,
  source_url           TEXT,
  verified             BOOLEAN DEFAULT false,
  address              TEXT,
  phone                TEXT,
  lat                  DOUBLE PRECISION,
  lng                  DOUBLE PRECISION,
  kakao_id             TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT restaurant_accolades_category_check      CHECK (category IN ('award','tv_competition','tv_review','celebrity','media')),
  CONSTRAINT restaurant_accolades_prestige_tier_check  CHECK (prestige_tier IN ('S','A','B'))
);

CREATE INDEX idx_accolades_name_norm ON restaurant_accolades(restaurant_name_norm);
CREATE INDEX idx_accolades_region_area ON restaurant_accolades(region, area);
CREATE INDEX idx_accolades_category ON restaurant_accolades(category);
CREATE INDEX idx_accolades_source ON restaurant_accolades(source);

-- ─────────────────────────────────────────────
-- 18. 트리거 함수
-- ─────────────────────────────────────────────

-- lists INSERT/UPDATE/DELETE → users.record_count 갱신 (visited/tasted만 카운트)
CREATE OR REPLACE FUNCTION trg_update_user_record_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('visited', 'tasted') THEN
      UPDATE users SET record_count = record_count + 1 WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('visited', 'tasted') THEN
      UPDATE users SET record_count = record_count - 1 WHERE id = OLD.user_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status NOT IN ('visited', 'tasted') AND NEW.status IN ('visited', 'tasted') THEN
      UPDATE users SET record_count = record_count + 1 WHERE id = NEW.user_id;
    ELSIF OLD.status IN ('visited', 'tasted') AND NEW.status NOT IN ('visited', 'tasted') THEN
      UPDATE users SET record_count = record_count - 1 WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER after_list_record_count AFTER INSERT OR UPDATE OR DELETE ON lists
  FOR EACH ROW EXECUTE FUNCTION trg_update_user_record_count();

-- bubble_members INSERT/UPDATE/DELETE → bubbles.member_count, follower_count 갱신
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_old_is_member BOOLEAN := false;
  v_new_is_member BOOLEAN := false;
  v_old_is_follower BOOLEAN := false;
  v_new_is_follower BOOLEAN := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_is_member   := OLD.status = 'active' AND OLD.role IN ('owner', 'admin', 'member');
    v_old_is_follower := OLD.status = 'active' AND OLD.role = 'follower';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_is_member   := NEW.status = 'active' AND NEW.role IN ('owner', 'admin', 'member');
    v_new_is_follower := NEW.status = 'active' AND NEW.role = 'follower';
  END IF;
  IF NOT v_old_is_member AND v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_member AND NOT v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;
  IF NOT v_old_is_follower AND v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_follower AND NOT v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER after_bubble_member_count AFTER INSERT OR UPDATE OR DELETE ON bubble_members
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_member_count();

-- bubble_shares INSERT/DELETE → bubbles.record_count, last_activity_at 갱신
CREATE OR REPLACE FUNCTION trg_update_bubble_share_stats() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bubbles SET record_count = record_count + 1, last_activity_at = NEW.shared_at WHERE id = NEW.bubble_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bubbles SET record_count = record_count - 1 WHERE id = OLD.bubble_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER after_bubble_share_stats AFTER INSERT OR DELETE ON bubble_shares
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_share_stats();

-- follows INSERT/UPDATE/DELETE → users.follower_count, following_count 갱신
CREATE OR REPLACE FUNCTION trg_update_follow_counts() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE users SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE users SET follower_count = follower_count - 1 WHERE id = NEW.following_id;
      UPDATE users SET following_count = following_count - 1 WHERE id = NEW.follower_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER after_follow_counts AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trg_update_follow_counts();

-- ─────────────────────────────────────────────
-- 18-b. 유틸리티 함수
-- ─────────────────────────────────────────────

-- users.total_xp 원자적 증가
CREATE OR REPLACE FUNCTION increment_user_total_xp(p_user_id UUID, p_xp_delta INT) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET total_xp = total_xp + p_xp_delta, updated_at = NOW() WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User % not found', p_user_id; END IF;
END; $$;

-- 식당명 정규화 (공백/특수문자 제거, 소문자)
CREATE OR REPLACE FUNCTION normalize_restaurant_name(name TEXT) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN lower(regexp_replace(name, '[[:space:][:punct:]]', '', 'g'));
END; $$;

-- 6개월 기준 active_xp / active_verified 일괄 갱신 (크론용)
CREATE OR REPLACE FUNCTION refresh_active_xp() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users SET
    active_xp = COALESCE((
      SELECT SUM(record_quality_xp) FROM records
      WHERE records.user_id = users.id AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    active_verified = COALESCE((
      SELECT COUNT(*) FROM records
      WHERE records.user_id = users.id AND records.is_exif_verified = true
        AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    updated_at = NOW();
END; $$;

-- PostGIS 반경 검색
CREATE OR REPLACE FUNCTION restaurants_within_radius(
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_meters INT DEFAULT 2000
) RETURNS TABLE(id UUID, name VARCHAR, genre VARCHAR, area VARCHAR, distance DOUBLE PRECISION)
  LANGUAGE sql STABLE AS $$
  SELECT r.id, r.name, r.genre, r.area,
    ST_DistanceSphere(ST_MakePoint(r.lng, r.lat), ST_MakePoint(lng, lat)) AS distance
  FROM restaurants r
  WHERE r.lat IS NOT NULL AND r.lng IS NOT NULL
    AND ST_DistanceSphere(ST_MakePoint(r.lng, r.lat), ST_MakePoint(lng, lat)) <= radius_meters
  ORDER BY distance ASC LIMIT 20;
$$;

-- xp_totals upsert (INSERT ON CONFLICT UPDATE)
CREATE OR REPLACE FUNCTION upsert_user_experience(
  p_user_id UUID, p_axis_type VARCHAR, p_axis_value VARCHAR, p_xp_delta INT, p_new_level INT
) RETURNS SETOF xp_totals LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO xp_totals (user_id, axis_type, axis_value, total_xp, level, updated_at)
  VALUES (p_user_id, p_axis_type, p_axis_value, p_xp_delta, p_new_level, NOW())
  ON CONFLICT (user_id, axis_type, axis_value)
  DO UPDATE SET total_xp = xp_totals.total_xp + p_xp_delta, level = p_new_level, updated_at = NOW()
  RETURNING *;
END; $$;

-- ─────────────────────────────────────────────
-- 19. RLS 정책
-- ─────────────────────────────────────────────

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own     ON users FOR ALL    USING (id = auth.uid());
CREATE POLICY users_public  ON users FOR SELECT USING (privacy_profile = 'public');
CREATE POLICY users_bubble  ON users FOR SELECT USING (privacy_profile = 'bubble_only' AND id IN (
  SELECT bm2.user_id FROM bubble_members bm1 JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
  WHERE bm1.user_id = auth.uid() AND bm1.status = 'active' AND bm2.status = 'active'));

-- restaurants / wines (인증 사용자 읽기 + 쓰기)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY restaurants_select ON restaurants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_insert ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_update ON restaurants FOR UPDATE USING (auth.uid() IS NOT NULL);

ALTER TABLE wines ENABLE ROW LEVEL SECURITY;
CREATE POLICY wines_select ON wines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY wines_insert ON wines FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY wines_update ON wines FOR UPDATE USING (auth.uid() IS NOT NULL);

-- lists / records (본인 CRUD)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists 본인 읽기" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lists 본인 쓰기" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists 본인 수정" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lists 본인 삭제" ON lists FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records 본인 읽기" ON records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "records 본인 쓰기" ON records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "records 본인 수정" ON records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "records 본인 삭제" ON records FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
-- record_photos는 records RLS를 통해 간접 보호 (record_id FK)

-- bubbles
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bubble_public     ON bubbles FOR SELECT USING (visibility = 'public');
CREATE POLICY bubble_private    ON bubbles FOR SELECT USING (visibility = 'private' AND id IN (
  SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY bubble_owner_read ON bubbles FOR SELECT USING (created_by = auth.uid());
CREATE POLICY bubble_insert     ON bubbles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY bubble_update     ON bubbles FOR UPDATE USING (id IN (
  SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'));
CREATE POLICY bubble_delete     ON bubbles FOR DELETE USING (id IN (
  SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'));

-- bubble_members
ALTER TABLE bubble_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY bm_read         ON bubble_members FOR SELECT USING (true);
CREATE POLICY bm_insert_self  ON bubble_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY bm_update_self  ON bubble_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY bm_update_admin ON bubble_members FOR UPDATE USING (user_id = auth.uid() OR role IN ('owner','admin'));
CREATE POLICY bm_delete_self  ON bubble_members FOR DELETE USING (user_id = auth.uid());
CREATE POLICY bm_delete_admin ON bubble_members FOR DELETE USING (user_id = auth.uid() OR role IN ('owner','admin'));

-- bubble_shares
ALTER TABLE bubble_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY bubble_share_read   ON bubble_shares FOR SELECT USING (bubble_id IN (
  SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY bubble_share_insert ON bubble_shares FOR INSERT WITH CHECK (
  shared_by = auth.uid() AND bubble_id IN (
    SELECT bubble_id FROM bubble_members
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner','admin','member')));
CREATE POLICY bubble_share_delete ON bubble_shares FOR DELETE USING (shared_by = auth.uid());

-- bubble_ranking_snapshots
ALTER TABLE bubble_ranking_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY brs_read_member ON bubble_ranking_snapshots FOR SELECT USING (bubble_id IN (
  SELECT bubble_id FROM bubble_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY brs_read_public ON bubble_ranking_snapshots FOR SELECT USING (bubble_id IN (
  SELECT id FROM bubbles WHERE visibility = 'public'));

-- social
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_follower       ON follows FOR ALL    USING (follower_id = auth.uid());
CREATE POLICY follows_following_read ON follows FOR SELECT USING (following_id = auth.uid());
CREATE POLICY follows_following_update ON follows FOR UPDATE USING (following_id = auth.uid());

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_bubble ON comments FOR ALL USING (bubble_id IN (
  SELECT bm.bubble_id FROM bubble_members bm WHERE bm.user_id = auth.uid() AND bm.status = 'active' AND bm.role IN ('owner','admin','member')));

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY reactions_own  ON reactions FOR ALL    USING (user_id = auth.uid());
CREATE POLICY reactions_read ON reactions FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notif_own ON notifications FOR ALL USING (user_id = auth.uid());

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_filters_own ON saved_filters FOR ALL USING (user_id = auth.uid());

-- XP
ALTER TABLE xp_totals ENABLE ROW LEVEL SECURITY;
CREATE POLICY ue_own         ON xp_totals FOR ALL    USING (user_id = auth.uid());
CREATE POLICY ue_read_public ON xp_totals FOR SELECT USING (user_id IN (SELECT id FROM users WHERE privacy_profile = 'public'));
CREATE POLICY ue_read_bubble ON xp_totals FOR SELECT USING (user_id IN (
  SELECT bm2.user_id FROM bubble_members bm1 JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
  WHERE bm1.user_id = auth.uid() AND bm1.status = 'active' AND bm2.status = 'active'));

ALTER TABLE xp_log_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_own ON xp_log_changes FOR ALL USING (user_id = auth.uid());

ALTER TABLE xp_log_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY um_own         ON xp_log_milestones FOR ALL    USING (user_id = auth.uid());
CREATE POLICY um_read_public ON xp_log_milestones FOR SELECT USING (user_id IN (SELECT id FROM users WHERE privacy_profile = 'public'));

ALTER TABLE xp_seed_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY lt_select ON xp_seed_levels FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE xp_seed_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY milestones_select ON xp_seed_milestones FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE xp_seed_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_seed_rules 누구나 읽기" ON xp_seed_rules FOR SELECT USING (true);

-- 참조
ALTER TABLE area_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "area_zones 누구나 읽기" ON area_zones FOR SELECT USING (true);

ALTER TABLE restaurant_accolades ENABLE ROW LEVEL SECURITY;
CREATE POLICY accolades_read_all ON restaurant_accolades FOR SELECT TO authenticated USING (true);
