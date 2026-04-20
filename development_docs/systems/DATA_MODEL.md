<!-- updated: 2026-04-20 -->
# DATA_MODEL — 데이터 모델 (SSOT)

> 이 문서는 Nyam DB 스키마의 Single Source of Truth다. 현재 적용된 supabase/migrations (000~083, 078 번호 중복, 총 84개 파일)과
> src/infrastructure/supabase/types.ts의 실제 스키마를 기준으로 작성되었다.
> 비즈니스 규칙(버블 공유/기록 평가/추천 등)은 별도 SSOT 문서 참조.
>
> - 버블 시스템 규칙: `systems/BUBBLE_SYSTEM.md`
> - 기록 평가/아로마/사분면: `systems/RECORD_SYSTEM.md`
> - 추천 알고리즘: `systems/RECOMMENDATION.md`
> - 인증/권한 계층: `systems/AUTH.md`
> - XP/레벨: `systems/XP_SYSTEM.md`

---

## 1. 핵심 엔티티 관계 (ERD)

```
users (1) ─── (N) records
users (1) ─── (N) xp_totals
users (1) ─── (N) xp_log_changes
users (1) ─── (N) xp_log_milestones
users (1) ─── (N) saved_filters
users (1) ─── (N) notifications
users (1) ─── (N) follows ─── (N) users

restaurants (1) ─── (N) records   (target_type='restaurant')
wines       (1) ─── (N) records   (target_type='wine')
restaurants (1) ─── (N) restaurant_prestige   (↔ restaurants.prestige JSONB 캐시, 트리거 동기화)

records (1) ─── (N) record_photos
records (1) ─── (N) comments   (target_type='record')
records (1) ─── (N) reactions  (target_type='record')

bubbles (1) ─── (N) bubble_members ─── (N) users
bubbles (1) ─── (N) bubble_items          -- 버블 큐레이션 (target 단위, 순수 5컬럼)
bubbles (1) ─── (N) bubble_photos         -- 버블 공용 사진첩
bubbles (1) ─── (N) bubble_ranking_snapshots

comments (1) ─── (N) comments   (parent_id self-ref, 대댓글 thread)
comments (1) ─── (N) reactions  (target_type='comment')

-- CF 캐시
users (N) ─── (N) user_similarities   (user_a < user_b, category별)
users (1) ─── (N) user_score_means

-- 시드/참조 테이블 (FK 없음 또는 선택)
-- area_zones         : 생활권 좌표 시드
-- xp_seed_levels     : 레벨별 필요 XP 정의
-- xp_seed_milestones : 마일스톤 정의
-- xp_seed_rules      : XP 배분 규칙
```

> **제거된 관계** (§13 참조):
> - `bubble_shares`: 068에서 DROP. 모든 "버블에 공유" 동선은 이제 `bubble_items`(타겟 단위) + `records`(개인 기록)로 해결.
> - `bookmarks`: 063에서 DROP. 찜/셀러는 1인 비공개 버블 또는 `bubble_items`로 대체.

---

## 2. 엔티티 테이블 정의

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  nickname VARCHAR(20) NOT NULL,
  handle VARCHAR(20) UNIQUE,            -- @handle (프로필 표시용)
  avatar_url TEXT,
  avatar_color VARCHAR(20),             -- avatar_url 없을 때 이니셜+색상 렌더
  bio VARCHAR(100),
  taste_summary TEXT,                   -- AI 생성 취향 요약
  taste_tags TEXT[],                    -- AI 생성 취향 태그
  taste_updated_at TIMESTAMPTZ,
  preferred_areas TEXT[],               -- 온보딩 생활권 선택
  home_filter_state JSONB,              -- 홈 필터/소팅 상태 캐시

  -- 프라이버시 (047)
  is_public BOOLEAN NOT NULL DEFAULT false,
  follow_policy VARCHAR(20) NOT NULL DEFAULT 'blocked',
                 -- 'blocked' | 'auto_approve' | 'manual_approve' | 'conditional'
  follow_min_records INT,               -- conditional에서 최소 기록 수
  follow_min_level INT,                 -- conditional에서 최소 레벨
  visibility_public JSONB NOT NULL DEFAULT
    '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":false,"price":false}',
  visibility_bubble JSONB NOT NULL DEFAULT
    '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":true,"price":true}',

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
  pref_timezone TEXT,                   -- IANA. NULL이면 클라이언트 감지

  -- 기능 디폴트
  pref_default_sort VARCHAR(20) NOT NULL DEFAULT 'latest',
  pref_record_input VARCHAR(20) NOT NULL DEFAULT 'camera',
  pref_bubble_share VARCHAR(20) NOT NULL DEFAULT 'ask',
  pref_temp_unit VARCHAR(5) NOT NULL DEFAULT 'C',

  -- 계정 삭제 (30일 유예)
  deleted_at TIMESTAMPTZ,
  delete_mode VARCHAR(20),              -- 'anonymize' | 'hard_delete'
  delete_scheduled_at TIMESTAMPTZ,

  -- 비정규화 캐시
  record_count INT NOT NULL DEFAULT 0,
  follower_count INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  total_xp INT NOT NULL DEFAULT 0,
  active_xp INT NOT NULL DEFAULT 0,
  active_verified INT NOT NULL DEFAULT 0,

  -- 인증
  auth_provider VARCHAR(20) NOT NULL,   -- 'kakao'|'google'|'apple'|'naver'
  auth_provider_id VARCHAR(100) NOT NULL UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('kakao','google','apple','naver')),
  CONSTRAINT chk_follow_policy       CHECK (follow_policy IN ('blocked','auto_approve','manual_approve','conditional'))
  -- 그 외 pref_* CHECK은 039_fix_pref_check_constraints.sql 참조
);
```

### restaurants

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(50) NOT NULL DEFAULT '한국',
  city VARCHAR(50) NOT NULL DEFAULT '서울',
  area TEXT[],                      -- 생활권 배열 (중복 영역 지원)
  district VARCHAR(50),             -- 구 (종로구, 강남구 등)
  genre VARCHAR(30),                -- §8 "식당 장르 ENUM" 참조
  price_range INT,                  -- 1~3 (저가/중간/고가)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,                      -- {"mon":"11:00-22:00", ...}
  photos TEXT[],
  menus JSONB,                      -- [{"name":"...","price":N}]

  -- 외부 평점
  naver_rating NUMERIC,
  kakao_rating NUMERIC,
  google_rating NUMERIC,

  -- 명성 캐시 (restaurant_prestige 트리거로 동기화)
  prestige JSONB DEFAULT '[]',      -- [{"type":"michelin","grade":"1_star"},...]

  -- nyam 종합 점수
  nyam_score NUMERIC,               -- 0~100. NULL이면 미산출
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  kakao_map_url TEXT,

  -- 크롤링 메타 (056)
  data_source TEXT NOT NULL DEFAULT 'user_created',
  -- 허용값: 'user_created' | 'crawled' (향후 'kakao_crawl' 등 소스별 세분화 여지). CHECK 제약 없음 — 운영상 enum 관리. 근거: MAP_LOCATION §6.3.
  last_crawled_at TIMESTAMPTZ,
  is_closed BOOLEAN NOT NULL DEFAULT false,

  -- 외부 ID (partial UNIQUE 인덱스)
  external_id_kakao TEXT,
  external_id_google TEXT,
  external_id_naver TEXT,

  -- 공간 인덱스 (062: 저장 geometry + 트리거)
  geom geometry(Point, 4326),       -- trg_restaurants_geom 자동 갱신

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_restaurants_genre
    CHECK (genre IS NULL OR genre IN
      ('한식','일식','중식','태국','베트남','인도','이탈리안','프렌치','스페인','지중해',
       '미국','멕시칸','카페','바/주점','베이커리','기타')),
  CONSTRAINT chk_restaurants_price_range
    CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 3))
);
```

### wines

```sql
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer VARCHAR(100),
  region VARCHAR(100),              -- WSET region
  sub_region VARCHAR(100),
  appellation VARCHAR(100),         -- 4단계 drill-down (037)
  country VARCHAR(50),
  variety VARCHAR(100),             -- 단일 품종용 (블렌드는 grape_varieties)
  grape_varieties JSONB,            -- [{"name":"Cab Sauv","pct":60},...]
  wine_type VARCHAR(20) NOT NULL,   -- 'red'|'white'|'rose'|'sparkling'|'orange'|'fortified'|'dessert'
  vintage INT,                      -- NULL = NV
  abv NUMERIC,
  label_image_url TEXT,
  photos TEXT[],
  tasting_notes TEXT,               -- 038

  -- 와인 DB 메타
  body_level INT,                   -- 1~5
  acidity_level INT,                -- 1~3
  sweetness_level INT,              -- 1~3
  food_pairings TEXT[],             -- 영문 키 ("steak","cheese",...)
  serving_temp VARCHAR(20),
  decanting VARCHAR(30),

  reference_price_min INT,
  reference_price_max INT,
  price_review JSONB,               -- {"verdict":"buy"|"conditional_buy"|"avoid",...}
  drinking_window_start INT,
  drinking_window_end INT,

  -- 외부 평점
  vivino_rating NUMERIC,
  critic_scores JSONB,              -- {"RP":97,"WS":95,"JR":18.5,"JH":96}

  -- 권위 인증
  classification VARCHAR(100),      -- Grand Cru Classé 등

  nyam_score NUMERIC,
  nyam_score_updated_at TIMESTAMPTZ,

  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_wines_type
    CHECK (wine_type IN ('red','white','rose','sparkling','orange','fortified','dessert')),
  CONSTRAINT chk_wines_body_level
    CHECK (body_level IS NULL OR (body_level >= 1 AND body_level <= 5)),
  CONSTRAINT chk_wines_acidity_level
    CHECK (acidity_level IS NULL OR (acidity_level >= 1 AND acidity_level <= 3)),
  CONSTRAINT chk_wines_sweetness_level
    CHECK (sweetness_level IS NULL OR (sweetness_level >= 1 AND sweetness_level <= 3))
);
```

### records (방문/시음 기록)

> 2026-04-07 리팩토링 완료: `lists` / `bookmarks` 관계 테이블 없이 records가 restaurants/wines를 직접 참조.
> 기존 records+wishlists+lists 구조 이력은 §13 참조.

```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,                          -- restaurants.id 또는 wines.id
  target_type VARCHAR(10) NOT NULL,                 -- 'restaurant' | 'wine'

  -- 사분면 평가 (→ RECORD_SYSTEM.md)
  axis_x NUMERIC(5,2),              -- 0~100
  axis_y NUMERIC(5,2),              -- 0~100
  satisfaction INT,                 -- 1~100, Math.round((axis_x+axis_y)/2). axis_x=axis_y=0 조합은
                                    -- satisfaction=0이 되어 CHECK(>=1)를 위반하므로 application layer에서 저장 차단 (아래 CHECK 주석 참조)

  -- 경험 데이터
  scene VARCHAR(20),                -- §8 상황 태그
  comment VARCHAR(200),
  total_price INT,                  -- 식당 1인 결제 금액 (원)
  purchase_price INT,               -- 와인 구매 가격 (원)
  visit_date DATE,
  meal_time VARCHAR(10),            -- 'breakfast'|'lunch'|'dinner'|'snack'

  -- 메뉴/페어링
  menu_tags TEXT[],
  pairing_categories TEXT[],        -- WSET 페어링 — 와인 전용

  -- GPS 검증 (EXIF)
  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,  -- 식당 좌표 200m 이내면 true

  -- 와인 전용 (040 + 041 WSET 재구성)
  camera_mode VARCHAR(10),          -- §8 camera_mode ENUM
  ocr_data JSONB,
  -- 아로마 3링 (UI 섹터 ID 배열) — 16섹터 × 3링 (Ring1 9 + Ring2 4 + Ring3 3). SSOT: RECORD_SYSTEM §4.1~4.3
  -- 용어 매핑: aroma_primary ↔ Ring 1 / aroma_secondary ↔ Ring 2 / aroma_tertiary ↔ Ring 3
  aroma_primary TEXT[] DEFAULT '{}',    -- Ring 1 섹터 ID 배열 — WSET 1차 (포도 유래: 과일 6종[시트러스/사과·배/열대/핵과/붉은베리/검은베리] + 꽃 2종[꽃/흰꽃] + 허브 1종 = 9섹터)  [RECORD_SYSTEM §4.1 SSOT]
  aroma_secondary TEXT[] DEFAULT '{}',  -- Ring 2 섹터 ID 배열 — WSET 2차 (양조 유래: MLF/Oak/Lees 포함)    [RECORD_SYSTEM §4.2 SSOT]
  aroma_tertiary TEXT[] DEFAULT '{}',   -- Ring 3 섹터 ID 배열 — WSET 3차 (숙성 유래: 가죽/흙/견과/산화)     [RECORD_SYSTEM §4.3 SSOT]
  complexity INT,                   -- 0~100
  finish NUMERIC(5,2),              -- 여운 0~100
  balance NUMERIC(5,2),             -- 균형 0~100
  intensity INT,                    -- 0~100 (040)
  auto_score INT,

  -- 메타
  private_note TEXT,                -- 비공개 메모
  companion_count INT,              -- 동반자 수 (필터/통계용)
  companions TEXT[],                -- 함께 간 사람 (본인만 열람, UI에서 완전 비공개)
  linked_restaurant_id UUID REFERENCES restaurants(id),  -- 와인→식당 링크
  linked_wine_id UUID REFERENCES wines(id),              -- 식당→와인 링크
  record_quality_xp INT NOT NULL DEFAULT 0,              -- 이 기록 획득 XP 누계
  score_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_records_target_type
    CHECK (target_type IN ('restaurant', 'wine')),
  CONSTRAINT chk_records_camera_mode
    CHECK (camera_mode IS NULL OR camera_mode IN ('individual', 'shelf', 'receipt')),
  -- satisfaction 하한은 1 (0 금지). (axis_x, axis_y)는 각각 0~100 허용이나
  -- 공식상 (0,0)이면 satisfaction=0이 되어 본 CHECK를 위반. application layer는
  -- axis_x + axis_y < 2 (즉 satisfaction < 1)인 기록의 저장을 차단해야 한다.
  -- SSOT: RECORD_SYSTEM §2.3 "DB CHECK 제약으로 1~100 범위 보장 (chk_records_satisfaction)"
  CONSTRAINT chk_records_satisfaction
    CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 100)),
  CONSTRAINT chk_records_axis_x
    CHECK (axis_x IS NULL OR (axis_x >= 0 AND axis_x <= 100)),
  CONSTRAINT chk_records_axis_y
    CHECK (axis_y IS NULL OR (axis_y >= 0 AND axis_y <= 100)),
  CONSTRAINT chk_records_meal_time
    CHECK (meal_time IS NULL OR meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  CONSTRAINT chk_records_scene
    CHECK (scene IS NULL OR scene IN (
      'solo', 'romantic', 'friends', 'family', 'business', 'drinks',
      'gathering', 'pairing', 'gift', 'tasting', 'decanting'
    )),
  CONSTRAINT chk_records_finish
    CHECK (finish IS NULL OR (finish >= 0 AND finish <= 100)),
  CONSTRAINT chk_records_balance
    CHECK (balance IS NULL OR (balance >= 0 AND balance <= 100)),
  CONSTRAINT chk_records_complexity
    CHECK (complexity IS NULL OR (complexity >= 0 AND complexity <= 100)),
  CONSTRAINT chk_records_intensity
    CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 100))
);
```

**핵심 구조 요약** (근거: `_archive/개념문서_원본/식당기록DB작동로직.md`):
- `restaurants`/`wines`는 **공유 자원** — 같은 식당은 1행, 여러 사용자가 참조.
- `records`는 **개인 소유** — 사용자 × 방문(시음)마다 1행. 재방문 시 행 추가.
- 상세 페이지는 **합성 뷰** — 식당 기본 정보 + 내 records + 버블 멤버 records (현재는 `bubble_items` + `bubble_members` + `records` JOIN) 조합.

### record_photos

```sql
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,                -- storage URL
  order_index INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  -- 045_record_photos_exif_columns.sql
  captured_at TIMESTAMPTZ,
  exif_lat DOUBLE PRECISION,
  exif_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);
```

> **사진 화질 중앙화**: 업로드 시 리사이즈/WebP 품질은 `src/domain/entities/record-photo.ts`의 `PHOTO_CONSTANTS`
> (MAX_WIDTH, QUALITY, OUTPUT_FORMAT)로 중앙 관리. DB에는 단일 `url`만 저장 (현재 스키마에 `thumbnail_url` 없음).

---

## 3. 경험치 관련 테이블

→ 상세 규칙: `systems/XP_SYSTEM.md`

### xp_totals

```sql
CREATE TABLE xp_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,    -- 'category'|'area'|'genre'|'wine_variety'|'wine_region'
  axis_value VARCHAR(50) NOT NULL,   -- category: 'restaurant'|'wine' / area: '을지로' / ...
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, axis_type, axis_value),
  CONSTRAINT chk_xp_totals_axis_type
    CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region'))
);

CREATE INDEX idx_xp_totals_axis ON xp_totals(axis_type, axis_value);
```

### xp_log_changes

```sql
CREATE TABLE xp_log_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID,                    -- 기록 삭제 시에도 XP 이력 유지 (FK 미설정)
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(30),                -- 아래 CHECK 참조
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_xp_reason CHECK (reason IN (
    'record_name','record_score','record_photo','record_full',
    'detail_axis','category',
    'social_share','social_like','social_follow','social_mutual',
    'bonus_onboard','bonus_first_record','bonus_first_bubble','bonus_first_share',
    'milestone','revisit'
  ))
);

CREATE INDEX idx_xp_log_changes_user_created ON xp_log_changes(user_id, created_at DESC);
CREATE INDEX idx_xp_log_changes_axis         ON xp_log_changes(user_id, axis_type, axis_value);
```

### xp_seed_levels / xp_seed_milestones / xp_seed_rules / xp_log_milestones

```sql
-- 레벨 정의 시드 (약 99행)
CREATE TABLE xp_seed_levels (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title VARCHAR(20),
  color VARCHAR(10)
);

-- 마일스톤 정의 (axis_type별 임계값 + 보너스 XP)
CREATE TABLE xp_seed_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,
  metric VARCHAR(30) NOT NULL,        -- 'unique_places'|'total_records'|'revisits'|...
  threshold INT NOT NULL,
  xp_reward INT NOT NULL,
  label VARCHAR(50) NOT NULL,
  CONSTRAINT chk_xp_seed_milestones_axis_type
    CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region','global'))
);
CREATE INDEX idx_xp_seed_milestones_axis_threshold
  ON xp_seed_milestones(axis_type, metric, threshold);

-- XP 배분 규칙 (시드)
CREATE TABLE xp_seed_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(30) NOT NULL UNIQUE,
  xp_amount INT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 마일스톤 달성 기록
CREATE TABLE xp_log_milestones (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES xp_seed_milestones(id),
  axis_value VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(user_id, milestone_id, axis_value)
);
```

---

## 4. 소셜 관련 테이블

→ 상세 규칙: `systems/BUBBLE_SYSTEM.md` (과거 `pages/08_BUBBLE.md`는 `_archive/pages/`로 이동됨)

### bubbles

```sql
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  focus_type VARCHAR(20) NOT NULL DEFAULT 'all',      -- 'all'|'restaurant'|'wine'
  area VARCHAR(50),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',  -- 'private'|'public'
  content_visibility VARCHAR(20) NOT NULL DEFAULT 'rating_only',
                 -- 'rating_only'|'rating_and_comment'
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_external_share BOOLEAN NOT NULL DEFAULT false,

  -- 가입 정책
  join_policy VARCHAR(20) NOT NULL DEFAULT 'invite_only',
                 -- 'invite_only'|'closed'|'manual_approve'|'auto_approve'|'open'
  min_records INT NOT NULL DEFAULT 0,
  min_level INT NOT NULL DEFAULT 0,
  max_members INT,
  rules TEXT[],

  -- 검색/탐색
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  search_keywords TEXT[],

  -- 비정규화 카운트 (트리거 실시간)
  follower_count INT NOT NULL DEFAULT 0,
  member_count INT NOT NULL DEFAULT 0,
  record_count INT NOT NULL DEFAULT 0,       -- 현재는 bubble_items 기준 (054)
  avg_satisfaction NUMERIC,
  last_activity_at TIMESTAMPTZ,

  -- 비정규화 통계 (크론 또는 트리거)
  unique_target_count INT NOT NULL DEFAULT 0,
  weekly_record_count INT NOT NULL DEFAULT 0,
  prev_weekly_record_count INT NOT NULL DEFAULT 0,

  icon TEXT,                                  -- lucide 아이콘명 또는 업로드 URL
  icon_bg_color VARCHAR(10),
  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bubbles_focus_type
    CHECK (focus_type IN ('all','restaurant','wine')),
  CONSTRAINT chk_bubbles_visibility
    CHECK (visibility IN ('private','public')),
  CONSTRAINT chk_bubbles_content_visibility
    CHECK (content_visibility IN ('rating_only','rating_and_comment')),
  CONSTRAINT chk_bubbles_join_policy
    CHECK (join_policy IN ('invite_only','closed','manual_approve','auto_approve','open'))
);
```

> `closed`는 `visibility='public'` + follower-only 멤버십 의미 (AUTH §2-3 + BUBBLE_SYSTEM §2-2 권위 정의).

### bubble_members

```sql
CREATE TABLE bubble_members (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',     -- 'owner'|'admin'|'member'|'follower'
  status VARCHAR(10) NOT NULL DEFAULT 'active',   -- 'pending'|'active'|'rejected'
  visibility_override JSONB,                      -- NULL이면 users.visibility_bubble 사용
  share_rule JSONB,                               -- 자동 공유 규칙 → BUBBLE_SYSTEM.md

  -- 멤버 활동 캐시 (bubble_items 트리거로 갱신)
  taste_match_pct NUMERIC,
  common_target_count INT NOT NULL DEFAULT 0,
  avg_satisfaction NUMERIC,
  member_unique_target_count INT NOT NULL DEFAULT 0,
  weekly_share_count INT NOT NULL DEFAULT 0,
  badge_label VARCHAR(30),

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(bubble_id, user_id),
  CONSTRAINT chk_bm_role   CHECK (role IN ('owner','admin','member','follower')),
  CONSTRAINT chk_bm_status CHECK (status IN ('pending','active','rejected'))
);

CREATE INDEX idx_bubble_members_active
  ON bubble_members(bubble_id, role, status) WHERE status = 'active';
CREATE INDEX idx_bubble_members_user
  ON bubble_members(user_id, bubble_id) WHERE status = 'active';
CREATE INDEX idx_bubble_members_bubble_status_user  -- 078: 성능 최적화
  ON bubble_members(bubble_id, status, user_id);
```

### bubble_items (버블 큐레이션 — 타겟 단위)

> **완전 단순화 완료** (053 → 076 DROP source → 077 DROP record_id → 078 DROP added_by).
> 현재 bubble_items는 (id, bubble_id, target_id, target_type, added_at) **5컬럼만** 존재.
> "누가 기록했는지"는 records + bubble_members JOIN으로 확인한다. 상세 큐레이션 규칙 → `systems/BUBBLE_SYSTEM.md`.

```sql
CREATE TABLE bubble_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,                 -- restaurants.id 또는 wines.id
  target_type VARCHAR(10) NOT NULL
    CHECK (target_type IN ('restaurant','wine')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(bubble_id, target_id, target_type)
);

CREATE INDEX idx_bubble_items_bubble_target
  ON bubble_items(bubble_id, target_type);
```

**불변식 (Invariants, 078 트리거 기준)**:
1. `bubble_items` 행은 해당 버블에 활성 멤버 중 **최소 1명 이상**이 `target_id/target_type`에 기록이 있을 때만 존재한다.
2. 기록 삭제 시 `trg_cleanup_bubble_items_on_record_delete`(BEFORE DELETE ON records)가 해당 타겟에 다른 활성 멤버 기록이 없으면 bubble_items 행 삭제.
3. 멤버 탈퇴 시(`status` active → non-active) `trg_cleanup_bubble_items_on_member_leave`가 탈퇴 멤버의 기록 타겟 중 다른 활성 멤버 기록이 없는 행 삭제.
4. `bubble_items` INSERT/DELETE 시 `trg_update_bubble_item_stats` → bubbles.record_count/unique_target_count/last_activity_at 갱신 (054).
5. `bubble_items` INSERT/DELETE 시 `trg_update_bubble_member_item_stats` → bubble_members의 member_unique_target_count/weekly_share_count/avg_satisfaction 갱신 (078, 해당 타겟에 기록 있는 멤버만 UPDATE — 성능 최적화).

### bubble_photos (버블 공용 사진첩, 067)

```sql
CREATE TABLE bubble_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bubble_photos_bubble
  ON bubble_photos(bubble_id, order_index);
```

### comments

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,       -- 'record' (향후 확장 가능성)
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,  -- NULL 허용 (080)
  user_id UUID REFERENCES users(id),
  content VARCHAR(300) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- 대댓글 thread (081)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comments_target_type CHECK (target_type = 'record')
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

> **bubble_id 의미**: 버블 맥락의 댓글이면 bubble_id 설정, 식당/와인 상세페이지의 기록별 댓글은 `bubble_id IS NULL` (080). RLS는 §12 참조.
> **types.ts 주의**: 2026-04-20 현재 `src/infrastructure/supabase/types.ts`는 migration 081 이전에 생성된 버전이라 parent_id 타입이 누락되어 있다. 타입을 활용하려면 `pnpm supabase:gen` 재생성 필요.

### reactions

```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL,          -- 'record' | 'comment'
  target_id UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL,        -- 'good' | 'bad' (079에서 교체)
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(target_type, target_id, reaction_type, user_id),
  CONSTRAINT chk_reactions_target_type CHECK (target_type IN ('record','comment')),
  CONSTRAINT chk_reactions_type        CHECK (reaction_type IN ('good','bad'))
);

CREATE INDEX idx_reactions_target
  ON reactions(target_type, target_id, reaction_type);
```

> **good/bad 상호배타**는 애플리케이션 레이어(use-reactions hook)에서 보장: 같은 user_id+target_id+target_type에서 good 추가 시 기존 bad 제거, 반대 동일. DB CHECK 만으로는 강제 불가 (각 행은 독립).

### bubble_ranking_snapshots

```sql
CREATE TABLE bubble_ranking_snapshots (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,
  period_start DATE NOT NULL,
  rank_position INT NOT NULL,
  avg_satisfaction NUMERIC,
  record_count INT NOT NULL DEFAULT 0,

  PRIMARY KEY(bubble_id, target_id, target_type, period_start),
  CONSTRAINT chk_brs_target_type CHECK (target_type IN ('restaurant','wine'))
);

CREATE INDEX idx_ranking_snapshots_bubble_period
  ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);
```

### follows

```sql
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',   -- 'pending'|'accepted'|'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT chk_follows_status  CHECK (status IN ('pending','accepted','rejected')),
  PRIMARY KEY(follower_id, following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);
-- follows는 Realtime 활성화됨 (070)
```

### notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  title TEXT,
  body TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_status VARCHAR(10),         -- 'pending'|'accepted'|'rejected'|NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_notif_type CHECK (notification_type IN (
    'level_up','bubble_join_request','bubble_join_approved',
    'follow_request','follow_accepted',
    'bubble_invite','bubble_new_record','bubble_member_joined',
    'reaction_like','comment_reply'
  )),
  CONSTRAINT chk_notif_action_status
    CHECK (action_status IS NULL OR action_status IN ('pending','accepted','rejected'))
);

CREATE INDEX idx_notifications_user
  ON notifications(user_id, is_read, created_at DESC);
```

---

## 5. 저장 필터 + CF 테이블

### saved_filters (홈 필터 프리셋)

> 필터 엔진 스키마의 SSOT. 필터 규칙 자체(attribute 정의/자동 공유 로직)는 `systems/BUBBLE_SYSTEM.md` 및 `systems/RECOMMENDATION.md` 담당.

```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
    -- 'restaurant'|'wine'|'bubble'|'bubbler'
    -- |'bubble_feed'|'bubble_ranking'|'bubble_member'
  context_id UUID,                  -- bubble_* 타입일 때 bubble_id
  rules JSONB NOT NULL,             -- 필터 규칙 배열
  sort_by VARCHAR(20),
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sf_target_type CHECK (target_type IN
    ('restaurant','wine','bubble','bubbler',
     'bubble_feed','bubble_ranking','bubble_member')),
  CONSTRAINT chk_sf_sort_by CHECK (sort_by IS NULL OR sort_by IN
    ('latest','score_high','score_low','name','visit_count'))
);

CREATE INDEX idx_saved_filters_user    ON saved_filters(user_id, target_type);
CREATE INDEX idx_saved_filters_context ON saved_filters(user_id, target_type, context_id)
  WHERE context_id IS NOT NULL;
```

### user_similarities (CF 적합도 캐시, 051)

```sql
CREATE TABLE user_similarities (
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant','wine')),

  similarity REAL NOT NULL DEFAULT 0,    -- 0~1 (적합도)
  confidence REAL NOT NULL DEFAULT 0,    -- 0~1 (신뢰도)
  n_overlap INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_a, user_b, category),
  CHECK (user_a < user_b)                -- 정규화: 항상 작은 ID가 앞
);

CREATE INDEX idx_sim_user_a ON user_similarities(user_a, category);
CREATE INDEX idx_sim_user_b ON user_similarities(user_b, category);
```

RLS: 본인이 포함된 쌍만 SELECT. 쓰기는 service_role (Edge Function `compute-similarity`).

### user_score_means (유저별 평균 점수 캐시, 051)

```sql
CREATE TABLE user_score_means (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant','wine')),

  mean_x REAL NOT NULL DEFAULT 50,
  mean_y REAL NOT NULL DEFAULT 50,
  record_count INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, category)
);
```

RLS: 모두 SELECT 가능 (예측에 필요). 쓰기는 service_role만.
갱신 시점: records INSERT/UPDATE/DELETE → `trg_notify_cf_update` (`078_cf_trigger_with_pg_net.sql`, 082에서 GUC 패턴 보강) → `compute-similarity` Edge Function.

---

## 6. 참조/시드 테이블

### area_zones (생활권 좌표)

> 시드 규모: 029에서 초기 **32개** 투입 후 036에서 반경 보정 + 다중 원 전환.
> **UNIQUE(name) 없음** — 같은 `name`으로 N개 행 INSERT하여 대형 상권(강남 3원: 강남역·논현/대치·도곡/개포·수서, 여의도 2원: IFC/국회)을 다중 원으로 커버. 근거: MAP_LOCATION §2.3.

```sql
CREATE TABLE area_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,            -- UNIQUE 제약 없음 (다중 원 허용)
  city VARCHAR(50) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INT NOT NULL DEFAULT 1500,   -- 반경 (미터)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_area_zones_city ON area_zones(city);
```

### restaurant_prestige (명성 — 미슐랭/블루리본/TV)

> 055에서 `restaurant_rp`로 도입 → 058에서 `restaurant_prestige`로 rename.

```sql
CREATE TABLE restaurant_prestige (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_name_norm TEXT NOT NULL,     -- 정규화된 이름
  prestige_type TEXT NOT NULL
    CHECK (prestige_type IN ('michelin','blue_ribbon','tv')),
  prestige_year INT,
  prestige_grade TEXT NOT NULL,           -- '3_star'|'2_star'|'1_star'|'bib'|'3_ribbon'|...
  region TEXT,
  area TEXT,
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  kakao_id TEXT,
  source_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_prestige_restaurant_id ON restaurant_prestige(restaurant_id);
CREATE INDEX idx_restaurant_prestige_name_norm     ON restaurant_prestige(restaurant_name_norm);
CREATE INDEX idx_restaurant_prestige_kakao_id      ON restaurant_prestige(kakao_id);
CREATE INDEX idx_restaurant_prestige_type          ON restaurant_prestige(prestige_type);
```

**restaurants.prestige 캐시 동기화**: `restaurant_prestige`에 INSERT/UPDATE/DELETE 발생 시
`trg_sync_restaurant_prestige_cache`(055 도입)가 해당 `restaurant_id`의 `restaurants.prestige` JSONB를 갱신. 캐시 형식: `[{"type":"michelin","grade":"1_star"}, ...]`

### restaurant_enrichment (캐시 — 083에서 추가)

회원 리뷰 없는 식당을 위한 **외부 정보 AI 요약 + 사진 폴백 캐시**. TTL 30일. 저작권 이슈 회피를 위해 **원문 저장 금지, 링크/메타/AI 생성물만**.

주요 컬럼:
- `sources` JSONB — 수집 소스 리스트 `[{id, type, url, title, snippet, fetched_at}]`. AI의 `source_ids` 역추적용.
- `ai_summary` JSONB — Gemini 1회 호출 결과. `{pros, cons, atmosphere, price_range, signatures[], overall_note}` 각 claim에 `source_ids` 필수.
- `external_ratings` JSONB — `{naver, google: {rating, count, url}}`.
- `photo_urls TEXT[]` — **Google Places Photo name** 그대로 (`places/X/photos/Y` 형식). 실제 URL은 `/api/places/photo?name=...` 프록시가 302 redirect로 반환 (API 키 노출 방지).
- `photo_attributions TEXT[]` — 각 사진당 attribution 문자열 ("Google" 등). `photo_urls`와 동일 길이 (CHECK 제약).
- `status` — `pending | processing | done | failed` 상태 머신.
- `expires_at` — 기본 `now() + 30일`. 이후 접근 시 재생성.
- `source_version INT` — 요약 템플릿 버전 (프롬프트 개선 시 일괄 재생성 트리거).

인덱스: `idx_enrichment_expires`(만료 스캔), `idx_enrichment_status`(진행 중/실패 모니터링).
트리거: `trg_restaurant_enrichment_updated_at` (BEFORE UPDATE, `updated_at` 자동 갱신).

**RLS**:
- `restaurant_enrichment_read_all` — 모든 유저(anon 포함) SELECT 허용 (공용 참조 데이터).
- INSERT/UPDATE/DELETE 정책 없음 → authenticated/anon 기본 DENY, service_role은 RLS bypass로 Edge Function만 쓰기 가능.

**Edge Function 파이프라인** (`enrich-restaurant`, 083 함께 배포):
1. `shouldSkip` — 30일 내 `done` 또는 5분 이내 `processing`이면 skip.
2. `status='processing'` upsert.
3. 병렬 수집: Tavily / Google Places (New v1 text search + details) / Naver Local.
4. 소스 인덱싱 (Google reviews → Naver Local → Tavily 순, 최대 15개).
5. **Gemini 1회 호출** — 시스템 프롬프트: "자료 없으면 추측 금지 + 각 claim에 source_ids 필수 + 20자 인용 제한 + 출력 JSON".
6. `status='done'` + 30일 TTL 저장. 실패 시 `status='failed'` + `error_message`.

**교차 참조**:
- 훅: `application/hooks/use-restaurant-enrichment.ts` (폴링 3초, status 전환 감지).
- UI: `presentation/components/detail/info-enrichment-block.tsx` (AI 요약 카드 + source_ids → 출처 칩).
- 사진 폴백: `restaurant-detail-container`의 히어로 사진 우선순위 체인의 최종 단계 (내 기록 → 공개 기록 → 카카오 시드 → **Google Places enrichment**).
- 프록시: `app/api/places/photo/route.ts` — photo_name → Google Photos API로 photoUri 조회 → 302 redirect.

### bubble_expertise (뷰)

> 055 이전부터 존재하는 **VIEW**. `bubble_members` + `xp_totals`를 JOIN하여 버블별 축(axis_type/axis_value) 전문성 집계.
> 컬럼: `(bubble_id, axis_type, axis_value, total_xp, max_level, avg_level, member_count)`.
> RLS는 기반 테이블에 적용되며, 뷰 자체는 별도 정책 없음.
> **082에서 `SECURITY INVOKER`로 재생성** — 기존 SECURITY DEFINER 모드는 뷰 호출자 권한을 우회하여 `xp_totals`/`bubble_members` RLS를 무력화할 수 있어 제거. 이후 뷰는 호출자의 RLS를 그대로 상속한다.

---

## 7. 와인 산지 cascade (WSET 공식 specification)

country → region → sub_region → appellation 4단계 cascade. 프론트엔드 드롭다운 및 Gemini 프롬프트의 값 제한에 사용.
대부분의 와인은 3단계(country/region/sub_region)까지. 4단계(appellation)는 Burgundy village AOC, Napa AVA, Barossa GI, South Africa Ward 등에만 적용.

출처: WSET Level 3 Specification Issue 2 (2022).

```yaml
France:
  Bordeaux:           [Médoc, Haut-Médoc, Saint-Estèphe, Pauillac, Saint-Julien, Margaux, Graves, Pessac-Léognan, Saint-Émilion, Pomerol, Sauternes, Barsac, Côtes de Bordeaux, Entre-Deux-Mers]
  South West France:  [Bergerac, Monbazillac, Cahors, Madiran, Jurançon, Côtes de Gascogne]
  Burgundy:
    Chablis:            []
    Côte de Nuits:      [Gevrey-Chambertin, Vougeot, Vosne-Romanée, Nuits-Saint-Georges]
    Côte de Beaune:     [Aloxe-Corton, Beaune, Pommard, Volnay, Meursault, Puligny-Montrachet, Chassagne-Montrachet]
    Côte Chalonnaise:   [Rully, Mercurey, Givry, Montagny]
    Mâconnais:          [Pouilly-Fuissé, Saint-Véran]
  Beaujolais:         [Brouilly, Fleurie, Morgon, Moulin-à-Vent]
  Alsace:             []
  Loire Valley:       [Muscadet, Anjou, Coteaux du Layon, Savennières, Saumur, Saumur-Champigny, Vouvray, Touraine, Bourgueil, Chinon, Sancerre, Pouilly-Fumé, Menetou-Salon]
  Rhône Valley:       [Côtes du Rhône, Côtes du Rhône Villages, Côte-Rôtie, Condrieu, Saint-Joseph, Hermitage, Crozes-Hermitage, Cornas, Châteauneuf-du-Pape, Gigondas, Vacqueyras, Lirac, Tavel]
  Southern France:    [Pays d'Oc, Languedoc, Minervois, Fitou, Corbières, Picpoul de Pinet, Côtes du Roussillon, Côtes du Roussillon Villages, Bandol, Côtes de Provence]

Germany:
  Mosel:              [Bernkastel, Wehlen, Piesport]
  Nahe:               [Schlossböckelheim]
  Rheingau:           [Rüdesheim, Johannisberg]
  Rheinhessen:        [Nierstein]
  Pfalz:              [Forst, Deidesheim]
  Baden:              []
  Franken:            []

Austria:
  Niederösterreich:   [Wachau, Weinviertel]
  Burgenland:         []

Hungary:
  Tokaj:              []

Greece:
  Naoussa:            []
  Nemea:              []
  Santorini:          []

Italy:
  Trentino-Alto Adige: [Trentino, Alto Adige]
  Friuli-Venezia Giulia: [Collio, Colli Orientali, Friuli Grave]
  Veneto:             [Valpolicella, Soave, Amarone della Valpolicella]
  Piedmont:           [Barolo, Barbaresco, Barbera d'Asti, Dolcetto d'Alba, Gavi]
  Tuscany:            [Chianti, Chianti Classico, Bolgheri, Brunello di Montalcino, Vino Nobile di Montepulciano]
  Marche:             [Verdicchio dei Castelli di Jesi]
  Umbria:             [Orvieto]
  Lazio:              [Frascati]
  Abruzzo:            [Montepulciano d'Abruzzo]
  Campania:           [Taurasi, Fiano di Avellino, Greco di Tufo]
  Puglia:             [Salice Salentino]
  Basilicata:         [Aglianico del Vulture]
  Sicily:             [Etna]

Spain:
  The Upper Ebro:     [Rioja, Navarra, Calatayud, Cariñena]
  Catalunya:          [Priorat, Catalunya, Penedès]
  The Duero Valley:   [Ribera del Duero, Toro, Rueda]
  The North West:     [Rías Baixas, Bierzo]
  The Levante:        [Valencia, Jumilla, Yecla]
  Castilla-La Mancha: [La Mancha, Valdepeñas]
  Castilla y León:    []

Portugal:
  Vinho Verde:        []
  Douro:              []
  Dão:                []
  Bairrada:           []
  Alentejo:           []
  Lisboa:             []
  Alentejano:         []

USA:
  California:
    Napa Valley:        [Rutherford, Oakville, Stags Leap District, Howell Mountain, Mt. Veeder, Los Carneros, St. Helena, Calistoga]
    Sonoma County:      [Russian River Valley, Alexander Valley, Dry Creek Valley, Sonoma Coast]
    Mendocino County:   []
    Santa Cruz Mountains: []
    Monterey:           []
    Paso Robles:        []
    Santa Maria Valley: []
    Lodi:               []
  Oregon:             [Willamette Valley]
  Washington:         [Columbia Valley, Yakima Valley]
  New York:           [Finger Lakes]

Canada:
  Ontario:            [Niagara Peninsula]
  British Columbia:   [Okanagan Valley]

Chile:
  Coquimbo Region:    [Elqui Valley, Limarí Valley]
  Aconcagua Region:   [Casablanca Valley, San Antonio Valley, Leyda Valley, Aconcagua Valley]
  Central Valley:     [Maipo Valley, Cachapoal Valley, Colchagua Valley, Curicó Valley, Maule Valley]
  Southern Region:    []

Argentina:
  Salta:              [Cafayate]
  San Juan:           []
  Mendoza:            [Uco Valley, Luján de Cuyo, Maipú]
  Patagonia:          []

South Africa:
  Coastal Region:     [Stellenbosch, Paarl, Constantia, Durbanville, Swartland]
  Breede River Valley: [Worcester, Robertson]
  Cape South Coast:
    Walker Bay:         [Hemel-en-Aarde Wards]
    Elim:               []
    Elgin:              []

Australia:
  South Eastern Australia: [Murray-Darling, Riverina, Riverland]
  South Australia:
    Barossa:            [Barossa Valley, Eden Valley]
    Clare Valley:       []
    Adelaide Hills:     []
    McLaren Vale:       []
    Coonawarra:         []
  Victoria:           [Yarra Valley, Geelong, Mornington Peninsula, Heathcote, Goulburn Valley]
  New South Wales:    [Hunter Valley]
  Tasmania:           []
  Western Australia:  [Margaret River, Great Southern]

New Zealand:
  North Island:       [Gisborne, Hawke's Bay, Martinborough]
  South Island:       [Marlborough, Nelson, Canterbury, Central Otago]
```

### 버블 와인/식당 연동 조회 패턴

> **bubble_shares가 제거됨(068)**에 따라, "같은 버블에서 같은 와인을 마신 멤버 조회"는 `bubble_items` + `bubble_members` + `records` JOIN 패턴을 사용한다.

```sql
-- 같은 버블의 다른 멤버 중 같은 와인을 기록한 사람 조회
SELECT r.user_id, u.nickname, u.avatar_url,
       r.satisfaction, r.comment, r.purchase_price
FROM records r
  JOIN users u           ON u.id = r.user_id
  JOIN bubble_members bm ON bm.user_id = r.user_id AND bm.status = 'active'
  JOIN bubble_items bi
    ON  bi.bubble_id = bm.bubble_id
    AND bi.target_id = r.target_id
    AND bi.target_type = r.target_type
WHERE r.target_id = :wine_id
  AND r.target_type = 'wine'
  AND bm.bubble_id IN (
    SELECT bubble_id FROM bubble_members
    WHERE user_id = :my_user_id AND status = 'active'
  )
  AND r.user_id != :my_user_id;
```

---

## 8. 상황/식사시간/페어링 ENUM

### 식당 상황 태그 (records.scene)
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼밥 | `#7A9BAE` (슬레이트) |
| `romantic` | 데이트 | `#B8879B` (더스티 로즈) |
| `friends` | 친구 | `#7EAE8B` (세이지) |
| `family` | 가족 | `#C9A96E` (머스타드) |
| `business` | 회식 | `#8B7396` (모브) |
| `drinks` | 술자리 | `#B87272` (로즈우드) |

### 와인 상황 태그 (records.scene, target_type='wine')
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼술 | `#7A9BAE` |
| `romantic` | 데이트 | `#B8879B` |
| `gathering` | 모임 | `#7EAE8B` |
| `pairing` | 페어링 | `#C9A96E` |
| `gift` | 선물 | `#8B7396` |
| `tasting` | 테이스팅 | `#B87272` |
| `decanting` | 디캔팅 | `#A0896C` (웜 브라운) |

> ※ 와인 `solo`/`romantic`은 식당 색상 재사용 (DESIGN_SYSTEM §1 주석과 정합).
> 색상은 `systems/DESIGN_SYSTEM.md`의 상황 태그 색상과 동기. Tailwind 원색 직사용 금지.

### 식사시간 ENUM (records.meal_time)
| 값 | 표시명 | 참고 |
|----|--------|------|
| `breakfast` | 아침 | ~11:00 |
| `lunch` | 점심 | 11:00~15:00 |
| `dinner` | 저녁 | 15:00~ |
| `snack` | 간식 | 비정규 |

### camera_mode ENUM (records.camera_mode — 와인 전용)
| 값 | 표시명 | OCR 결과 구조 |
|----|--------|---------------|
| `individual` | 개별 | `{wine_name, vintage, producer, region}` |
| `shelf` | 진열장 | `{wines:[{name, price, position}]}` |
| `receipt` | 영수증 | `{items:[{name, price, qty}], total, store}` |

### 페어링 카테고리 (records.pairing_categories TEXT[], WSET 기반)
| 값 | 표시명 | 예시 |
|----|--------|------|
| `red_meat` | 적색육 | 스테이크, 양갈비, 오리 |
| `white_meat` | 백색육 | 닭, 돼지, 송아지 |
| `seafood` | 어패류 | 생선, 갑각류, 굴 |
| `cheese` | 치즈·유제품 | 숙성 치즈, 블루, 크림소스 |
| `vegetable` | 채소·곡물 | 버섯, 트러플, 리조또, 파스타 |
| `spicy` | 매운·발효 | 커리, 마라, 김치 |
| `dessert` | 디저트·과일 | 다크초콜릿, 타르트 |
| `charcuterie` | 샤퀴트리·견과 | 하몽, 살라미, 아몬드 |

> `wines.food_pairings` (DB 기본 추천)과 `records.pairing_categories` (사용자 실제 경험)는 독립 필드.

### 식당 장르 (restaurants.genre)
`한식 / 일식 / 중식 / 태국 / 베트남 / 인도 / 이탈리안 / 프렌치 / 스페인 / 지중해 / 미국 / 멕시칸 / 카페 / 바/주점 / 베이커리 / 기타`

6대분류(UI 그룹핑): 동아시아 · 동남아·남아시아 · 유럽 · 아메리카 · 음료·디저트 · 기타.

---

## 9. 시드 데이터 (온보딩)

- 온보딩용 대표 식당 시드는 `supabase/seed.sql` 참조 (미슐랭/블루리본 + 외부 평점 상위, 지역별).
- 와인은 온보딩 시드 불필요 (사진 인식 + 검색으로 전체 와인 DB 활용).

---

## 10. 비정규화 업데이트 전략

### 트리거 (실시간 — 증분 `col = col ± 1` 또는 재계산)

| 트리거 | 대상 | 동작 |
|--------|------|------|
| `after_record_count` | records INS/DEL | `users.record_count` ± 1 |
| `after_follow_counts` | follows INS/UPD/DEL | `users.follower_count` / `following_count` 갱신 |
| `after_bubble_member_count` | bubble_members INS/UPD/DEL | `bubbles.member_count` (owner/admin/member), `follower_count` (follower) |
| `after_bubble_item_stats` (054) | bubble_items INS/DEL | `bubbles.record_count` / `unique_target_count` / `last_activity_at` |
| `update_bubble_member_item_stats` (078) | bubble_items INS/DEL | 해당 타겟 기록 있는 active 멤버만 `bubble_members.member_unique_target_count` / `weekly_share_count` / `avg_satisfaction` 갱신 |
| `cleanup_bubble_items_before_record_delete` (078) | records BEF DEL | 타겟에 다른 활성 멤버 기록 없으면 `bubble_items` 삭제 |
| `cleanup_bubble_items_on_member_leave` (078) | bubble_members UPD status | 탈퇴 멤버의 기록 타겟 중 다른 활성 멤버 기록 없는 bubble_items 삭제 |
| `trg_sync_restaurant_prestige_cache` (055) | restaurant_prestige INS/UPD/DEL | `restaurants.prestige` JSONB 재구축 |
| `trg_restaurants_geom` (062) | restaurants BEF INS/UPD (lat/lng) | `restaurants.geom` 자동 동기화 |
| `after_record_cf_insert/update/delete` (`078_cf_trigger_with_pg_net.sql`) | records INS/UPD (axis_x/axis_y)/DEL | `pg_net`으로 Edge Function `compute-similarity` 호출 |
| `trg_notify_cf_update` (078 → **082 보강**) | 위 트리거들의 공용 함수 | **082**: 하드코딩 JWT → `current_setting('app.service_role_key', true)` + `current_setting('app.supabase_url', true)` GUC 패턴 전환. GUC 미설정 시 `http_post` 호출을 스킵하여 CF 동기화 무음 종료 (INSERT/UPDATE 자체는 막지 않음). service_role 키 회전 후 `ALTER DATABASE postgres SET app.service_role_key TO '...'` 1회 실행 필요. |

> **제거된 트리거**: `after_bubble_share_stats`, `trg_bubble_share_member_stats` (054에서 bubble_items 트리거로 교체).

### 크론 (일/주간)

| 크론 잡 | 주기 | 대상 |
|---------|------|------|
| `daily-refresh-active-xp` (021) | 매일 04:00 KST | `refresh-active-xp` Edge Function → users.active_xp/active_verified |
| `weekly-ranking-snapshot` (019) | 매주 월 00:00 UTC | `weekly-ranking-snapshot` Edge Function → bubble_ranking_snapshots + weekly_record_count 롤링 |
| `daily-process-account-deletion` (023) | 매일 09:30 KST | `process-account-deletion` Edge Function → 만료된 soft-delete 계정 처리 |

---

## 11. Database Functions (RPC)

### 11.1 XP 관련

- **increment_user_total_xp** (017): `users.total_xp` 원자적 증가. authenticated는 0~500 제한, service_role 제한 없음.
- **upsert_user_experience** (017): `xp_totals` INSERT ON CONFLICT UPDATE. 축별 XP+레벨 갱신.
- **refresh_active_xp** (021): 6개월 기준 active_xp/active_verified 일괄 갱신 (크론).
- **get_unique_count** / **get_record_count_by_axis** / **get_revisit_count_by_axis** (022): LevelDetailSheet용 축별 집계.

### 11.2 식당/지도

- **restaurants_within_radius** (014): PostGIS 반경 검색 (lat, lng, radius_m).
- **normalize_restaurant_name**: 공백/특수문자 제거, 소문자 변환.
- **search_restaurants_in_bounds** (010→061): 초기 범위 검색. 레거시 (현재 코드는 3-way split 사용). 시그니처에 여전히 `has_bookmark BOOLEAN` 존재할 수 있으므로 호출 시 주의.
- **search_restaurants_bounds_simple / auth / source** (062 → 064 → 072): 지도뷰 3-way RPC. `p_sort`: `'name' | 'distance' | 'score_high'`. `p_user_lat/lng`로 거리순 정렬.
  - `simple`: 비로그인 전용. SQL language 인라인.
  - `auth`: 로그인 + source 없음. `my_score` SMALLINT (records.satisfaction 평균) 반환.
  - `source`: source 필터 (`'mine' | 'following' | 'bubble'`) 적용. bookmarks 참조 제거됨 (063).
  - 주의: 여기서의 `source`(쿼리 enum: `mine | following | bubble` — "어떤 집합에서 가져올지")와 `domain/constants/source-priority.ts`의 `SOURCE_PRIORITY`(점수 폴백 우선순위: `mine | nyam | bubble` — "어떤 점수로 대표할지")는 **서로 다른 개념**이다. 혼용 금지.
- **upsert_crawled_restaurants(items JSONB)** (056): 카카오 크롤링 배치 UPSERT RPC.
  - **ON CONFLICT 키**: `external_id_kakao` 컬럼 (partial UNIQUE, WHERE NOT NULL). 056 초기 정의는 JSONB 경로(`external_ids->>'kakao'`) 기반이었으나 이후 개별 컬럼(`restaurants.external_id_kakao`)으로 전환됨.
  - ⚠ **경고**: JSONB→컬럼 전환 마이그레이션 파일이 **별도로 커밋되어 있지 않으며**, 본 SSOT 스키마(L183)와 크롤링 스크립트(`DB/카카오_크롤링/crawl_kakao.py`)·리포지토리 코드로만 반영된 상태. 향후 마이그레이션으로 정식 이관 필요. 근거: MAP_LOCATION §6.4.

### 11.3 홈뷰 필터

- **filter_home_restaurants** (061): target_id[] + 메타 필터 (`genre/district/area/prestige/price_range`) + `name` 정렬 + `LIMIT/OFFSET`.
  반환: `(id,name,genre,district,area,city,country,lat,lng,price_range,prestige,photos)`.
- **filter_home_wines** (061): target_id[] + 메타 필터 (`wine_type/variety/country/vintage/acidity/sweetness`). `vintage_op`: `'eq' | 'lte'`.
  반환: `(id,name,wine_type,variety,country,region,sub_region,vintage,photos,producer,acidity_level,sweetness_level)`.

### 11.4 소셜

- **is_mutual_follow** (061): 양방향 accepted를 단일 쿼리로 확인.
- **follow_counts** (069): followers/following/mutual 카운트를 단일 RPC로 반환.

### 11.5 프라이버시 (미구현)

- **get_visible_fields**: AUTH.md 스펙 기반 프라이버시 캐스케이드 해석 함수 — 스펙만 존재, 마이그레이션 미적용.

---

## 11.5. 인덱스 전략

> 근거: `_archive/개념문서_원본/DB_인덱싱_전략.md`, `DB_쿼리_리팩토링_구현계획.md`
> 마이그레이션: `059_query_optimization_indexes.sql`, `061_query_optimization_functions.sql`, `078_drop_bubble_items_added_by.sql`

### 쿼리 코딩 규칙 (R-SEARCH ~ R-MUTUAL)
| 규칙 | 내용 |
|------|------|
| R-SEARCH | ILIKE 사용 컬럼은 GIN trgm 인덱스 필수 |
| R-ENUM   | SSOT 고정값(genre/wine_type 등)은 EQ만. ILIKE 금지 |
| R-FILTER | DB 컬럼 기반 필터는 SQL WHERE |
| R-PAGINATE | 20건 초과 가능 목록은 DB LIMIT/OFFSET |
| R-SELECT | 필요 컬럼만 (`SELECT *` 금지) |
| R-COUNT  | 자주 쓰는 COUNT는 캐시 컬럼 |
| R-MUTUAL | 관계 확인은 단일 JOIN. 왕복 여러 번 금지 |

### 테이블별 인덱스 현황

**restaurants**
| 인덱스 | 타입 | 용도 |
|--------|------|------|
| `restaurants_pkey` | btree(id) | PK |
| `idx_restaurants_name_trgm` | GIN trgm(name) | 텍스트 검색 |
| `idx_restaurants_address_trgm` | GIN trgm(address) | 텍스트 검색 |
| `idx_restaurants_geom` | GiST(geom) | 공간 (062) |
| `idx_restaurants_genre` / `genre_name` | btree | 필터/정렬 |
| `idx_restaurants_district` | btree | 필터 |
| `idx_restaurants_area` / `area_gin` | btree + GIN | EQ + ANY() |
| `idx_restaurants_prestige` | GIN JSONB | 명성 필터 |
| `idx_restaurants_last_crawled` | btree | 크롤러 관리 (056) |
| `idx_restaurants_external_id_kakao/google/naver` | UNIQUE btree partial | 외부 ID 매칭 |

**wines**
| 인덱스 | 타입 |
|--------|------|
| `wines_pkey` / `idx_wines_name_trgm` / `producer_trgm` | PK + GIN trgm |
| `idx_wines_type_name` / `variety` / `country` | btree |
| `idx_wines_region` | btree(country, region, sub_region, appellation) — 산지 4단계 |

**records**
| 인덱스 | 타입 |
|--------|------|
| `idx_records_user_type_date` | btree(user_id, target_type, visit_date DESC) — 홈뷰 |
| `idx_records_target` / `target_date` | btree — 상세 페이지 |
| `idx_records_satisfaction` | btree partial (satisfaction IS NOT NULL) |
| `idx_records_target_user` (078) | btree(target_id, target_type, user_id) — 트리거 가속 |

**bubble_members**
- `idx_bubble_members_active` / `idx_bubble_members_user` / `idx_bubble_members_bubble_status_user`(078)

**follows**
- `follows_pkey`, `idx_follows_reverse`, `idx_follows_follower_accepted`, `idx_follows_following_accepted`

**comments / reactions / bubble_items / bubble_photos**
- `idx_comments_target` / `idx_comments_parent`(081)
- `idx_reactions_target`
- `idx_bubble_items_bubble_target`
- `idx_bubble_photos_bubble`

### 성능 측정 기준점 (2026-04-12, restaurants 133K행)
| 쿼리 | Before | After | 개선 |
|------|--------|-------|------|
| 텍스트 검색 "트라토리아" | 643ms | 9.6ms | 67x |
| 지도뷰 genre="이탈리안" (RPC) | 713ms | 1.7ms | 419x |
| 홈뷰 genre+district | 34ms | 4.2ms | 8x |

---

## 11.6. Storage Buckets

> 상세 정책은 `AUTH.md §6` 참조. 본 절은 버킷 목록과 공개/비공개 정책 요약만 제공한다.

| 버킷 | 공개 여부 | 용도 | 비고 |
|------|----------|------|------|
| `avatars` | public (객체 직접 URL 접근 허용) | 사용자 프로필 사진 | 082에서 익명 LIST 정책 제거 |
| `record-photos` | public (객체 직접 URL 접근 허용) | 기록 첨부 사진 (`record_photos.url`이 가리키는 실제 오브젝트) | 082에서 익명 LIST 정책 제거 |

### 082에서 제거된 Storage LIST 정책 (이력 통합)
`storage.objects`의 3개 anonymous LIST 정책을 일괄 제거했다 — 공개 버킷의 객체 직접 URL 접근은 유지되며, **익명 사용자의 버킷 열람(LIST)만 차단**된다.

- `Public read access for avatars` — DROP
- `Public read access for record photos` — DROP
- `Anyone can view record photos` — DROP

→ §13 "삭제된 테이블 이력"에도 동일 내용이 중복 기록되어 있음 (추적성 목적).

---

## 12. RLS 전략

### 원칙
- **모든 테이블 RLS 활성화**.
- `SECURITY DEFINER` 함수 사용 **절대 금지** (단, 트리거 함수는 예외적으로 허용 — 078의 `cleanup_bubble_items*`, `trg_notify_cf_update` 등 제한적으로 사용).
- RPC 함수 기본값은 `SECURITY INVOKER`.
- **뷰는 `WITH (security_invoker = true)` 강제** (082에서 `bubble_expertise` 적용 — 뷰 호출자가 기반 테이블 RLS를 그대로 상속해야 함).
- **`SECURITY DEFINER` 함수는 `SET search_path = public, pg_temp` 필수** (082에서 19개 함수 일괄 적용 — `refresh_active_xp` / `sync_restaurant_geom` / `sync_restaurant_prestige_cache` / `trg_update_follow_counts` / `trg_update_user_record_count_v2` / `trg_notify_cf_update` / `prevent_role_self_promotion` / `normalize_restaurant_name` / `is_mutual_follow` / `follow_counts` / `increment_user_total_xp` / `upsert_user_experience` / `upsert_crawled_restaurants` / `restaurants_within_radius` / `filter_home_restaurants` / `filter_home_wines` / `search_restaurants_in_bounds` / `search_restaurants_bounds_simple` / `_auth` / `_source`). mutable search_path를 통한 schema injection 방지.
- 멤버십 확인은 PK `(bubble_id, user_id)` 인덱스 활용 → O(1).

### 핵심 정책 (현재 적용 상태)

```sql
-- users: 본인 + public + 버블 co-member (047)
CREATE POLICY users_own    ON users FOR ALL    USING (id = auth.uid());
CREATE POLICY users_public ON users FOR SELECT USING (is_public = true);
CREATE POLICY users_bubble ON users FOR SELECT USING (
  NOT is_public
  AND id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);

-- restaurants / wines: 인증 사용자 R/W (변경 없음)
CREATE POLICY restaurants_select ON restaurants FOR SELECT USING (auth.uid() IS NOT NULL);

-- records: 본인 + public + 팔로워(047) + 버블 멤버(033). **082에서 스펙 정렬 완료**.
-- 082 DROP: `records_authenticated_read` (qual=true — 로그인 사용자 전체 노출, private_note/purchase_price 유출)
--           `records_bubble_shared`       (077에서 dead policy화 이후 082에서 정리)
-- 082에서 AUTH.md §4-5 스펙(records_public / records_followers / records_bubble_member_read)으로 재정렬.
CREATE POLICY records_own    ON records FOR ALL    USING (user_id = auth.uid());
CREATE POLICY records_public ON records FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE is_public = true)
);
CREATE POLICY records_followers ON records FOR SELECT USING (
  user_id IN (
    SELECT f.following_id FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = auth.uid()
      AND f.status = 'accepted'
      AND u.follow_policy != 'blocked'
  )
);
CREATE POLICY records_bubble_member_read ON records FOR SELECT USING (
  user_id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);
-- (삭제) `records_bubble_shared` — 068에서 bubble_items 기반으로 재작성되었으나
-- 077에서 `bubble_items.record_id` 컬럼이 제거되며 사실상 dead policy가 됨.
-- 같은 버블 멤버의 기록 열람은 `records_bubble_member_read`가 커버하므로 기능적 영향 없음.
-- **082에서 DROP**. (§13 이력 참조)

-- bubbles: 공개/비공개/오너 3종 (025)
CREATE POLICY bubble_public     ON bubbles FOR SELECT USING (visibility = 'public');
CREATE POLICY bubble_private    ON bubbles FOR SELECT USING (visibility = 'private' AND ...);
CREATE POLICY bubble_owner_read ON bubbles FOR SELECT USING (created_by = auth.uid());

-- bubble_items (053 → 071 UPDATE → 078 DELETE 재작성)
CREATE POLICY bubble_items_select_members ON bubble_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM bubble_members bm
          WHERE bm.bubble_id = bubble_items.bubble_id
            AND bm.user_id = auth.uid() AND bm.status = 'active')
);
CREATE POLICY bubble_items_select_followers ON bubble_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM bubble_members bm JOIN bubbles b ON b.id = bm.bubble_id
          WHERE bm.bubble_id = bubble_items.bubble_id
            AND bm.user_id = auth.uid()
            AND bm.role = 'follower' AND b.visibility = 'public')
);
CREATE POLICY bubble_items_insert_members ON bubble_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bubble_members bm
          WHERE bm.bubble_id = bubble_items.bubble_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
            AND bm.role IN ('owner','admin','member'))
);
CREATE POLICY bubble_items_update_members ON bubble_items FOR UPDATE USING (...) WITH CHECK (...);
CREATE POLICY bubble_items_delete ON bubble_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM bubble_members bm
          WHERE bm.bubble_id = bubble_items.bubble_id
            AND bm.user_id = auth.uid()
            AND bm.status = 'active'
            AND bm.role IN ('owner','admin','member'))
);  -- 078에서 added_by 제거 후 "활성 멤버면 삭제 가능"으로 완화됨

-- bubble_photos (067): 멤버 or public 버블 SELECT, 멤버 INSERT, 업로더/오너 DELETE

-- comments (080, 081)
CREATE POLICY comments_bubble ON comments FOR SELECT USING (
  bubble_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM bubble_members bm
    WHERE bm.bubble_id = comments.bubble_id
      AND bm.user_id = auth.uid() AND bm.status = 'active'
  )
);
CREATE POLICY comments_non_bubble_read   ON comments FOR SELECT
  USING (bubble_id IS NULL AND auth.uid() IS NOT NULL);     -- 080
CREATE POLICY comments_non_bubble_insert ON comments FOR INSERT
  WITH CHECK (bubble_id IS NULL AND user_id = auth.uid()); -- 080
CREATE POLICY comments_non_bubble_delete ON comments FOR DELETE
  USING (bubble_id IS NULL AND user_id = auth.uid());      -- 080

-- reactions: 같은 target을 볼 수 있는 사람은 리액션 읽기 가능, 본인만 자기 리액션 CUD
-- CF 테이블: user_similarities는 본인 포함 쌍 SELECT, user_score_means는 public SELECT. 쓰기 service_role만.
-- notifications: 본인 SELECT/UPDATE. INSERT는 043_notifications_insert_policy.sql 참조.
-- saved_filters: 본인 CRUD.
-- record_photos: 기록 본인 + public 기록 + 팔로워 + 같은 버블 멤버 (048)
-- XP 테이블: 본인 CRUD + public 사용자 SELECT
-- follows: Realtime 활성화됨 (070)
```

> **제거된 정책**: 063에서 `bookmarks_own`, 068에서 `bubble_share_read/insert/delete`, **082에서 `records_authenticated_read` / `records_bubble_shared`**.
>
> **제거된 Storage 정책 (082)**: `storage.objects`의 3개 anonymous LIST 정책 제거 — `Public read access for avatars`, `Public read access for record photos`, `Anyone can view record photos`. 공개 버킷의 객체 직접 URL 접근은 유지되며 익명 LIST(버킷 열람)만 차단된다.

---

## 13. 삭제된 테이블 이력 (참고용)

| 테이블 | 삭제 시점 | 대체 |
|--------|----------|------|
| `wishlists` | 032 | 초기에 lists(status='wishlist') → 이후 bookmarks → 최종적으로 1인 비공개 버블(현재) |
| `lists` | — | `000_schema_reference.sql` 참조용에만 존재, 실제 CREATE/DROP 마이그레이션 없음. `records`가 직접 restaurants/wines 참조, 찜은 bookmarks(이후 제거) |
| `bubble_share_reads` | 031, 068에서 CASCADE 재삭제 | 읽음 추적 불필요 |
| `nudge_history`, `nudge_fatigue` | 031 | 넛지 UX 제거 |
| `grape_variety_profiles` | 031 | SSOT 파일(WSET yaml)로 대체 |
| `ai_recommendations` | 031 | 실시간 SQL/CF로 대체 |
| `records_old` (마이그레이션 백업) | 032 | — |
| `restaurant_accolades` | 055/058 | `restaurant_prestige`로 재설계 |
| `bookmarks` | **063** | 1인 비공개 버블 / `bubble_items` |
| `bubble_shares` | **068** | `bubble_items` (target 단위) + `records` 조합 |
| `bubble_items.source` | **076** | auto/manual 구분 불필요, 순수 큐레이션 |
| `bubble_items.record_id` | **077** | target_id + user_id 조합으로 충분 |
| `bubble_items.added_by` | **078** | 멤버십은 bubble_members에서 확인, "소유" 개념 제거 |
| `records_authenticated_read` (RLS 정책) | **082** | qual=true로 로그인 사용자 전체에 private_note/purchase_price 노출 → AUTH.md §4-5 스펙(public/followers/bubble_member) 정상 적용 |
| `records_bubble_shared` (RLS 정책) | **082** | 077에서 `bubble_items.record_id` 제거 후 dead policy. 기능은 `records_bubble_member_read`가 커버 |
| Storage LIST 정책 3종 | **082** | `storage.objects`의 `Public read access for avatars`/`... for record photos`/`Anyone can view record photos` 제거. 공개 버킷 직접 URL 접근은 유지, 익명 LIST만 차단 |

> **Edge Function 잔재 확인 필요**: `supabase/functions/process-account-deletion/index.ts`가 과거 `bookmarks` / `wishlists` / `bubble_shares`를 참조했을 수 있음 — 현재 코드 점검 권장 (WORKLOG 참고).
