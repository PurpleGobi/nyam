# 1.2: 전체 DB 스키마 생성

> DATA_MODEL.md의 모든 테이블을 Supabase 마이그레이션으로 생성한다. P1+P2 전체.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/DATA_MODEL.md` | 1~10 전체 (엔티티 관계, 테이블 정의, 소셜, 넛지, 필터, AI 추천, 포도 품종, ENUM, CHECK, 비정규화) |
| `systems/XP_SYSTEM.md` | 5 레벨 커브 (앵커 포인트 선형 보간, 레벨 칭호) |
| `systems/AUTH.md` | 1 인증 (소셜 로그인 4종) |

## 선행 조건

- [ ] 1.1 프로젝트 초기화 완료
- [ ] Supabase CLI 설치 완료
- [ ] `supabase init` 실행 완료 (`supabase/` 디렉토리 존재)
- [ ] Supabase 프로젝트 연결 (`supabase link --project-ref YOUR_PROJECT_REF`)

## SSOT 준수 원칙

> **⚠️ 중요: 아래 SQL 코드 블록은 참고용 구조를 보여주며, NOT NULL 적용 여부는 반드시 이 섹션의 규칙을 따른다.**
>
> SQL 코드 블록에 NOT NULL이 포함되어 있더라도, 아래 "NOT NULL 허용 목록"에 없는 컬럼은 **NOT NULL을 제거하고 구현한다.**
> DEFAULT 값이 있는 컬럼은 NOT NULL 없이도 INSERT 시 자동으로 값이 채워지므로 NOT NULL이 불필요하다.

- `NOT NULL`: DATA_MODEL.md에서 `NOT NULL`로 명시된 컬럼만 NOT NULL을 적용한다
- `CHECK`: DATA_MODEL.md §9에서 명시적으로 정의된 CHECK만 적용한다:
  - `chk_wine_fields`: target_type ≠ 'wine'이면 와인 전용 필드 NULL
  - `chk_restaurant_fields`: target_type ≠ 'restaurant'이면 total_price NULL
  - restaurants.genre CHECK (DATA_MODEL.md에 명시된 장르 목록)
- DATA_MODEL.md에 명시되지 않은 NOT NULL, CHECK는 추가하지 않는다
- 추가 제약이 필요하다고 판단되면 → DECISIONS_LOG.md에 기록하고 사용자 승인 후 DATA_MODEL.md 갱신

### DATA_MODEL.md에서 NOT NULL로 명시된 컬럼 목록

| 테이블 | NOT NULL 컬럼 |
|--------|-------------|
| users | nickname, auth_provider, auth_provider_id |
| restaurants | name, country, city |
| wines | name, wine_type |
| records | user_id, target_id, target_type |
| record_photos | record_id, url |
| wishlists | user_id, target_id, target_type |
| user_experiences | user_id, axis_type, axis_value |
| level_thresholds | required_xp |
| milestones | axis_type, metric, threshold, xp_reward, label |
| bubbles | name |
| bubble_shares | record_id, bubble_id, shared_by |
| comments | target_type, target_id, content |
| reactions | target_type, target_id, reaction_type |
| notifications | user_id, notification_type |
| saved_filters | user_id, name, target_type, rules |
| ai_recommendations | user_id, target_id, target_type, reason |
| grape_variety_profiles | name_ko, body_order, category |

> 위 목록 외의 컬럼에 NOT NULL을 추가하지 않는다. DEFAULT가 있는 컬럼은 NOT NULL 없이도 값이 채워진다.

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 | 레이어 |
|----------|------|--------|
| `supabase/migrations/001_enums.sql` | Enum 타입 정의 | DB |
| `supabase/migrations/002_users.sql` | users 테이블 | DB |
| `supabase/migrations/003_restaurants.sql` | restaurants 테이블 + PostGIS + 인덱스 | DB |
| `supabase/migrations/004_wines.sql` | wines + grape_variety_profiles 테이블 + 인덱스 + 시드 | DB |
| `supabase/migrations/005_records.sql` | records + record_photos + CHECK 제약 + 인덱스 | DB |
| `supabase/migrations/006_social.sql` | bubbles, bubble_members, bubble_shares, bubble_share_reads, bubble_ranking_snapshots, follows | DB |
| `supabase/migrations/007_experience.sql` | user_experiences, xp_histories, level_thresholds, milestones, user_milestones + 시드 | DB |
| `supabase/migrations/008_notifications.sql` | notifications, nudge_history, nudge_fatigue | DB |
| `supabase/migrations/009_wishlists.sql` | wishlists | DB |
| `supabase/migrations/010_filters_recs.sql` | saved_filters, ai_recommendations | DB |
| `supabase/migrations/011_triggers.sql` | 모든 트리거 함수 (record_count, follow_counts, bubble_member_count, bubble_share_stats) | DB |
| `src/infrastructure/supabase/types.ts` | 자동 생성 TypeScript 타입 | infrastructure |

### 생성하지 않는 것

- RLS 정책 (1.3에서)
- Supabase Auth 설정 및 트리거 (1.4에서)
- Supabase Storage 버킷 (1.4에서)

---

## 마이그레이션 실행 명령어

```bash
# 마이그레이션 파일 생성 (이미 수동으로 작성하므로 참고용)
supabase migration new 001_enums

# 마이그레이션 적용 (로컬)
supabase db push

# 마이그레이션 적용 (원격)
supabase db push --linked

# TypeScript 타입 생성
supabase gen types typescript --linked > src/infrastructure/supabase/types.ts
```

---

## 상세 구현 지침

### 001_enums.sql

이 마이그레이션에서는 ENUM을 사용하지 않는다. DATA_MODEL.md의 모든 열거형 값은 VARCHAR + CHECK 또는 VARCHAR + 애플리케이션 레이어 검증으로 처리한다. 이유: Supabase 마이그레이션에서 ENUM 변경이 번거롭고, VARCHAR가 유연성이 높다.

이 파일은 향후 필요한 커스텀 타입이나 확장(extension)을 위한 자리표시자로 사용한다.

```sql
-- 001_enums.sql
-- Nyam v2: 확장 및 커스텀 타입
-- ENUM 대신 VARCHAR + CHECK/애플리케이션 검증 사용

-- PostGIS 확장 (restaurants 위치 인덱스용)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID 생성 함수 (Supabase 기본 포함이지만 명시)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

### 002_users.sql

```sql
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
```

---

### 003_restaurants.sql

```sql
-- 003_restaurants.sql
-- Nyam v2: restaurants 테이블
-- SSOT: DATA_MODEL.md §2 restaurants

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(50) DEFAULT '한국',
  city VARCHAR(50) DEFAULT '서울',
  area VARCHAR(50),
  district VARCHAR(50),
  genre VARCHAR(30),
  price_range INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,
  photos TEXT[],
  menus JSONB,

  -- 외부 평점
  naver_rating DECIMAL(2,1),
  kakao_rating DECIMAL(2,1),
  google_rating DECIMAL(2,1),

  -- 권위 인증
  michelin_stars INT,
  has_blue_ribbon BOOLEAN NOT NULL DEFAULT false,
  media_appearances JSONB,

  -- nyam 종합 점수
  nyam_score DECIMAL(4,1),
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_restaurants_genre CHECK (genre IS NULL OR genre IN (
    '한식', '일식', '중식', '태국', '베트남', '인도',
    '이탈리안', '프렌치', '스페인', '지중해', '미국', '멕시칸',
    '카페', '바/주점', '베이커리', '기타'
  )),
  CONSTRAINT chk_restaurants_price_range CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 4)),
  CONSTRAINT chk_restaurants_michelin CHECK (michelin_stars IS NULL OR (michelin_stars >= 1 AND michelin_stars <= 3))
);

-- 인덱스
CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_country_city ON restaurants(country, city);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(
  ST_MakePoint(lng, lat)
) WHERE lng IS NOT NULL AND lat IS NOT NULL;
```

---

### 004_wines.sql

```sql
-- 004_wines.sql
-- Nyam v2: wines + grape_variety_profiles 테이블
-- SSOT: DATA_MODEL.md §2 wines, §5-3 포도 품종 프로필

CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer VARCHAR(100),
  region VARCHAR(100),
  sub_region VARCHAR(100),
  country VARCHAR(50),
  variety VARCHAR(100),
  grape_varieties JSONB,
  wine_type VARCHAR(20) NOT NULL,
  vintage INT,
  abv DECIMAL(3,1),
  label_image_url TEXT,
  photos TEXT[],

  -- 와인 DB 메타
  body_level INT,
  acidity_level INT,
  sweetness_level INT,
  food_pairings TEXT[],
  serving_temp VARCHAR(20),
  decanting VARCHAR(30),

  reference_price INT,
  drinking_window_start INT,
  drinking_window_end INT,

  -- 외부 평점
  vivino_rating DECIMAL(2,1),
  critic_scores JSONB,

  -- 권위 인증
  classification VARCHAR(100),

  -- nyam 종합 점수
  nyam_score DECIMAL(4,1),
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_wines_type CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'orange', 'fortified', 'dessert')),
  CONSTRAINT chk_wines_body_level CHECK (body_level IS NULL OR (body_level >= 1 AND body_level <= 5)),
  CONSTRAINT chk_wines_acidity_level CHECK (acidity_level IS NULL OR (acidity_level >= 1 AND acidity_level <= 3)),
  CONSTRAINT chk_wines_sweetness_level CHECK (sweetness_level IS NULL OR (sweetness_level >= 1 AND sweetness_level <= 3))
);

-- 인덱스
CREATE INDEX idx_wines_type ON wines(wine_type);
CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_region ON wines(country, region, sub_region);

-- 포도 품종 프로필 (통계 차트 정렬용 참조 테이블)
CREATE TABLE grape_variety_profiles (
  name VARCHAR(100) PRIMARY KEY,
  name_ko VARCHAR(100) NOT NULL,
  body_order INT NOT NULL,
  category VARCHAR(10) NOT NULL,
  typical_body INT,
  typical_acidity INT,
  typical_tannin INT,

  CONSTRAINT chk_gvp_category CHECK (category IN ('red', 'white'))
);

-- 시드 데이터: 20종 (DATA_MODEL.md §5-3 정렬 순서 기준)
INSERT INTO grape_variety_profiles (name, name_ko, body_order, category, typical_body, typical_acidity, typical_tannin) VALUES
  ('Muscat', '뮈스카', 1, 'white', 2, 1, NULL),
  ('Riesling', '리슬링', 2, 'white', 2, 3, NULL),
  ('Sauvignon Blanc', '소비뇽 블랑', 3, 'white', 2, 3, NULL),
  ('Pinot Grigio', '피노 그리', 4, 'white', 2, 2, NULL),
  ('Pinot Noir', '피노 누아', 5, 'red', 2, 3, 2),
  ('Gamay', '가메', 6, 'red', 2, 3, 1),
  ('Barbera', '바르베라', 7, 'red', 3, 3, 2),
  ('Chardonnay', '샤르도네', 8, 'white', 3, 2, NULL),
  ('Grenache', '그르나슈', 9, 'red', 3, 2, 2),
  ('Merlot', '메를로', 10, 'red', 3, 2, 3),
  ('Sangiovese', '산지오베제', 11, 'red', 3, 3, 3),
  ('Viognier', '비오니에', 12, 'white', 4, 1, NULL),
  ('Tempranillo', '템프라니요', 13, 'red', 4, 2, 3),
  ('Syrah', '쉬라즈', 14, 'red', 4, 2, 4),
  ('Nebbiolo', '네비올로', 15, 'red', 4, 3, 5),
  ('Malbec', '말벡', 16, 'red', 4, 2, 4),
  ('Cabernet Sauvignon', '카베르네 소비뇽', 17, 'red', 5, 2, 5),
  ('Mourvedre', '무르베드르', 18, 'red', 5, 2, 4),
  ('Tannat', '타나', 19, 'red', 5, 2, 5),
  ('Petit Verdot', '프티 베르도', 20, 'red', 5, 2, 5);
```

---

### 005_records.sql

```sql
-- 005_records.sql
-- Nyam v2: records + record_photos 테이블
-- SSOT: DATA_MODEL.md §2 records, record_photos, §9 CHECK 제약

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,

  -- 상태
  status VARCHAR(10) NOT NULL DEFAULT 'rated',

  -- 와인 분류 (와인 전용)
  wine_status VARCHAR(10),
  camera_mode VARCHAR(10),
  ocr_data JSONB,

  -- 사분면
  axis_x DECIMAL(5,2),
  axis_y DECIMAL(5,2),
  satisfaction INT,
  scene VARCHAR(20),

  -- 와인 전용
  aroma_regions JSONB,
  aroma_labels TEXT[],
  aroma_color VARCHAR(7),
  complexity INT,
  finish DECIMAL(5,2),
  balance DECIMAL(5,2),
  auto_score INT,

  -- 확장 (선택)
  comment VARCHAR(200),
  menu_tags TEXT[],
  pairing_categories TEXT[],
  tips TEXT,
  companions TEXT[],
  companion_count INT,
  total_price INT,
  purchase_price INT,

  -- 날짜
  visit_date DATE,
  meal_time VARCHAR(10),

  -- 연결
  linked_restaurant_id UUID REFERENCES restaurants(id),
  linked_wine_id UUID REFERENCES wines(id),

  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,
  record_quality_xp INT NOT NULL DEFAULT 0,
  score_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_records_target_type CHECK (target_type IN ('restaurant', 'wine')),
  CONSTRAINT chk_records_status CHECK (status IN ('checked', 'rated', 'draft')),
  CONSTRAINT chk_records_wine_status CHECK (wine_status IS NULL OR wine_status IN ('tasted', 'cellar', 'wishlist')),
  CONSTRAINT chk_records_camera_mode CHECK (camera_mode IS NULL OR camera_mode IN ('individual', 'shelf', 'receipt')),
  CONSTRAINT chk_records_satisfaction CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 100)),
  CONSTRAINT chk_records_axis_x CHECK (axis_x IS NULL OR (axis_x >= 0 AND axis_x <= 100)),
  CONSTRAINT chk_records_axis_y CHECK (axis_y IS NULL OR (axis_y >= 0 AND axis_y <= 100)),
  CONSTRAINT chk_records_meal_time CHECK (meal_time IS NULL OR meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  CONSTRAINT chk_records_scene CHECK (scene IS NULL OR scene IN (
    'solo', 'romantic', 'friends', 'family', 'business', 'drinks',
    'gathering', 'pairing', 'gift', 'tasting', 'decanting'
  )),
  CONSTRAINT chk_records_complexity CHECK (complexity IS NULL OR (complexity >= 0 AND complexity <= 100)),
  CONSTRAINT chk_records_finish CHECK (finish IS NULL OR (finish >= 0 AND finish <= 100)),
  CONSTRAINT chk_records_balance CHECK (balance IS NULL OR (balance >= 0 AND balance <= 100))
);

-- DATA_MODEL.md §9: 와인 전용 필드가 식당 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_wine_fields
  CHECK (target_type = 'wine' OR (
    aroma_regions IS NULL AND aroma_labels IS NULL AND aroma_color IS NULL
    AND wine_status IS NULL AND camera_mode IS NULL
    AND ocr_data IS NULL AND complexity IS NULL AND finish IS NULL
    AND balance IS NULL AND auto_score IS NULL AND pairing_categories IS NULL
    AND purchase_price IS NULL
  ));

-- DATA_MODEL.md §9: 식당 전용 필드가 와인 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_restaurant_fields
  CHECK (target_type = 'restaurant' OR (
    total_price IS NULL
  ));

-- 인덱스
CREATE INDEX idx_records_user_type_date ON records(user_id, target_type, visit_date DESC);
CREATE INDEX idx_records_user_satisfaction ON records(user_id, target_type, satisfaction, target_id)
  WHERE satisfaction IS NOT NULL AND status = 'rated';
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_scene ON records(scene);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_wine_status ON records(user_id, wine_status) WHERE target_type = 'wine';
CREATE INDEX idx_records_purchase ON records(user_id, visit_date, purchase_price) WHERE purchase_price IS NOT NULL;
CREATE INDEX idx_records_linked_restaurant ON records(linked_restaurant_id) WHERE linked_restaurant_id IS NOT NULL;
CREATE INDEX idx_records_linked_wine ON records(linked_wine_id) WHERE linked_wine_id IS NOT NULL;

-- record_photos
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);
```

---

### 006_social.sql

```sql
-- 006_social.sql
-- Nyam v2: 소셜 관련 테이블
-- SSOT: DATA_MODEL.md §4

-- bubbles
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  focus_type VARCHAR(20) NOT NULL DEFAULT 'all',
  area VARCHAR(50),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  content_visibility VARCHAR(20) NOT NULL DEFAULT 'rating_only',
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_external_share BOOLEAN NOT NULL DEFAULT false,

  -- 가입 정책
  join_policy VARCHAR(20) NOT NULL DEFAULT 'invite_only',
  min_records INT NOT NULL DEFAULT 0,
  min_level INT NOT NULL DEFAULT 0,
  max_members INT,
  rules TEXT[],

  -- 검색/탐색
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  search_keywords TEXT[],

  -- 비정규화 카운트 (트리거 실시간 갱신)
  follower_count INT NOT NULL DEFAULT 0,
  member_count INT NOT NULL DEFAULT 0,
  record_count INT NOT NULL DEFAULT 0,
  avg_satisfaction DECIMAL(4,1),
  last_activity_at TIMESTAMPTZ,

  -- 비정규화 통계 캐시 (크론 일/주간 갱신)
  unique_target_count INT NOT NULL DEFAULT 0,
  weekly_record_count INT NOT NULL DEFAULT 0,
  prev_weekly_record_count INT NOT NULL DEFAULT 0,

  -- 아이콘
  icon TEXT,
  icon_bg_color VARCHAR(10),

  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_bubbles_focus_type CHECK (focus_type IN ('all', 'restaurant', 'wine')),
  CONSTRAINT chk_bubbles_visibility CHECK (visibility IN ('private', 'public')),
  CONSTRAINT chk_bubbles_content_visibility CHECK (content_visibility IN ('rating_only', 'rating_and_comment')),
  CONSTRAINT chk_bubbles_join_policy CHECK (join_policy IN ('invite_only', 'closed', 'manual_approve', 'auto_approve', 'open'))
);

-- bubble_members
CREATE TABLE bubble_members (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  visibility_override JSONB,

  -- 멤버 활동 캐시 (크론 일/주간 갱신)
  taste_match_pct DECIMAL(4,1),
  common_target_count INT NOT NULL DEFAULT 0,
  avg_satisfaction DECIMAL(4,1),
  member_unique_target_count INT NOT NULL DEFAULT 0,
  weekly_share_count INT NOT NULL DEFAULT 0,
  badge_label VARCHAR(30),

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(bubble_id, user_id),

  -- CHECK 제약
  CONSTRAINT chk_bm_role CHECK (role IN ('owner', 'admin', 'member', 'follower')),
  CONSTRAINT chk_bm_status CHECK (status IN ('pending', 'active', 'rejected'))
);

CREATE INDEX idx_bubble_members_active ON bubble_members(bubble_id, role, status) WHERE status = 'active';
CREATE INDEX idx_bubble_members_user ON bubble_members(user_id, bubble_id) WHERE status = 'active';

-- bubble_shares
CREATE TABLE bubble_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(record_id, bubble_id)
);

CREATE INDEX idx_bubble_shares_bubble ON bubble_shares(bubble_id, shared_at DESC);
CREATE INDEX idx_bubble_shares_record ON bubble_shares(record_id);
CREATE INDEX idx_bubble_shares_user ON bubble_shares(shared_by);

-- comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content VARCHAR(300) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comments_target_type CHECK (target_type IN ('record'))
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);

-- reactions
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, reaction_type, user_id),

  CONSTRAINT chk_reactions_target_type CHECK (target_type IN ('record', 'comment')),
  CONSTRAINT chk_reactions_type CHECK (reaction_type IN ('like', 'bookmark', 'want', 'check', 'fire'))
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id, reaction_type);

-- bubble_share_reads (피드 읽음 확인)
CREATE TABLE bubble_share_reads (
  share_id UUID NOT NULL REFERENCES bubble_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(share_id, user_id)
);

-- bubble_ranking_snapshots (랭킹 탭 등락 표시용)
CREATE TABLE bubble_ranking_snapshots (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  period_start DATE NOT NULL,
  rank_position INT NOT NULL,
  avg_satisfaction DECIMAL(4,1),
  record_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY(bubble_id, target_id, target_type, period_start),

  CONSTRAINT chk_brs_target_type CHECK (target_type IN ('restaurant', 'wine'))
);

CREATE INDEX idx_ranking_snapshots_bubble_period ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);

-- follows
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id),

  CONSTRAINT chk_follows_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);
```

---

### 007_experience.sql

```sql
-- 007_experience.sql
-- Nyam v2: 경험치 관련 테이블
-- SSOT: DATA_MODEL.md §3, XP_SYSTEM.md §5

-- user_experiences
CREATE TABLE user_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,
  axis_value VARCHAR(50) NOT NULL,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, axis_type, axis_value),

  CONSTRAINT chk_ue_axis_type CHECK (axis_type IN ('category', 'area', 'genre', 'wine_variety', 'wine_region'))
);

CREATE INDEX idx_user_experiences_axis ON user_experiences(axis_type, axis_value);

-- xp_histories
CREATE TABLE xp_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_xp_reason CHECK (reason IN (
    'record_name', 'record_score', 'record_photo', 'record_full',
    'category', 'social_share', 'social_like', 'social_follow', 'social_mutual',
    'bonus_onboard', 'bonus_first_record', 'bonus_first_bubble', 'bonus_first_share',
    'milestone', 'revisit'
  ))
);

CREATE INDEX idx_xp_histories_user_created ON xp_histories(user_id, created_at DESC);
CREATE INDEX idx_xp_histories_axis ON xp_histories(user_id, axis_type, axis_value);

-- level_thresholds
CREATE TABLE level_thresholds (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title VARCHAR(20),
  color VARCHAR(10)
);

-- 시드 데이터: Lv.1~99 (XP_SYSTEM.md §5 앵커 포인트 선형 보간)
-- 칭호: Lv.1~3 입문자, Lv.4~5 초보 미식가, Lv.6~7 탐식가, Lv.8~9 미식가, Lv.10+ 식도락 마스터
INSERT INTO level_thresholds (level, required_xp, title, color) VALUES
  (1, 0, '입문자', '#7EAE8B'),
  (2, 3, '입문자', '#7EAE8B'),
  (3, 8, '입문자', '#7EAE8B'),
  (4, 14, '초보 미식가', '#7A9BAE'),
  (5, 19, '초보 미식가', '#7A9BAE'),
  (6, 25, '탐식가', '#8B7396'),
  (7, 37, '탐식가', '#8B7396'),
  (8, 50, '미식가', '#C17B5E'),
  (9, 62, '미식가', '#C17B5E'),
  (10, 75, '식도락 마스터', '#C9A96E'),
  (11, 87, '식도락 마스터', '#C9A96E'),
  (12, 100, '식도락 마스터', '#C9A96E'),
  (13, 116, '식도락 마스터', '#C9A96E'),
  (14, 133, '식도락 마스터', '#C9A96E'),
  (15, 150, '식도락 마스터', '#C9A96E'),
  (16, 166, '식도락 마스터', '#C9A96E'),
  (17, 183, '식도락 마스터', '#C9A96E'),
  (18, 200, '식도락 마스터', '#C9A96E'),
  (19, 225, '식도락 마스터', '#C9A96E'),
  (20, 250, '식도락 마스터', '#C9A96E'),
  (21, 275, '식도락 마스터', '#C9A96E'),
  (22, 300, '식도락 마스터', '#C9A96E'),
  (23, 325, '식도락 마스터', '#C9A96E'),
  (24, 350, '식도락 마스터', '#C9A96E'),
  (25, 375, '식도락 마스터', '#C9A96E'),
  (26, 400, '식도락 마스터', '#C9A96E'),
  (27, 425, '식도락 마스터', '#C9A96E'),
  (28, 450, '식도락 마스터', '#C9A96E'),
  (29, 475, '식도락 마스터', '#C9A96E'),
  (30, 500, '식도락 마스터', '#C9A96E'),
  (31, 600, '식도락 마스터', '#C9A96E'),
  (32, 700, '식도락 마스터', '#C9A96E'),
  (33, 800, '식도락 마스터', '#C9A96E'),
  (34, 900, '식도락 마스터', '#C9A96E'),
  (35, 1000, '식도락 마스터', '#C9A96E'),
  (36, 1100, '식도락 마스터', '#C9A96E'),
  (37, 1200, '식도락 마스터', '#C9A96E'),
  (38, 1300, '식도락 마스터', '#C9A96E'),
  (39, 1400, '식도락 마스터', '#C9A96E'),
  (40, 1500, '식도락 마스터', '#C9A96E'),
  (41, 1600, '식도락 마스터', '#C9A96E'),
  (42, 1700, '식도락 마스터', '#C9A96E'),
  (43, 1800, '식도락 마스터', '#C9A96E'),
  (44, 1900, '식도락 마스터', '#C9A96E'),
  (45, 2000, '식도락 마스터', '#C9A96E'),
  (46, 2100, '식도락 마스터', '#C9A96E'),
  (47, 2200, '식도락 마스터', '#C9A96E'),
  (48, 2300, '식도락 마스터', '#C9A96E'),
  (49, 2400, '식도락 마스터', '#C9A96E'),
  (50, 2500, '식도락 마스터', '#C9A96E'),
  (51, 2600, '식도락 마스터', '#C9A96E'),
  (52, 2700, '식도락 마스터', '#C9A96E'),
  (53, 2800, '식도락 마스터', '#C9A96E'),
  (54, 2900, '식도락 마스터', '#C9A96E'),
  (55, 3000, '식도락 마스터', '#C9A96E'),
  (56, 3100, '식도락 마스터', '#C9A96E'),
  (57, 3200, '식도락 마스터', '#C9A96E'),
  (58, 3300, '식도락 마스터', '#C9A96E'),
  (59, 3400, '식도락 마스터', '#C9A96E'),
  (60, 3500, '식도락 마스터', '#C9A96E'),
  (61, 3600, '식도락 마스터', '#C9A96E'),
  (62, 3700, '식도락 마스터', '#C9A96E'),
  (63, 4080, '식도락 마스터', '#C9A96E'),
  (64, 4460, '식도락 마스터', '#C9A96E'),
  (65, 4840, '식도락 마스터', '#C9A96E'),
  (66, 5220, '식도락 마스터', '#C9A96E'),
  (67, 5600, '식도락 마스터', '#C9A96E'),
  (68, 5980, '식도락 마스터', '#C9A96E'),
  (69, 6360, '식도락 마스터', '#C9A96E'),
  (70, 6740, '식도락 마스터', '#C9A96E'),
  (71, 7120, '식도락 마스터', '#C9A96E'),
  (72, 7500, '식도락 마스터', '#C9A96E'),
  (73, 8250, '식도락 마스터', '#C9A96E'),
  (74, 9000, '식도락 마스터', '#C9A96E'),
  (75, 9750, '식도락 마스터', '#C9A96E'),
  (76, 10500, '식도락 마스터', '#C9A96E'),
  (77, 11250, '식도락 마스터', '#C9A96E'),
  (78, 12000, '식도락 마스터', '#C9A96E'),
  (79, 13333, '식도락 마스터', '#C9A96E'),
  (80, 14666, '식도락 마스터', '#C9A96E'),
  (81, 16000, '식도락 마스터', '#C9A96E'),
  (82, 18250, '식도락 마스터', '#C9A96E'),
  (83, 20500, '식도락 마스터', '#C9A96E'),
  (84, 22750, '식도락 마스터', '#C9A96E'),
  (85, 25000, '식도락 마스터', '#C9A96E'),
  (86, 28571, '식도락 마스터', '#C9A96E'),
  (87, 32142, '식도락 마스터', '#C9A96E'),
  (88, 35714, '식도락 마스터', '#C9A96E'),
  (89, 39285, '식도락 마스터', '#C9A96E'),
  (90, 42857, '식도락 마스터', '#C9A96E'),
  (91, 46428, '식도락 마스터', '#C9A96E'),
  (92, 50000, '식도락 마스터', '#C9A96E'),
  (93, 57142, '식도락 마스터', '#C9A96E'),
  (94, 64285, '식도락 마스터', '#C9A96E'),
  (95, 71428, '식도락 마스터', '#C9A96E'),
  (96, 78571, '식도락 마스터', '#C9A96E'),
  (97, 85714, '식도락 마스터', '#C9A96E'),
  (98, 92857, '식도락 마스터', '#C9A96E'),
  (99, 100000, '식도락 마스터', '#C9A96E');

-- milestones
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,
  metric VARCHAR(30) NOT NULL,
  threshold INT NOT NULL,
  xp_reward INT NOT NULL,
  label VARCHAR(50) NOT NULL,

  CONSTRAINT chk_milestones_axis_type CHECK (axis_type IN ('category', 'area', 'genre', 'wine_variety', 'wine_region', 'global'))
);

CREATE INDEX idx_milestones_axis_threshold ON milestones(axis_type, metric, threshold);

-- user_milestones
CREATE TABLE user_milestones (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  axis_value VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, milestone_id, axis_value)
);
```

---

### 008_notifications.sql

```sql
-- 008_notifications.sql
-- Nyam v2: 알림 + 넛지 테이블
-- SSOT: DATA_MODEL.md §4 notifications, §5 nudge

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_status VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_notif_type CHECK (notification_type IN (
    'level_up', 'bubble_join_request', 'bubble_join_approved',
    'follow_request', 'follow_accepted',
    'bubble_invite', 'bubble_new_record', 'bubble_member_joined',
    'reaction_like', 'comment_reply'
  )),
  CONSTRAINT chk_notif_action_status CHECK (action_status IS NULL OR action_status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- nudge_history
CREATE TABLE nudge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  nudge_type VARCHAR(30) NOT NULL,
  target_id UUID,
  status VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_nudge_type CHECK (nudge_type IN ('location', 'time', 'photo', 'unrated', 'new_area', 'weekly')),
  CONSTRAINT chk_nudge_status CHECK (status IN ('sent', 'opened', 'acted', 'dismissed', 'skipped'))
);

CREATE INDEX idx_nudge_history_user ON nudge_history(user_id, created_at DESC);

-- nudge_fatigue
CREATE TABLE nudge_fatigue (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  score INT NOT NULL DEFAULT 0,
  last_nudge_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ
);
```

---

### 009_wishlists.sql

```sql
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
```

---

### 010_filters_recs.sql

```sql
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
```

---

### 011_triggers.sql

```sql
-- 011_triggers.sql
-- Nyam v2: 비정규화 트리거 함수
-- SSOT: DATA_MODEL.md §10
-- 모든 트리거는 SET col = col +/- 1 증분 방식. 서브쿼리 전체 카운트 재계산 금지.

------------------------------------------------------------
-- 1. users.record_count: records INSERT/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_user_record_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET record_count = record_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET record_count = record_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_record_count
  AFTER INSERT OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION trg_update_user_record_count();

------------------------------------------------------------
-- 2. users.follower_count / following_count: follows INSERT/UPDATE/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_follow_counts()
RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trg_update_follow_counts();

------------------------------------------------------------
-- 3. bubbles.member_count + follower_count: bubble_members INSERT/UPDATE/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count()
RETURNS TRIGGER AS $$
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

  -- member_count 증감
  IF NOT v_old_is_member AND v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_member AND NOT v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  -- follower_count 증감
  IF NOT v_old_is_follower AND v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_follower AND NOT v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_member_count
  AFTER INSERT OR UPDATE OR DELETE ON bubble_members
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_member_count();

------------------------------------------------------------
-- 4. bubbles.record_count + last_activity_at: bubble_shares INSERT/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_share_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bubbles SET
      record_count = record_count + 1,
      last_activity_at = NEW.shared_at
    WHERE id = NEW.bubble_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bubbles SET record_count = record_count - 1 WHERE id = OLD.bubble_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_share_stats
  AFTER INSERT OR DELETE ON bubble_shares
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_share_stats();
```

---

## 테이블 전체 목록 (25개)

| # | 테이블명 | 마이그레이션 파일 | FK 참조 |
|---|---------|-----------------|---------|
| 1 | users | 002 | - |
| 2 | restaurants | 003 | - |
| 3 | wines | 004 | - |
| 4 | grape_variety_profiles | 004 | - |
| 5 | records | 005 | users, restaurants(linked), wines(linked) |
| 6 | record_photos | 005 | records (CASCADE) |
| 7 | bubbles | 006 | users(created_by) |
| 8 | bubble_members | 006 | bubbles (CASCADE), users |
| 9 | bubble_shares | 006 | records (CASCADE), bubbles (CASCADE), users |
| 10 | comments | 006 | bubbles (CASCADE), users |
| 11 | reactions | 006 | users |
| 12 | bubble_share_reads | 006 | bubble_shares (CASCADE), users |
| 13 | bubble_ranking_snapshots | 006 | bubbles (CASCADE) |
| 14 | follows | 006 | users (x2) |
| 15 | user_experiences | 007 | users |
| 16 | xp_histories | 007 | users, records (SET NULL) |
| 17 | level_thresholds | 007 | - |
| 18 | milestones | 007 | - |
| 19 | user_milestones | 007 | users, milestones |
| 20 | notifications | 008 | users (x2), bubbles (SET NULL) |
| 21 | nudge_history | 008 | users |
| 22 | nudge_fatigue | 008 | users |
| 23 | wishlists | 009 | users, records (SET NULL) |
| 24 | saved_filters | 010 | users |
| 25 | ai_recommendations | 010 | users |

---

## TypeScript 타입 생성

마이그레이션 적용 후 실행:

```bash
supabase gen types typescript --linked > src/infrastructure/supabase/types.ts
```

이 파일은 자동 생성되며 수동 편집하지 않는다. 스키마 변경 시 매번 재생성한다.

---

## 검증 체크리스트

- [ ] `supabase db push` (또는 `supabase db push --linked`) 성공 -- 모든 마이그레이션 에러 없음
- [ ] 테이블 25개 전부 생성 확인: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'` = 25
- [ ] `supabase gen types typescript` 성공
- [ ] `src/infrastructure/supabase/types.ts` 파일에 모든 25개 테이블 타입 존재
- [ ] FK 관계 확인: `SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`
- [ ] CHECK 제약 확인 (records):
  - `chk_wine_fields`: 식당 기록에 와인 전용 필드 저장 시도 시 에러 확인
  - `chk_restaurant_fields`: 와인 기록에 total_price 저장 시도 시 에러 확인
- [ ] UNIQUE 제약 확인:
  - `wishlists(user_id, target_id, target_type)`: 같은 사용자가 같은 대상 중복 찜 시 에러
  - `bubble_shares(record_id, bubble_id)`: 같은 기록 같은 버블 중복 공유 시 에러
  - `reactions(target_type, target_id, reaction_type, user_id)`: 같은 리액션 중복 시 에러
  - `user_experiences(user_id, axis_type, axis_value)`: 동일 축 중복 방지
- [ ] 인덱스 생성 확인: `SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename`
- [ ] grape_variety_profiles 20행 시드 데이터 확인: `SELECT COUNT(*) FROM grape_variety_profiles` = 20
- [ ] level_thresholds 99행 시드 데이터 확인: `SELECT COUNT(*) FROM level_thresholds` = 99
- [ ] 트리거 4개 생성 확인: `SELECT tgname FROM pg_trigger WHERE tgisinternal = false`
  - `after_record_count` (records 테이블)
  - `after_follow_counts` (follows 테이블)
  - `after_bubble_member_count` (bubble_members 테이블)
  - `after_bubble_share_stats` (bubble_shares 테이블)
- [ ] PostGIS 확장 활성화 확인: `SELECT extname FROM pg_extension WHERE extname = 'postgis'`
