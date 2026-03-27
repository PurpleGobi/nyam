-- 002_users.sql
-- Nyam v2: users 테이블
-- SSOT: DATA_MODEL.md §2 users

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  nickname VARCHAR(20) NOT NULL,
  handle VARCHAR(20) UNIQUE,
  avatar_url TEXT,
  avatar_color VARCHAR(20),
  bio VARCHAR(100),
  taste_summary TEXT,
  taste_tags TEXT[],
  taste_updated_at TIMESTAMPTZ,
  preferred_areas TEXT[],

  -- 프라이버시
  privacy_profile VARCHAR(20) NOT NULL DEFAULT 'bubble_only',
  privacy_records VARCHAR(20) NOT NULL DEFAULT 'shared_only',
  visibility_public JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":false,"price":false}',
  visibility_bubble JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":true,"price":true}',

  -- 알림
  notify_push BOOLEAN NOT NULL DEFAULT true,
  notify_level_up BOOLEAN NOT NULL DEFAULT true,
  notify_bubble_join BOOLEAN NOT NULL DEFAULT true,
  notify_follow BOOLEAN NOT NULL DEFAULT true,
  dnd_start TIME,
  dnd_end TIME,

  -- 화면 디폴트
  pref_landing VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_home_tab VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_restaurant_sub VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_wine_sub VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_bubble_tab VARCHAR(20) NOT NULL DEFAULT 'last',
  pref_view_mode VARCHAR(20) NOT NULL DEFAULT 'last',

  -- 기능 디폴트
  pref_default_sort VARCHAR(20) NOT NULL DEFAULT 'latest',
  pref_record_input VARCHAR(20) NOT NULL DEFAULT 'camera',
  pref_bubble_share VARCHAR(20) NOT NULL DEFAULT 'ask',
  pref_temp_unit VARCHAR(5) NOT NULL DEFAULT 'C',

  -- 계정 삭제
  deleted_at TIMESTAMPTZ,
  delete_mode VARCHAR(20),
  delete_scheduled_at TIMESTAMPTZ,

  -- 비정규화 카운트
  record_count INT NOT NULL DEFAULT 0,
  follower_count INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,

  -- XP
  total_xp INT NOT NULL DEFAULT 0,
  active_xp INT NOT NULL DEFAULT 0,
  active_verified INT NOT NULL DEFAULT 0,

  -- 인증
  auth_provider VARCHAR(20) NOT NULL,
  auth_provider_id VARCHAR(100) NOT NULL UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_users_privacy_profile CHECK (privacy_profile IN ('public', 'bubble_only', 'private')),
  CONSTRAINT chk_users_privacy_records CHECK (privacy_records IN ('all', 'shared_only')),
  CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('kakao', 'google', 'apple', 'naver')),
  CONSTRAINT chk_users_pref_landing CHECK (pref_landing IN ('last', 'home', 'bubbles', 'profile')),
  CONSTRAINT chk_users_pref_home_tab CHECK (pref_home_tab IN ('last', 'restaurant', 'wine')),
  CONSTRAINT chk_users_pref_restaurant_sub CHECK (pref_restaurant_sub IN ('last', 'visited', 'wishlist', 'recommended', 'following')),
  CONSTRAINT chk_users_pref_wine_sub CHECK (pref_wine_sub IN ('last', 'tasted', 'wishlist', 'cellar')),
  CONSTRAINT chk_users_pref_bubble_tab CHECK (pref_bubble_tab IN ('last', 'bubble', 'bubbler')),
  CONSTRAINT chk_users_pref_view_mode CHECK (pref_view_mode IN ('last', 'detailed', 'compact', 'calendar')),
  CONSTRAINT chk_users_pref_default_sort CHECK (pref_default_sort IN ('latest', 'score_high', 'score_low', 'name', 'visit_count')),
  CONSTRAINT chk_users_pref_record_input CHECK (pref_record_input IN ('camera', 'search')),
  CONSTRAINT chk_users_pref_bubble_share CHECK (pref_bubble_share IN ('ask', 'auto', 'never')),
  CONSTRAINT chk_users_pref_temp_unit CHECK (pref_temp_unit IN ('C', 'F')),
  CONSTRAINT chk_users_delete_mode CHECK (delete_mode IS NULL OR delete_mode IN ('anonymize', 'hard_delete'))
);
