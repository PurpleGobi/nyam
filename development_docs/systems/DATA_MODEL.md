# DATA_MODEL — 데이터 모델

> affects: 모든 페이지, 모든 시스템

---

## 1. 핵심 엔티티 관계

```
users (1) ─── (N) lists
users (1) ─── (N) xp_totals
users (1) ─── (N) saved_filters

lists (1) ─── (N) records
lists ─── UNIQUE(user_id, target_id, target_type)

restaurants (1) ─── (N) lists (target_type='restaurant')
wines (1) ─── (N) lists (target_type='wine')

records (1) ─── (N) record_photos
records (1) ─── (N) bubble_shares ─── (N) bubbles
records (1) ─── (N) comments
records (1) ─── (N) reactions

bubbles (1) ─── (N) bubble_members ─── (N) users
users (1) ─── (N) follows ─── (N) users
users (1) ─── (N) notifications
users (1) ─── (N) xp_log_milestones ─── (N) xp_seed_milestones

-- 캐시/스냅샷 테이블
-- bubble_ranking_snapshots: 버블 랭킹 주간 스냅샷 (등락 ▲▼ 표시용)

-- 지원 테이블 (FK 관계 없는 독립/참조 테이블)
-- xp_log_changes: records/users 참조, XP 획득 이력
-- xp_seed_levels: 레벨별 필요 XP 정의 (시드)
-- xp_seed_rules: XP 배분 규칙 (시드)
-- area_zones: 생활권 좌표 (시드)
-- restaurant_accolades: 미슐랭/블루리본/TV 수상 (시드)
```

---

## 2. 테이블 정의

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  nickname VARCHAR(20) NOT NULL,
  handle VARCHAR(20) UNIQUE,         -- @handle 형태의 고유 사용자 ID (프로필 표시용)
  avatar_url TEXT,
  avatar_color VARCHAR(20),             -- 아바타 배경색 (hex, 예: "#C17B5E"). avatar_url 없을 때 이니셜+색상으로 렌더
  bio VARCHAR(100),
  taste_summary TEXT,                -- AI 생성 취향 요약 텍스트
  taste_tags TEXT[],                 -- AI 생성 취향 태그 배열 ['을지로 전문가','캐주얼 선호','레드 와인파','탐험형']
  taste_updated_at TIMESTAMPTZ,      -- 취향 분석 마지막 갱신 시점
  preferred_areas TEXT[],           -- 온보딩에서 선택한 동네

  -- 프라이버시
  is_public BOOLEAN NOT NULL DEFAULT false,                    -- 전체 공개 여부
  follow_policy VARCHAR(20) NOT NULL DEFAULT 'blocked',        -- 'blocked' | 'auto_approve' | 'manual_approve' | 'conditional'
  follow_min_records INT,                                      -- conditional일 때 최소 기록 수 (NULL = 조건 없음)
  follow_min_level INT,                                        -- conditional일 때 최소 레벨 (NULL = 조건 없음)
  visibility_public JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":false,"price":false}',
  visibility_bubble JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":true,"price":true}',

  -- 알림 설정
  notify_push BOOLEAN NOT NULL DEFAULT true,
  notify_level_up BOOLEAN NOT NULL DEFAULT true,
  notify_bubble_join BOOLEAN NOT NULL DEFAULT true,
  notify_follow BOOLEAN NOT NULL DEFAULT true,
  dnd_start TIME,
  dnd_end TIME,

  -- 화면 디폴트
  pref_landing VARCHAR(20) NOT NULL DEFAULT 'last',        -- 'last' | 'home' | 'bubbles' | 'profile'
  pref_home_tab VARCHAR(20) NOT NULL DEFAULT 'last',       -- 'last' | 'restaurant' | 'wine'
  pref_restaurant_sub VARCHAR(20) NOT NULL DEFAULT 'last', -- 'last' | 'visited' | 'wishlist' | 'following'
  pref_wine_sub VARCHAR(20) NOT NULL DEFAULT 'last',       -- 'last' | 'tasted' | 'wishlist' | 'cellar'
  pref_bubble_tab VARCHAR(20) NOT NULL DEFAULT 'last',     -- 'last' | 'bubble' | 'bubbler'
  pref_view_mode VARCHAR(20) NOT NULL DEFAULT 'last',      -- 'last' | 'card' | 'list' | 'calendar'
  pref_timezone TEXT,                                       -- IANA timezone (예: 'Asia/Seoul'). NULL이면 클라이언트 자동 감지

  -- 기능 디폴트
  pref_default_sort VARCHAR(20) NOT NULL DEFAULT 'latest',  -- 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
  pref_record_input VARCHAR(20) NOT NULL DEFAULT 'camera',  -- 'camera' | 'search'
  pref_bubble_share VARCHAR(20) NOT NULL DEFAULT 'ask',     -- 'ask' | 'auto' | 'never'
  pref_temp_unit VARCHAR(5) NOT NULL DEFAULT 'C',           -- 'C' | 'F'

  -- 계정 삭제 (30일 유예 후 영구 삭제)
  deleted_at TIMESTAMPTZ,
  delete_mode VARCHAR(20),                         -- 'anonymize' | 'hard_delete'
  delete_scheduled_at TIMESTAMPTZ,

  -- 비정규화 캐시
  record_count INT NOT NULL DEFAULT 0,            -- lists(visited/tasted) 기준 총 기록 수
  follower_count INT NOT NULL DEFAULT 0,
  following_count INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,          -- 연속 기록 주 수
  total_xp INT NOT NULL DEFAULT 0,               -- 누적 XP (절대 안 줄어듦)
  active_xp INT NOT NULL DEFAULT 0,              -- 최근 6개월 XP (자동 갱신)
  active_verified INT NOT NULL DEFAULT 0,         -- 최근 6개월 검증 기록 수

  -- 인증
  auth_provider VARCHAR(20) NOT NULL,    -- 'kakao' | 'google' | 'apple' | 'naver'
  auth_provider_id VARCHAR(100) NOT NULL UNIQUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_users_auth_provider       CHECK (auth_provider IN ('kakao','google','apple','naver')),
  CONSTRAINT chk_follow_policy              CHECK (follow_policy IN ('blocked','auto_approve','manual_approve','conditional')),
  CONSTRAINT chk_users_delete_mode         CHECK (delete_mode IS NULL OR delete_mode IN ('anonymize','hard_delete')),
  CONSTRAINT chk_users_pref_landing        CHECK (pref_landing IN ('last','home','bubbles','profile')),
  CONSTRAINT chk_users_pref_home_tab       CHECK (pref_home_tab IN ('last','restaurant','wine')),
  CONSTRAINT chk_users_pref_restaurant_sub CHECK (pref_restaurant_sub IN ('last','visited','wishlist','following')),
  CONSTRAINT chk_users_pref_wine_sub       CHECK (pref_wine_sub IN ('last','tasted','wishlist','cellar')),
  CONSTRAINT chk_users_pref_bubble_tab     CHECK (pref_bubble_tab IN ('last','bubble','bubbler')),
  CONSTRAINT chk_users_pref_view_mode      CHECK (pref_view_mode IN ('last','card','list','calendar')),
  CONSTRAINT chk_users_pref_default_sort   CHECK (pref_default_sort IN ('latest','score_high','score_low','name','visit_count')),
  CONSTRAINT chk_users_pref_record_input   CHECK (pref_record_input IN ('camera','search')),
  CONSTRAINT chk_users_pref_bubble_share   CHECK (pref_bubble_share IN ('ask','auto','never')),
  CONSTRAINT chk_users_pref_temp_unit      CHECK (pref_temp_unit IN ('C','F'))
);
```

### restaurants
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(50) NOT NULL DEFAULT '한국',  -- 국가 — 식당 통계 세계지도 클러스터용
  city VARCHAR(50) NOT NULL DEFAULT '서울',     -- 도시 — 세계지도 도시별 그룹핑
  area TEXT[],                      -- 생활권 동네명 배열 (중복 영역 지원). 예: ['을지로','명동']
  district VARCHAR(50),            -- 구 (종로구, 강남구 등) — 국내 식당 전용
  genre VARCHAR(30),               -- CHECK: 한식/일식/중식/태국/베트남/인도/이탈리안/프렌치/스페인/지중해/미국/멕시칸/카페/바·주점/베이커리/기타
                                  -- 6대분류: 동아시아(한식,일식,중식) / 동남아·남아시아(태국,베트남,인도) / 유럽(이탈리안,프렌치,스페인,지중해) / 아메리카(미국,멕시칸) / 음료·디저트(카페,바/주점,베이커리) / 기타
  price_range INT,                 -- 1~3 (저가/중간/고가)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,                     -- {"mon": "11:00-22:00", ...}
  photos TEXT[],
  menus JSONB,                     -- 대표 메뉴+가격 [{"name":"오마카세 코스","price":150000}]

  -- 외부 평점
  naver_rating NUMERIC,
  kakao_rating NUMERIC,
  google_rating NUMERIC,

  -- 권위 인증
  michelin_stars INT,              -- NULL or 1,2,3
  has_blue_ribbon BOOLEAN NOT NULL DEFAULT false,
  media_appearances JSONB,         -- TV출연 등 [{"show":"흑백요리사","season":"S1","year":2024}]

  -- 비정규화 캐시
  specialty TEXT,                   -- 대표 메뉴/특색 (AI 추출)
  external_avg NUMERIC,            -- 외부 평점 평균 (naver+kakao+google 가중 평균)
  record_count INT NOT NULL DEFAULT 0,  -- nyam 내 총 기록 수

  -- nyam 종합 점수
  nyam_score NUMERIC,              -- 0~100. NULL이면 아직 미산출
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,              -- {"kakao": "...", "naver": "...", "google": "..."}
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,
  kakao_map_url TEXT,              -- 카카오맵 URL

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_restaurants_genre       CHECK (genre IS NULL OR genre IN ('한식','일식','중식','태국','베트남','인도','이탈리안','프렌치','스페인','지중해','미국','멕시칸','카페','바/주점','베이커리','기타')),
  CONSTRAINT chk_restaurants_price_range CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 3)),
  CONSTRAINT chk_restaurants_michelin    CHECK (michelin_stars IS NULL OR (michelin_stars >= 1 AND michelin_stars <= 3))
);

CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_country_city ON restaurants(country, city);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(
  ST_MakePoint(lng, lat)
) WHERE lng IS NOT NULL AND lat IS NOT NULL;
```

### wines
```sql
CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer VARCHAR(100),           -- 와이너리/생산자
  region VARCHAR(100),             -- 산지 (Bordeaux, California, South Australia 등)
  sub_region VARCHAR(100),         -- 세부 산지 (Côte de Nuits, Napa Valley, Barossa 등)
  appellation VARCHAR(100),        -- 어펠라시옹/마을 (Gevrey-Chambertin, Rutherford, Barossa Valley 등) — 4단계 드릴다운
  country VARCHAR(50),             -- 국가
  variety VARCHAR(100),            -- 대표 품종 (단일 품종 와인용, 블렌드는 grape_varieties 참조)
  grape_varieties JSONB,           -- 블렌드 비율 포함 품종 배열. [{"name":"Cabernet Sauvignon","pct":60},{"name":"Merlot","pct":40}]
  wine_type VARCHAR(20) NOT NULL,   -- 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
  vintage INT,                     -- 빈티지 연도 (NULL = NV)
  abv NUMERIC,                     -- 알코올 도수
  label_image_url TEXT,
  photos TEXT[],                   -- 와인 사진 배열 (라벨, 병, 코르크 등)
  tasting_notes TEXT,              -- AI 생성 테이스팅 노트

  -- 와인 DB 메타
  body_level INT,                  -- 1~5
  acidity_level INT,               -- 1~3 (1=낮음, 2=중간, 3=높음)
  sweetness_level INT,             -- 1~3 (1=드라이, 2=오프드라이, 3=스위트)
  food_pairings TEXT[],            -- 영문 키로 저장 ["steak", "lamb", "cheese"]
  serving_temp VARCHAR(20),        -- "16-18°C"
  decanting VARCHAR(30),            -- "2시간 권장" 등

  reference_price_min INT,           -- 참고 시세 최저 (원)
  reference_price_max INT,           -- 참고 시세 최고 (원)
  price_review JSONB,                -- AI 가격 분석 리뷰 {"verdict":"buy"|"conditional_buy"|"avoid","summary":"...","alternatives":[...]}
  drinking_window_start INT,        -- 음용 적기 시작 연도
  drinking_window_end INT,          -- 음용 적기 종료 연도

  -- 외부 평점
  vivino_rating NUMERIC,
  critic_scores JSONB,              -- {"RP":97,"WS":95,"JR":18.5,"JH":96}

  -- 권위 인증
  classification VARCHAR(100),      -- 와인 등급 (Grand Cru Classé, Premier Cru, DOC, DOCG 등)

  -- nyam 종합 점수
  nyam_score NUMERIC,
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_wines_type            CHECK (wine_type IN ('red','white','rose','sparkling','orange','fortified','dessert')),
  CONSTRAINT chk_wines_body_level      CHECK (body_level IS NULL OR (body_level >= 1 AND body_level <= 5)),
  CONSTRAINT chk_wines_acidity_level   CHECK (acidity_level IS NULL OR (acidity_level >= 1 AND acidity_level <= 3)),
  CONSTRAINT chk_wines_sweetness_level CHECK (sweetness_level IS NULL OR (sweetness_level >= 1 AND sweetness_level <= 3))
);

CREATE INDEX idx_wines_type ON wines(wine_type);
CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_region ON wines(country, region, sub_region, appellation);  -- 산지 지도 4단계 드릴다운 쿼리용
```

### 와인 산지 Cascade 선택지 (WSET 기준)

country → region → sub_region → appellation 4단계 cascade. 프론트엔드 드롭다운 및 Gemini 프롬프트에서 이 목록 기준으로 값을 제한한다.
대부분의 와인은 3단계(country/region/sub_region)까지만 해당. 4단계(appellation)는 Burgundy village AOC, Napa AVA, Barossa GI, South Africa Ward 등 일부에만 적용.

```yaml
# WSET Level 3 공식 Specification (Issue 2, 2022) 원문 그대로 매핑.
# 출처: wsetglobal.com/media/4953/level-3-award-in-wines-specification.pdf
# 구조: country → region → sub_region → appellation (4단계 cascade)
# region: spec 볼드 제목 (Bordeaux, California 등)
# sub_region: spec 하위 그룹 (Côte de Nuits, Napa Valley 등). []이면 하위 없음.
# appellation: sub_region 안의 village AOC/AVA/Ward 등. 4단계 구조인 곳만 nested yaml로 표기.

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

### lists (사용자 × 식당/와인 관계)

> wishlists 테이블을 대체. 식당 방문/찜, 와인 시음/셀러/찜을 하나의 테이블로 통합 관리.

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,           -- restaurant_id or wine_id
  target_type VARCHAR(10) NOT NULL,  -- 'restaurant' | 'wine'
  status VARCHAR(20) NOT NULL,       -- 'visited' | 'wishlist' | 'cellar' | 'tasted'
                                     -- visited: 식당 방문 완료
                                     -- wishlist: 식당/와인 찜
                                     -- cellar: 보유 와인
                                     -- tasted: 와인 시음 완료
  source VARCHAR(10) DEFAULT 'direct',  -- 'direct' | 'bubble' | 'ai' | 'web' | 'onboarding'
  source_record_id UUID,             -- source='bubble'일 때 원본 기록 ID

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, target_id, target_type)
);

CREATE INDEX idx_lists_user_type ON lists(user_id, target_type, status);
CREATE INDEX idx_lists_target ON lists(target_id, target_type);
```

### records (방문/시음 기록)
```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id),
  user_id UUID NOT NULL REFERENCES users(id),      -- 비정규화
  target_id UUID NOT NULL,                          -- 비정규화
  target_type VARCHAR(10) NOT NULL,                 -- 비정규화

  -- 사분면 평가
  axis_x NUMERIC(5,2),              -- 0~100 (식당: 음식 퀄리티, 와인: 구조·완성도)
  axis_y NUMERIC(5,2),              -- 0~100 (식당: 경험 가치, 와인: 즐거움·감성)
  satisfaction INT,                 -- 1~100 computed as (axis_x + axis_y) / 2

  -- 경험 데이터
  scene VARCHAR(20),               -- 상황 태그
  comment VARCHAR(200),            -- 한줄평
  total_price INT,                 -- 식당 1인 결제 금액 (원)
  purchase_price INT,              -- 구매 가격 (원) — 와인 전용
  visit_date DATE,                 -- 방문/음용 날짜
  meal_time VARCHAR(10),           -- 'breakfast' | 'lunch' | 'dinner' | 'snack'

  -- 메뉴/페어링
  menu_tags TEXT[],                -- 추천 메뉴/페어링 메모
  pairing_categories TEXT[],        -- WSET 페어링 카테고리 — 와인 기록 전용

  -- GPS
  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,  -- GPS가 식당 위치 반경 200m 이내일 때 true

  -- 와인 전용
  camera_mode VARCHAR(10),         -- 'individual' | 'shelf' | 'receipt'
  ocr_data JSONB,                  -- 카메라 모드별 OCR 인식 결과
  aroma_primary TEXT[] DEFAULT '{}',    -- WSET 1차 아로마 (과일, 꽃 등)
  aroma_secondary TEXT[] DEFAULT '{}',  -- WSET 2차 아로마 (발효, 숙성 등)
  aroma_tertiary TEXT[] DEFAULT '{}',   -- WSET 3차 아로마 (오크, 산화 등)
  complexity INT,                  -- 0~100 (단순↔복합, 슬라이더)
  finish NUMERIC(5,2),             -- 여운 0~100
  balance NUMERIC(5,2),            -- 균형 0~100
  intensity INT,                   -- 0~100 (강도)
  auto_score INT,                  -- 자동 산출 만족도

  -- 메타
  private_note TEXT,               -- 비공개 메모
  companion_count INT,             -- 동반자 수 (필터/통계용, 비공개 아님)
  companions TEXT[],               -- 함께 간 사람 ⚠️ 무조건 비공개 (본인만 열람)
  linked_restaurant_id UUID REFERENCES restaurants(id),  -- 와인 기록의 식당 연결
  linked_wine_id UUID REFERENCES wines(id),              -- 식당 기록의 와인 연결
  record_quality_xp INT NOT NULL DEFAULT 0,         -- 이 기록으로 획득한 총 XP (비정규화)
  score_updated_at TIMESTAMPTZ,            -- 만족도 점수 마지막 부여 시점

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_records_intensity CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 100))
);

CREATE INDEX idx_records_list ON records(list_id);
CREATE INDEX idx_records_user_type ON records(user_id, target_type, visit_date DESC);
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_satisfaction ON records(user_id, target_type, satisfaction) WHERE satisfaction IS NOT NULL;
```

### record_photos
```sql
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);
```

---

## 3. 경험치 관련 테이블

→ 상세: `systems/XP_SYSTEM.md`

### xp_totals (축별 현재 XP + 레벨)

```sql
CREATE TABLE xp_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,   -- 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'
  axis_value VARCHAR(50) NOT NULL,  -- category: 'restaurant' | 'wine'
                                    -- area: '을지로' | '광화문' 등
                                    -- genre: '일식' | '양식' 등
                                    -- wine_variety: 'Cabernet Sauvignon' 등
                                    -- wine_region: '프랑스' 등
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, axis_type, axis_value),
  CONSTRAINT chk_ue_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region'))
);

CREATE INDEX idx_xp_totals_axis ON xp_totals(axis_type, axis_value);
```

### xp_log_changes (XP 변동 이력)

```sql
CREATE TABLE xp_log_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID,                   -- 기록 삭제 시 XP 이력은 유지
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(30),  -- 'record_name' | 'record_score' | 'record_photo' | 'record_full'
                       -- | 'detail_axis' | 'category'
                       -- | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual'
                       -- | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share'
                       -- | 'milestone' | 'revisit'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_xp_reason CHECK (reason IN ('record_name','record_score','record_photo','record_full','detail_axis','category','social_share','social_like','social_follow','social_mutual','bonus_onboard','bonus_first_record','bonus_first_bubble','bonus_first_share','milestone','revisit'))
);

CREATE INDEX idx_xp_log_changes_user_created ON xp_log_changes(user_id, created_at DESC);
CREATE INDEX idx_xp_log_changes_axis ON xp_log_changes(user_id, axis_type, axis_value);
```

### xp_seed_levels (레벨 정의, 99행 시드)

```sql
CREATE TABLE xp_seed_levels (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title VARCHAR(20),              -- 레벨 칭호
  color VARCHAR(10)
);
```

### xp_seed_milestones (마일스톤 정의)

```sql
CREATE TABLE xp_seed_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,    -- 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region' | 'global'
  metric VARCHAR(30) NOT NULL,       -- 'unique_places' | 'total_records' | 'revisits' | 'unique_wines' 등
  threshold INT NOT NULL,            -- 달성 기준값 (10, 20, 30, 50, 100...)
  xp_reward INT NOT NULL,            -- 달성 시 보너스 XP
  label VARCHAR(50) NOT NULL,        -- 표시 텍스트

  CONSTRAINT chk_milestones_axis_type CHECK (axis_type IN ('category','area','genre','wine_variety','wine_region','global'))
);

CREATE INDEX idx_xp_seed_milestones_axis_threshold ON xp_seed_milestones(axis_type, metric, threshold);
```

### xp_log_milestones (마일스톤 달성 기록)

```sql
CREATE TABLE xp_log_milestones (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES xp_seed_milestones(id),
  axis_value VARCHAR(50) NOT NULL DEFAULT '_global',
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY(user_id, milestone_id, axis_value)
);
```

### xp_seed_rules (XP 배분 규칙)

```sql
CREATE TABLE xp_seed_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(30) NOT NULL UNIQUE,
  xp_amount INT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 비정규화 갱신

> **트리거 기반 실시간 갱신 + 크론 기반 일/주간 갱신으로 이원화.**
> 상세: §10 "비정규화 업데이트 전략" 참조.

---

## 4. 소셜 관련 테이블

→ 상세: `pages/BUBBLE.md`

### bubbles
```sql
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  focus_type VARCHAR(20) NOT NULL DEFAULT 'all',        -- 'all' | 'restaurant' | 'wine'
  area VARCHAR(50),                           -- 버블 주요 지역
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',   -- 'private' | 'public'
  content_visibility VARCHAR(20) NOT NULL DEFAULT 'rating_only',  -- 'rating_only' | 'rating_and_comment'
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_external_share BOOLEAN NOT NULL DEFAULT false,

  -- 가입 정책
  join_policy VARCHAR(20) NOT NULL DEFAULT 'invite_only',  -- 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
  min_records INT NOT NULL DEFAULT 0,
  min_level INT NOT NULL DEFAULT 0,
  max_members INT,
  rules TEXT[],

  -- 검색/탐색
  is_searchable BOOLEAN NOT NULL DEFAULT true,
  search_keywords TEXT[],

  -- 비정규화: 기본 카운트 (트리거 실시간 갱신)
  follower_count INT NOT NULL DEFAULT 0,
  member_count INT NOT NULL DEFAULT 0,
  record_count INT NOT NULL DEFAULT 0,
  avg_satisfaction NUMERIC,
  last_activity_at TIMESTAMPTZ,

  -- 비정규화: 통계 캐시 (크론 일/주간 갱신)
  unique_target_count INT NOT NULL DEFAULT 0,
  weekly_record_count INT NOT NULL DEFAULT 0,
  prev_weekly_record_count INT NOT NULL DEFAULT 0,

  -- 아이콘
  icon TEXT,                                  -- lucide 아이콘명 또는 커스텀 이미지 URL
  icon_bg_color VARCHAR(10),
  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bubbles_focus_type          CHECK (focus_type IN ('all','restaurant','wine')),
  CONSTRAINT chk_bubbles_visibility          CHECK (visibility IN ('private','public')),
  CONSTRAINT chk_bubbles_content_visibility  CHECK (content_visibility IN ('rating_only','rating_and_comment')),
  CONSTRAINT chk_bubbles_join_policy         CHECK (join_policy IN ('invite_only','closed','manual_approve','auto_approve','open'))
);
```

### bubble_members
```sql
CREATE TABLE bubble_members (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'follower'
  status VARCHAR(10) NOT NULL DEFAULT 'active',  -- 'pending' | 'active' | 'rejected'
  visibility_override JSONB,          -- 버블별 프라이버시 커스텀 (NULL이면 users.visibility_bubble 사용)
  share_rule JSONB,                   -- 자동 공유 규칙 설정 (NULL이면 수동 공유)

  -- 멤버 활동 캐시 (크론 일/주간 갱신)
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

CREATE INDEX idx_bubble_members_active ON bubble_members(bubble_id, role, status) WHERE status = 'active';
CREATE INDEX idx_bubble_members_user ON bubble_members(user_id, bubble_id) WHERE status = 'active';
```

### bubble_shares
```sql
CREATE TABLE bubble_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto_synced BOOLEAN NOT NULL DEFAULT false,   -- 자동 공유 규칙에 의해 동기화된 공유인지
  target_id UUID NOT NULL,          -- 비정규화 (records.target_id)
  target_type VARCHAR(10) NOT NULL, -- 비정규화 (records.target_type)

  UNIQUE(record_id, bubble_id)
);

CREATE INDEX idx_bubble_shares_bubble ON bubble_shares(bubble_id, shared_at DESC);
CREATE INDEX idx_bubble_shares_record ON bubble_shares(record_id);
CREATE INDEX idx_bubble_shares_user ON bubble_shares(shared_by);
CREATE INDEX idx_bubble_shares_target ON bubble_shares(target_id, target_type, bubble_id);
CREATE INDEX idx_bubble_shares_auto_synced ON bubble_shares(bubble_id, shared_by) WHERE auto_synced = true;
```

### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL,  -- 'record'
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content VARCHAR(200) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_comments_target_type CHECK (target_type = 'record')
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);
```

### reactions
```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL,  -- 'record' | 'comment'
  target_id UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL,  -- 'like' | 'bookmark' | 'want' | 'check' | 'fire'
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(target_type, target_id, reaction_type, user_id),
  CONSTRAINT chk_reactions_target_type CHECK (target_type IN ('record','comment')),
  CONSTRAINT chk_reactions_type        CHECK (reaction_type IN ('like','bookmark','want','check','fire'))
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id, reaction_type);
```

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

CREATE INDEX idx_ranking_snapshots_bubble_period ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);
```

### follows
```sql
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',  -- 'pending' | 'accepted' | 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT chk_follows_status  CHECK (status IN ('pending','accepted','rejected')),
  PRIMARY KEY(follower_id, following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  -- 'level_up' | 'bubble_join_request' | 'bubble_join_approved'
  -- | 'follow_request' | 'follow_accepted'
  -- | 'bubble_invite' | 'bubble_new_record' | 'bubble_member_joined'
  -- | 'reaction_like' | 'comment_reply'
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  title TEXT,                      -- 알림 제목
  body TEXT,                       -- 알림 본문
  metadata JSONB,                  -- 렌더링용 비정규화 데이터
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_status VARCHAR(10),       -- 'pending' | 'accepted' | 'rejected' | NULL

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_notif_type          CHECK (notification_type IN ('level_up','bubble_join_request','bubble_join_approved','follow_request','follow_accepted','bubble_invite','bubble_new_record','bubble_member_joined','reaction_like','comment_reply')),
  CONSTRAINT chk_notif_action_status CHECK (action_status IS NULL OR action_status IN ('pending','accepted','rejected'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

## 5. 저장 필터 (홈 필터칩)

> 홈 화면의 Notion-style 필터 엔진에서 사용자가 저장한 필터 프리셋.

```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL,   -- 'restaurant' | 'wine' | 'bubble' | 'bubbler' | 'bubble_feed' | 'bubble_ranking' | 'bubble_member'
  context_id UUID,                    -- 컨텍스트 ID (bubble_feed/ranking/member → bubble_id)
  rules JSONB NOT NULL,               -- 필터 규칙 배열
  sort_by VARCHAR(20),                -- 저장된 소팅
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_sf_target_type CHECK (target_type IN ('restaurant','wine','bubble','bubbler','bubble_feed','bubble_ranking','bubble_member')),
  CONSTRAINT chk_sf_sort_by     CHECK (sort_by IS NULL OR sort_by IN ('latest','score_high','score_low','name','visit_count'))
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id, target_type);
CREATE INDEX idx_saved_filters_context ON saved_filters(user_id, target_type, context_id) WHERE context_id IS NOT NULL;
```

---

## 6. 참조/시드 테이블

### area_zones (생활권 좌표)

```sql
CREATE TABLE area_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,       -- 동네명 ('을지로', '강남역' 등)
  city VARCHAR(50) NOT NULL,       -- 도시 ('서울' 등)
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_m INT NOT NULL DEFAULT 1500,  -- 반경 (미터)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_area_zones_city ON area_zones(city);
```

### restaurant_accolades (미슐랭/블루리본/TV 수상)

```sql
CREATE TABLE restaurant_accolades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_name TEXT NOT NULL,
  restaurant_name_norm TEXT NOT NULL,  -- 정규화된 이름 (공백/특수문자 제거, 소문자)
  region TEXT,
  area TEXT,
  category TEXT NOT NULL,              -- 'award' | 'tv_competition' | 'tv_review' | 'celebrity' | 'media'
  source TEXT NOT NULL,
  prestige_tier TEXT NOT NULL DEFAULT 'B',  -- 'S' | 'A' | 'B'
  detail TEXT,
  year INT,
  season INT,
  episode TEXT,
  source_url TEXT,
  verified BOOLEAN DEFAULT false,
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  kakao_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT restaurant_accolades_category_check      CHECK (category IN ('award','tv_competition','tv_review','celebrity','media')),
  CONSTRAINT restaurant_accolades_prestige_tier_check  CHECK (prestige_tier IN ('S','A','B'))
);

CREATE INDEX idx_accolades_name_norm ON restaurant_accolades(restaurant_name_norm);
CREATE INDEX idx_accolades_region_area ON restaurant_accolades(region, area);
CREATE INDEX idx_accolades_category ON restaurant_accolades(category);
CREATE INDEX idx_accolades_source ON restaurant_accolades(source);
```

---

## 7. 와인 ENUM 및 연동 정의

### lists.status 분류 (식당/와인 공용)
| 값 | 대상 | 설명 |
|----|------|------|
| `visited` | 식당 | 방문 완료 |
| `wishlist` | 식당/와인 | 찜 (관심 항목) |
| `tasted` | 와인 | 시음 완료 |
| `cellar` | 와인 | 보유 중 (셀러) |

### camera_mode ENUM (촬영 모드)
| 값 | 표시명 | OCR 결과 구조 | 설명 |
|----|--------|---------------|------|
| `individual` | 개별 | `{"wine_name", "vintage", "producer", "region"}` | 1병 라벨 촬영 → 와인 상세 정보 인식 |
| `shelf` | 진열장 | `{"wines":[{"name", "price", "position"}]}` | 여러 병 촬영 → 가격 포함 리스트 생성 |
| `receipt` | 영수증 | `{"items":[{"name", "price", "qty"}], "total", "store"}` | 구매 영수증 → 보유 와인 일괄 등록 |

### 버블 와인 연동 (Bubble Wine Integration)

버블 멤버가 같은 와인을 기록하면 조용히 연결되는 구조:

```
-- 같은 와인을 마신 버블 멤버 조회
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

---

## 8. 상황 태그 ENUM

### 식당 상황 태그
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼밥 | `#7A9BAE` (슬레이트) |
| `romantic` | 데이트 | `#B8879B` (더스티 로즈) |
| `friends` | 친구 | `#7EAE8B` (세이지) |
| `family` | 가족 | `#C9A96E` (머스타드) |
| `business` | 회식 | `#8B7396` (모브) |
| `drinks` | 술자리 | `#B87272` (로즈우드) |

### 와인 상황 태그
| 값 | 표시명 | 색상 |
|----|--------|------|
| `solo` | 혼술 | `#7A9BAE` (슬레이트) |
| `romantic` | 데이트 | `#B8879B` (더스티 로즈) |
| `gathering` | 모임 | `#7EAE8B` (세이지) |
| `pairing` | 페어링 | `#C9A96E` (머스타드) |
| `gift` | 선물 | `#8B7396` (모브) |
| `tasting` | 테이스팅 | `#B87272` (로즈우드) |
| `decanting` | 디캔팅 | `#7A9BAE` (슬레이트) |

> 색상은 DESIGN_SYSTEM.md의 상황 태그 색상과 동일하게 유지. Tailwind 원색 사용 금지.

### 식사시간 ENUM (캘린더 뷰)
| 값 | 표시명 | 비고 |
|----|--------|------|
| `breakfast` | 아침 | ~11:00 |
| `lunch` | 점심 | 11:00~15:00 |
| `dinner` | 저녁 | 15:00~ |
| `snack` | 간식 | 비정규 식사 |

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

## 9. Seed 데이터 (온보딩용)

- 온보딩에서 사용할 대표 식당은 DB에 미리 INSERT 필요
- 식당: 미슐랭/블루리본 + 외부 평점 상위 (지역별)
- 와인: 온보딩 시드 불필요 (사진 인식/검색으로 전체 와인 DB 활용)
- seed 스크립트: `supabase/seed.sql`에서 관리

---

## 10. 비정규화 업데이트 전략

### 트리거 (실시간 — 즉시 반영 필요한 카운트)

모든 트리거는 `SET col = col ± 1` 증분 방식. 서브쿼리로 전체 카운트 재계산 금지.

```sql
-- users.record_count: lists INSERT/UPDATE/DELETE 시 (visited/tasted 상태만 카운트)
CREATE OR REPLACE FUNCTION trg_update_user_record_count()
RETURNS TRIGGER AS $$ ... $$
LANGUAGE plpgsql;

CREATE TRIGGER after_list_record_count
  AFTER INSERT OR UPDATE OR DELETE ON lists
  FOR EACH ROW EXECUTE FUNCTION trg_update_user_record_count();

-- users.follower_count / following_count: follows INSERT/UPDATE/DELETE 시
CREATE OR REPLACE FUNCTION trg_update_follow_counts()
RETURNS TRIGGER AS $$ ... $$
LANGUAGE plpgsql;

CREATE TRIGGER after_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trg_update_follow_counts();

-- bubbles.member_count + follower_count: bubble_members INSERT/UPDATE/DELETE 시
-- member_count: role in ('owner','admin','member') AND status='active'
-- follower_count: role='follower' AND status='active'
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count()
RETURNS TRIGGER AS $$ ... $$
LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_member_count
  AFTER INSERT OR UPDATE OR DELETE ON bubble_members
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_member_count();

-- bubbles.record_count + last_activity_at: bubble_shares INSERT/DELETE 시
CREATE OR REPLACE FUNCTION trg_update_bubble_share_stats()
RETURNS TRIGGER AS $$ ... $$
LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_share_stats
  AFTER INSERT OR DELETE ON bubble_shares
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_share_stats();
```

### 크론 (일/주간 — 실시간 정확도 불필요)

```sql
-- 매일 (04:00 KST): 활성 XP + 활성 검증 기록 수 재계산
-- pg_cron: 'daily-refresh-active-xp' → Edge Function /functions/v1/refresh-active-xp

-- 일간: 버블 통계 캐시 (avg_satisfaction + unique_target_count)
-- 일간: 멤버 활동 캐시 (avg_satisfaction, member_unique_target_count)

-- 주간 (월요일 00:00 UTC): 버블 주간 기록수 롤링 + 랭킹 스냅샷
-- pg_cron: 'weekly-ranking-snapshot' → Edge Function /functions/v1/weekly-ranking-snapshot

-- 매일 (09:30 KST): 삭제 예정 계정 처리
-- pg_cron: 'daily-process-account-deletion' → Edge Function /functions/v1/process-account-deletion
```

---

## 11. Database Functions (RPC)

### increment_user_total_xp — XP 원자적 증가

```sql
-- users.total_xp 원자적 증가 (delta 검증 포함)
-- authenticated 클라이언트: 0-500 범위만 허용
-- service_role: 제한 없음
CREATE OR REPLACE FUNCTION increment_user_total_xp(p_user_id UUID, p_xp_delta INT) RETURNS void
  LANGUAGE plpgsql AS $$ ... $$;
```

### upsert_user_experience — XP 축별 upsert

```sql
-- xp_totals INSERT ON CONFLICT UPDATE
CREATE OR REPLACE FUNCTION upsert_user_experience(
  p_user_id UUID, p_axis_type VARCHAR, p_axis_value VARCHAR, p_xp_delta INT, p_new_level INT
) RETURNS SETOF xp_totals LANGUAGE plpgsql AS $$ ... $$;
```

### refresh_active_xp — 6개월 활성 XP 갱신

```sql
-- 6개월 기준 active_xp / active_verified 일괄 갱신 (크론용)
CREATE OR REPLACE FUNCTION refresh_active_xp() RETURNS void
  LANGUAGE plpgsql AS $$ ... $$;
```

### restaurants_within_radius — PostGIS 반경 검색

```sql
CREATE OR REPLACE FUNCTION restaurants_within_radius(
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_meters INT DEFAULT 2000
) RETURNS TABLE(id UUID, name VARCHAR, genre VARCHAR, area VARCHAR, distance DOUBLE PRECISION)
  LANGUAGE sql STABLE AS $$ ... $$;
```

### normalize_restaurant_name — 식당명 정규화

```sql
-- 공백/특수문자 제거, 소문자
CREATE OR REPLACE FUNCTION normalize_restaurant_name(name TEXT) RETURNS TEXT
  LANGUAGE plpgsql IMMUTABLE AS $$ ... $$;
```

### XP 통계 함수 (LevelDetailSheet용)

```sql
-- 고유 장소/와인 수
CREATE OR REPLACE FUNCTION get_unique_count(p_user_id UUID, p_axis_type TEXT, p_axis_value TEXT)
  RETURNS INT LANGUAGE plpgsql STABLE AS $$ ... $$;

-- 축별 기록 수
CREATE OR REPLACE FUNCTION get_record_count_by_axis(p_user_id UUID, p_axis_type TEXT, p_axis_value TEXT)
  RETURNS INT LANGUAGE plpgsql STABLE AS $$ ... $$;

-- 재방문 횟수
CREATE OR REPLACE FUNCTION get_revisit_count_by_axis(p_user_id UUID, p_axis_type TEXT, p_axis_value TEXT)
  RETURNS INT LANGUAGE plpgsql STABLE AS $$ ... $$;
```

### get_visible_fields — 프라이버시 캐스케이드 해석

```sql
-- 뷰어가 대상 유저의 어떤 필드를 볼 수 있는지 해석
-- 우선순위: is_public/follow_policy 접근 차단 > bubble visibility_override > visibility_bubble > visibility_public
CREATE OR REPLACE FUNCTION get_visible_fields(
  p_viewer_id UUID,
  p_target_user_id UUID,
  p_bubble_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$ ... $$;
```

---

## 12. RLS 전략

### 원칙
- 모든 테이블 RLS 활성화 필수
- SECURITY DEFINER 함수 사용 절대 금지
- RPC 함수는 SECURITY INVOKER로 RLS 정책을 통과
- 멤버십 확인은 PK `(bubble_id, user_id)` 인덱스 활용 — O(1) 조회

### 핵심 정책 요약

```sql
-- users: 본인 CRUD + public 프로필 읽기 + 버블 co-member 읽기
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_own     ON users FOR ALL    USING (id = auth.uid());
CREATE POLICY users_public  ON users FOR SELECT USING (is_public = true);
CREATE POLICY users_bubble  ON users FOR SELECT USING (NOT is_public AND ...);

-- restaurants / wines: 인증 사용자 읽기 + 쓰기
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY restaurants_select ON restaurants FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_insert ON restaurants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY restaurants_update ON restaurants FOR UPDATE USING (auth.uid() IS NOT NULL);

-- lists / records: 본인 CRUD
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists 본인 읽기/쓰기/수정/삭제" ...;

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "records 본인 읽기/쓰기/수정/삭제" ...;

-- records: 같은 버블 멤버도 SELECT 가능 (033 추가)
CREATE POLICY records_bubble_member_read ON records FOR SELECT
  USING (user_id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid() AND bm1.status = 'active' AND bm2.status = 'active'
  ));

-- record_photos: 같은 버블 멤버 읽기 (033 추가)
CREATE POLICY record_photos_bubble_member_read ON record_photos FOR SELECT ...;

-- bubbles: public 읽기 + private 멤버만 + owner 항상 읽기
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bubble_public     ON bubbles FOR SELECT USING (visibility = 'public');
CREATE POLICY bubble_private    ON bubbles FOR SELECT USING (visibility = 'private' AND ...);
CREATE POLICY bubble_owner_read ON bubbles FOR SELECT USING (created_by = auth.uid());

-- bubble_members: 읽기 공개, INSERT 시 role 제한 (owner/admin 자가 지정 방지)
-- UPDATE 시 자기 role 변경 방지 트리거 (034 추가)
ALTER TABLE bubble_members ENABLE ROW LEVEL SECURITY;

-- bubble_shares: 버블 멤버만 읽기, 멤버급(owner/admin/member)만 공유
ALTER TABLE bubble_shares ENABLE ROW LEVEL SECURITY;

-- follows / comments / reactions / notifications / saved_filters: 기본 정책
-- XP 테이블: 본인 CRUD + public 사용자 읽기
```

> **성능 참고**: `EXISTS (SELECT 1 FROM bubble_members WHERE bubble_id = X AND user_id = auth.uid())` 패턴은
> PK `(bubble_id, user_id)` 인덱스로 O(1) 조회.

---

## 13. 삭제된 테이블 (참고용)

다음 테이블은 스키마 리팩토링 중 삭제됨:

| 테이블 | 삭제 시점 | 대체 |
|--------|----------|------|
| `wishlists` | 032 | `lists` (status='wishlist') |
| `bubble_share_reads` | 031 | — |
| `nudge_history` | 031 | — |
| `nudge_fatigue` | 031 | — |
| `grape_variety_profiles` | 031 | — |
| `ai_recommendations` | 031 | — |

> **⚠️ 주의**: `supabase/functions/process-account-deletion/index.ts` Edge Function이 삭제된 테이블명(`xp_histories`, `user_experiences`, `user_milestones`, `wishlists`, `nudge_history`, `nudge_fatigue`)을 아직 참조하고 있음. 해당 함수 업데이트 필요.
