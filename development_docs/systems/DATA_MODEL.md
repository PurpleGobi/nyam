# DATA_MODEL — 데이터 모델

> affects: 모든 페이지, 모든 시스템

---

## 1. 핵심 엔티티 관계

```
users (1) ─── (N) records
users (1) ─── (N) wishlists
users (1) ─── (N) user_experience

restaurants (1) ─── (N) records (target_type='restaurant')
wines (1) ─── (N) records (target_type='wine')

records (1) ─── (N) record_photos
records (1) ─── (N) bubble_shares ─── (N) bubbles
records (1) ─── (N) comments
records (1) ─── (N) reactions

bubbles (1) ─── (N) bubble_members ─── (N) users
users (1) ─── (N) follows ─── (N) users
users (1) ─── (N) notifications
```

---

## 2. 테이블 정의

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  nickname VARCHAR(20) NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(100),
  preferred_areas TEXT[],           -- 온보딩에서 선택한 동네
  privacy_profile VARCHAR(20) DEFAULT 'bubble_only',  -- 'public' | 'bubble_only' | 'private'
  privacy_records VARCHAR(20) DEFAULT 'shared_only',  -- 'shared_only' | 'all' | 'private'
  show_bubbles BOOLEAN DEFAULT true,
  show_levels BOOLEAN DEFAULT true,
  show_quadrant BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### restaurants
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  area VARCHAR(50),                -- 생활권 동네명 (광화문, 을지로 등)
  district VARCHAR(50),            -- 구 (종로구, 강남구 등)
  genre VARCHAR(30),               -- CHECK: 한식/일식/양식/중식/이탈리안/프렌치/동남아/멕시칸
  price_range INT,                 -- 1~4 (₩~₩₩₩₩)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,                     -- {"mon": "11:00-22:00", ...}
  photos TEXT[],

  -- 외부 평점
  naver_rating DECIMAL(2,1),
  kakao_rating DECIMAL(2,1),
  google_rating DECIMAL(2,1),

  -- 권위 인증
  michelin_stars INT,              -- NULL or 1,2,3
  blue_ribbon BOOLEAN DEFAULT false,
  media_appearances JSONB,         -- TV출연 등 [{"show":"흑백요리사","season":"S1","year":2024}]

  -- 캐싱 관리
  external_ids JSONB,              -- {"kakao": "...", "naver": "...", "google": "..."}
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,     -- 2주 갱신 스케줄

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 가격대 필터 매핑: price_range 1=~2만, 2=2~5만, 3=5~10만, 4=10만+

CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(
  ST_MakePoint(lng, lat)
);
```

### wines
```sql
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer VARCHAR(100),           -- 와이너리/생산자
  region VARCHAR(100),             -- 산지 (Bordeaux, Napa Valley 등)
  sub_region VARCHAR(100),         -- 세부 산지 (Médoc, Pauillac 등) — 산지 지도 드릴다운용 (국가→산지→세부산지)
  country VARCHAR(50),             -- 국가
  variety VARCHAR(100),            -- 대표 품종 (단일 품종 와인용, 블렌드는 grape_varieties 참조)
  grape_varieties JSONB,           -- 블렌드 비율 포함 품종 배열. [{"name":"Cabernet Sauvignon","pct":60},{"name":"Merlot","pct":40}]
  type VARCHAR(20) NOT NULL,       -- 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
  vintage INT,                     -- 빈티지 연도 (NULL = NV)
  abv DECIMAL(3,1),               -- 알코올 도수
  label_image_url TEXT,

  -- 와인 DB 메타
  body_level INT,                  -- 1~5 (DB 기준, 사용자 평가와 별개)
  acidity_level INT,               -- 1~3 (1=낮음, 2=중간, 3=높음)
  sweetness_level INT,             -- 1~3 (1=드라이, 2=오프드라이, 3=스위트)
  food_pairings TEXT[],            -- ["steak", "lamb", "cheese"]
  serving_temp VARCHAR(20),        -- "16-18°C"
  decanting VARCHAR(30),            -- "2시간 권장" 등

  external_id VARCHAR(100),
  cached_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wines_type ON wines(type);
CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_region ON wines(country, region, sub_region);  -- 산지 지도 드릴다운 쿼리용
```

### records (핵심 테이블)
```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,         -- restaurant_id or wine_id
  target_type VARCHAR(10) NOT NULL, -- 'restaurant' | 'wine'

  -- 상태
  status VARCHAR(10) DEFAULT 'rated', -- 'checked' | 'rated' | 'draft'

  -- 와인 분류 (와인 기록 전용) — 시음/셀러/찜 3분류
  wine_status VARCHAR(10),         -- 'tasted' | 'cellar' | 'wishlist' (target_type='wine'일 때만 사용)
                                   -- tasted: 시음 완료, cellar: 보유 와인, wishlist: 관심 와인(찜)

  -- 카메라 모드 메타데이터 (와인 기록 전용) — 촬영 방식별 OCR 결과 저장
  camera_mode VARCHAR(10),         -- 'individual' | 'shelf' | 'receipt' (개별/진열장/영수증)
  ocr_data JSONB,                  -- 카메라 모드별 OCR 인식 결과
                                   -- individual: {"wine_name":"...", "vintage":"...", "producer":"..."}
                                   -- shelf: {"wines":[{"name":"...", "price":...}, ...]}
                                   -- receipt: {"items":[{"name":"...", "price":..., "qty":1}], "total":...}

  -- 사분면 (본 기록은 필수, 온보딩 기록은 NULL 허용)
  axis_x DECIMAL(5,2),             -- 0~100 (식당: 가격%, 와인: 산미%)
  axis_y DECIMAL(5,2),             -- 0~100 (식당: 분위기%, 와인: 바디%)
  satisfaction INT,                 -- 1~100 (점 크기)
  scene VARCHAR(20),               -- 상황 태그

  -- 와인 전용
  aroma_regions JSONB,             -- 향 팔레트 칠한 영역 좌표
  aroma_labels TEXT[],             -- 자동 추출된 향 라벨
  aroma_color VARCHAR(7),          -- 점 대표 색상 hex
  complexity INT,                  -- 0~100 (단순↔복합, 슬라이더)
  finish DECIMAL(5,2),             -- 여운 0~100
  balance DECIMAL(5,2),            -- 균형 0~100
  auto_score INT,                  -- 자동 산출 만족도

  -- 확장 (선택)
  comment VARCHAR(200),            -- 한줄평
  menu_tags TEXT[],                -- 추천 메뉴/페어링 메모
  pairing_categories TEXT[],        -- WSET 페어링 카테고리 ['red_meat','cheese',...] — 와인 기록 전용
  tips TEXT,                       -- 사용팁
  companions TEXT[],               -- 함께 간 사람
  companion_count INT,              -- 동반자 수 (1=혼자, 2, 3, 4, 5+) — 필터용
  price INT,                       -- 가격 (원) — 식당 결제 금액
  purchase_price INT,              -- 구매 가격 (원) — 와인 구매/병 단가. 월별 소비 추적용

  -- 날짜
  visit_date DATE,                 -- 방문/음용 날짜

  -- 연결
  linked_restaurant_id UUID REFERENCES restaurants(id),  -- 와인 기록의 식당 연결
  linked_wine_id UUID REFERENCES wines(id),              -- 식당 기록의 와인 연결

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_records_user ON records(user_id);
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_scene ON records(scene);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_wine_status ON records(user_id, wine_status) WHERE target_type = 'wine';  -- 와인 탭 3분류 필터
CREATE INDEX idx_records_purchase ON records(user_id, visit_date, purchase_price) WHERE purchase_price IS NOT NULL;  -- 월별 소비 집계
```

### record_photos
```sql
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### wishlists
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,  -- 'restaurant' | 'wine'
  visited BOOLEAN DEFAULT false,
  -- 기록 생성 시 동일 target의 wishlist.visited = true로 자동 업데이트 (트리거 또는 application layer)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);
```

---

## 3. 경험치 관련 테이블

→ 상세: `systems/XP_SYSTEM.md`

```sql
CREATE TABLE user_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,   -- 'area' | 'genre' | 'wine_variety' | 'wine_region'
  axis_value VARCHAR(50) NOT NULL,  -- '을지로' | '일식' | 'Cabernet Sauvignon' | '프랑스'
  total_xp INT DEFAULT 0,
  level INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, axis_type, axis_value)
);

CREATE TABLE xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES records(id),
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(50),  -- 'record' | 'photo' | 'comment_bonus' | 'area_verify'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE level_thresholds (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  color VARCHAR(10)
);

INSERT INTO level_thresholds VALUES
  (1, 0, NULL), (2, 40, 'green'), (3, 100, 'green'),
  (4, 200, 'blue'), (5, 350, 'blue'),
  (6, 560, 'purple'), (7, 850, 'purple'),
  (8, 1250, 'orange'), (9, 1800, 'orange'),
  (10, 2500, 'gold');

```

---

## 4. 소셜 관련 테이블 (Phase 2)

→ 상세: `pages/BUBBLE.md`

```sql
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  identity VARCHAR(20) DEFAULT 'all',         -- 'all' | 'restaurant' | 'wine' (라벨일 뿐, 제한 없음)
  visibility VARCHAR(20) DEFAULT 'private',   -- 'private' | 'members' | 'public'
  exposure_level VARCHAR(20) DEFAULT 'rating_only',  -- 'rating_only' | 'rating_and_comment'
  allow_comments BOOLEAN DEFAULT true,
  allow_external_share BOOLEAN DEFAULT false,
  min_xp_level INT DEFAULT 0,                -- members 버블 가입 최소 경험치 레벨 (0 = 제한 없음)
  icon_url TEXT,
  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bubble_members (
  bubble_id UUID REFERENCES bubbles(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'subscriber'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(bubble_id, user_id)
);

CREATE TABLE bubble_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID REFERENCES records(id),
  bubble_id UUID REFERENCES bubbles(id),
  shared_by UUID REFERENCES users(id),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(record_id, bubble_id)
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,  -- 'record' (버블에서 같은 대상에 대한 다른 멤버의 기록도 record)
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id),
  user_id UUID REFERENCES users(id),
  content VARCHAR(300) NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,  -- 'record' | 'comment'
  target_id UUID NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,  -- 'like' | 'bookmark'
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, reaction_type, user_id)
);

CREATE TABLE follows (
  follower_id UUID REFERENCES users(id),
  following_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 넛지 관련 테이블

```sql
CREATE TABLE nudge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  nudge_type VARCHAR(30),  -- 'location' | 'time' | 'photo' | 'unrated' | 'new_area' | 'weekly'
  target_id UUID,
  status VARCHAR(10),      -- 'sent' | 'opened' | 'acted' | 'dismissed' | 'skipped'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nudge_fatigue (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  score INT DEFAULT 0,
  last_nudge_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ
);
```

---

## 6. 와인 ENUM 및 연동 정의

### wine_status ENUM (와인 기록 3분류)
| 값 | 표시명 | 설명 |
|----|--------|------|
| `tasted` | 시음 | 마신 와인. 사분면 평가 가능 |
| `cellar` | 셀러 | 보유 중인 와인. 영수증/진열장 촬영으로 등록 |
| `wishlist` | 찜 | 관심 와인. 버블에서 발견하거나 직접 추가 |

### camera_mode ENUM (촬영 모드)
| 값 | 표시명 | OCR 결과 구조 | 설명 |
|----|--------|---------------|------|
| `individual` | 개별 | `{"wine_name", "vintage", "producer", "region"}` | 1병 라벨 촬영 → 와인 상세 정보 인식 |
| `shelf` | 진열장 | `{"wines":[{"name", "price", "position"}]}` | 여러 병 촬영 → 가격 포함 리스트 생성 |
| `receipt` | 영수증 | `{"items":[{"name", "price", "qty"}], "total", "store"}` | 구매 영수증 → 보유 와인 일괄 등록 |

### 버블 와인 연동 (Bubble Wine Integration)

버블 멤버가 같은 와인을 기록하면 조용히 연결되는 구조:

```
-- 같은 와인을 마신 버블 멤버 조회 (와인 카드의 "박소연 96 · 김영수 88" 표시용)
-- bubble_shares를 통해 공유된 기록 중 같은 target_id(wine_id)를 가진 기록을 조회
SELECT r.user_id, u.nickname, u.avatar_url, r.satisfaction, r.comment, r.purchase_price
FROM records r
  JOIN bubble_shares bs ON bs.record_id = r.id
  JOIN bubble_members bm ON bm.bubble_id = bs.bubble_id AND bm.user_id = r.user_id
  JOIN users u ON u.id = r.user_id
WHERE r.target_id = :wine_id
  AND r.target_type = 'wine'
  AND bs.bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = :my_user_id)
  AND r.user_id != :my_user_id;
```

**동작 규칙**:
- 내가 와인 등록 시 → 버블 내 같은 와인 기록자가 있으면 나에게 1회 알림
- 상대방 → 별도 알림 없이 와인 카드에 버블 인원 카운트 +1
- 버블 내 다른 사용자의 시음기, 구입 가격, 점수 열람 가능
- 익명 옵션 지원 (comments.is_anonymous 활용)
- 와인 카드 UI: 버블 아바타 + "박소연 96 · 김영수 88" 형태

---

## 7. 상황 태그 ENUM

### 식당 상황 태그
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼밥 | `#7A9BAE` (슬레이트) |
| `romantic` | 데이트 | `#B8879B` (더스티 로즈) |
| `friends` | 친구 | `#7EAE8B` (세이지) |
| `family` | 가족 | `#C9A96E` (머스타드) |
| `business` | 회식/접대 | `#8B7396` (모브) |
| `drinks` | 술자리 | `#B87272` (로즈우드) |

### 와인 상황 태그
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼술 | `#7A9BAE` (슬레이트) |
| `romantic` | 데이트 | `#B8879B` (더스티 로즈) |
| `gathering` | 모임 | `#7EAE8B` (세이지) |
| `pairing` | 페어링 | `#C9A96E` (머스타드) |
| `gift` | 선물 | `#8B7396` (모브) |
| `tasting` | 시음회 | `#B87272` (로즈우드) |

> 색상은 DESIGN_SYSTEM.md의 상황 태그 색상과 동일하게 유지. Tailwind 원색 사용 금지.

### wishlists vs reactions.bookmark vs records.wine_status='wishlist' 구분
- **wishlists 테이블**: 사용자가 직접 식당/와인을 "찜". 상세 페이지의 하트 버튼, 프로필의 위시리스트
- **reactions.bookmark**: 버블에서 다른 멤버의 기록을 보고 해당 식당/와인을 찜 → wishlists에 INSERT하는 트리거
- **records.wine_status='wishlist'**: 와인 탭 내 3분류(시음/셀러/찜) 중 "찜" 필터. wishlists 테이블에서 target_type='wine'인 항목과 동기화
- 즉, bookmark 리액션은 wishlists 생성의 진입점. 와인 찜은 wishlists + records.wine_status 양쪽에 반영. 최종 저장소는 항상 wishlists

### 페어링 카테고리 ENUM (WSET 기반)

와인 기록 시 선택하는 음식 매칭 카테고리. `records.pairing_categories TEXT[]`에 저장.

| 값 | 표시명 | 예시 음식 |
|----|--------|----------|
| `red_meat` | 적색육 | 스테이크, 양갈비, 오리, 사슴 |
| `white_meat` | 백색육 | 닭, 돼지, 송아지, 토끼 |
| `seafood` | 어패류 | 생선, 갑각류, 조개, 굴, 초밥 |
| `cheese` | 치즈·유제품 | 숙성 치즈, 블루, 브리, 크림소스 |
| `vegetable` | 채소·곡물 | 버섯, 트러플, 리조또, 파스타 |
| `spicy` | 매운·발효 | 커리, 마라, 김치, 된장 |
| `dessert` | 디저트·과일 | 다크초콜릿, 타르트, 건과일 |
| `charcuterie` | 샤퀴트리·견과 | 하몽, 살라미, 아몬드, 올리브 |

- wines.food_pairings: 와인 DB 기본 추천 (외부 데이터)
- records.pairing_categories: 사용자가 실제 경험한 페어링 (기록별)
- 두 필드는 독립적: DB 추천 ≠ 사용자 경험

---

## 8. Seed 데이터 (온보딩용)

### Seed 데이터 (온보딩용)
- 온보딩에서 사용할 대표 식당은 DB에 미리 INSERT 필요
- 식당: 미슐랭/블루리본 + 외부 평점 상위 (지역별)
- 와인: 온보딩 시드 불필요 (사진 인식/검색으로 전체 와인 DB 활용)
- seed 스크립트: `supabase/seed.sql`에서 관리
