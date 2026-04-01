# DATA_MODEL — 데이터 모델

> affects: 모든 페이지, 모든 시스템

---

## 1. 핵심 엔티티 관계

```
users (1) ─── (N) records
users (1) ─── (N) wishlists
users (1) ─── (N) user_experiences
users (1) ─── (N) saved_filters
users (1) ─── (N) ai_recommendations

restaurants (1) ─── (N) records (target_type='restaurant')
restaurants (1) ─── (N) ai_recommendations (target_type='restaurant')
wines (1) ─── (N) records (target_type='wine')
wines (1) ─── (N) ai_recommendations (target_type='wine')
wines (N) ─── (1) grape_variety_profiles (variety → name)

records (1) ─── (N) record_photos
records (1) ─── (N) bubble_shares ─── (N) bubbles
records (1) ─── (N) comments
records (1) ─── (N) reactions

bubbles (1) ─── (N) bubble_members ─── (N) users
bubble_shares (1) ─── (N) bubble_share_reads ─── (N) users
users (1) ─── (N) follows ─── (N) users
users (1) ─── (N) notifications
users (1) ─── (N) user_milestones ─── (N) milestones

-- 캐시/스냅샷 테이블
-- bubble_ranking_snapshots: 버블 랭킹 주간 스냅샷 (등락 ▲▼ 표시용)

-- 지원 테이블 (FK 관계 없는 독립/참조 테이블)
-- xp_histories: records/users 참조, XP 획득 이력
-- level_thresholds: 레벨별 필요 XP 정의 (시드)
-- nudge_history / nudge_fatigue: 넛지 시스템
```

---

## 2. 테이블 정의

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  nickname VARCHAR(20) NOT NULL,
  handle VARCHAR(20) UNIQUE,         -- @handle 형태의 고유 사용자 ID (프로필 표시용, 03_profile 목업 참조)
  avatar_url TEXT,
  avatar_color VARCHAR(20),             -- 아바타 배경색 (hex, 예: "#C17B5E"). avatar_url 없을 때 이니셜+색상으로 렌더
                                        -- 04_bubbler_profile/04_bubbles 버블러 카드: 그라디언트 시작색 (끝색은 프론트에서 파생)
  bio VARCHAR(100),
  taste_summary TEXT,                -- AI 생성 취향 요약 텍스트 ("을지로 골목을 누비며 캐주얼한 숨은 맛집을 발굴하는 탐험가...")
  taste_tags TEXT[],                 -- AI 생성 취향 태그 배열 ['을지로 전문가','캐주얼 선호','레드 와인파','탐험형']
                                    -- 배열 순서 = 중요도 순 (앞쪽 N개 = highlight 태그, 뒤쪽 = 보조 태그) — 04_bubbler_profile 취향 필
  taste_updated_at TIMESTAMPTZ,      -- 취향 분석 마지막 갱신 시점 (기록 N개 이상 변경 시 재생성)
  preferred_areas TEXT[],           -- 온보딩에서 선택한 동네
  privacy_profile VARCHAR(20) NOT NULL DEFAULT 'bubble_only',  -- 'public' | 'bubble_only' | 'private' → 05_settings: 프라이버시 > 기본 공개 대상
  privacy_records VARCHAR(20) NOT NULL DEFAULT 'shared_only',  -- 'all' | 'shared_only' → 05_settings: 프라이버시 > 기록 범위
                                                      -- (profile이 'private'이면 어차피 전체 비공개이므로 records에 'private' 불필요)
  -- 프라이버시: 공개 범위별 가시성 토글 (05_settings 프라이버시 섹션)
  -- 각 키: score(점수), comment(한줄평), photos(사진), level(레벨 뱃지), quadrant(사분면), bubbles(소속 버블), price(가격 정보)
  visibility_public JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":false,"price":false}',
    -- 전체 공개 시 보이는 항목. price는 기본 false (목업: "버블에서만")
  visibility_bubble JSONB NOT NULL DEFAULT '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":true,"price":true}',
    -- 버블 멤버에게 보이는 항목 기본값. 버블별 커스텀은 bubble_members.visibility_override

  -- 알림 설정 (05_settings 알림 섹션)
  notify_push BOOLEAN NOT NULL DEFAULT true,           -- 푸시 알림 전체 ON/OFF
  notify_level_up BOOLEAN NOT NULL DEFAULT true,       -- 레벨업 알림
  notify_bubble_join BOOLEAN NOT NULL DEFAULT true,    -- 버블 가입 알림
  notify_follow BOOLEAN NOT NULL DEFAULT true,         -- 팔로우 알림
  dnd_start TIME,                             -- 방해 금지 시작 시각 (예: 23:00)
  dnd_end TIME,                               -- 방해 금지 종료 시각 (예: 08:00)

  -- 화면 디폴트 (05_settings 화면 디폴트 섹션)
  pref_landing VARCHAR(20) NOT NULL DEFAULT 'last',        -- 'last' | 'home' | 'bubbles' | 'profile' — 앱 실행 시 첫 화면
  pref_home_tab VARCHAR(20) NOT NULL DEFAULT 'last',       -- 'last' | 'restaurant' | 'wine' — 홈 진입 시 탭
  pref_restaurant_sub VARCHAR(20) NOT NULL DEFAULT 'last', -- 'last' | 'visited' | 'wishlist' | 'recommended' | 'following' — 식당 탭 서브탭
  pref_wine_sub VARCHAR(20) NOT NULL DEFAULT 'last',       -- 'last' | 'tasted' | 'wishlist' | 'cellar' — 와인 탭 서브탭
  pref_bubble_tab VARCHAR(20) NOT NULL DEFAULT 'last',     -- 'last' | 'bubble' | 'bubbler' — 버블 페이지 탭
  pref_view_mode VARCHAR(20) NOT NULL DEFAULT 'last',      -- 'last' | 'detailed' | 'compact' | 'calendar' — 홈 보기 모드 (상세/간단/캘린더)

  -- 기능 디폴트 (05_settings 기능 디폴트 섹션)
  pref_default_sort VARCHAR(20) NOT NULL DEFAULT 'latest',  -- 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count' — 기본 정렬
  pref_record_input VARCHAR(20) NOT NULL DEFAULT 'camera',  -- 'camera' | 'search' — 기록 시 카메라/검색 우선
  pref_bubble_share VARCHAR(20) NOT NULL DEFAULT 'ask',     -- 'ask' | 'auto' | 'never' — 기록 후 버블 공유 방식
  pref_temp_unit VARCHAR(5) NOT NULL DEFAULT 'C',           -- 'C' | 'F' — 와인 온도 단위

  -- 계정 삭제 (05_settings 계정 삭제 시트: 30일 유예 후 영구 삭제)
  deleted_at TIMESTAMPTZ,                          -- 삭제 요청 시점 (NULL이면 활성 계정)
  delete_mode VARCHAR(20),                         -- 'anonymize' | 'hard_delete' — 기록 처리 방식 선택
  delete_scheduled_at TIMESTAMPTZ,                 -- 영구 삭제 예정 시점 (deleted_at + 30일)

  record_count INT NOT NULL DEFAULT 0,            -- 비정규화: 총 기록 수 (04_bubbler_profile: "기록 72", 04_bubbles 버블러 카드: "기록 47개")
  follower_count INT NOT NULL DEFAULT 0,          -- 비정규화: 팔로워 수 (04_bubbler_profile: 프로필 상단 표시)
  following_count INT NOT NULL DEFAULT 0,         -- 비정규화: 팔로잉 수 (04_bubbler_profile: 프로필 상단 표시)
  current_streak INT NOT NULL DEFAULT 0,          -- 연속 기록 주 수 (04_bubbler_profile: 활동 히트맵 "8주 연속 기록 중")
  total_xp INT NOT NULL DEFAULT 0,               -- 누적 XP (절대 안 줄어듦)
  active_xp INT NOT NULL DEFAULT 0,              -- 최근 6개월 XP (자동 갱신)
  active_verified INT NOT NULL DEFAULT 0,         -- 최근 6개월 검증 기록 수
  auth_provider VARCHAR(20) NOT NULL,    -- 'kakao' | 'google' | 'apple' | 'naver'
  auth_provider_id VARCHAR(100) NOT NULL UNIQUE,  -- 소셜 계정 1:1 매핑 (중복 가입 차단)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### restaurants
```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(50) NOT NULL DEFAULT '한국',  -- 국가 (한국, 프랑스, 일본 등) — 식당 통계 세계지도 클러스터용
  city VARCHAR(50) NOT NULL DEFAULT '서울',     -- 도시 (서울, 파리, 도쿄 등) — 세계지도 도시별 그룹핑
  area VARCHAR(50),                -- 생활권 동네명 (광화문, 을지로 등) — 국내 식당 전용
  district VARCHAR(50),            -- 구 (종로구, 강남구 등) — 국내 식당 전용
  genre VARCHAR(30),               -- CHECK: 한식/일식/중식/태국/베트남/인도/이탈리안/프렌치/스페인/지중해/미국/멕시칸/카페/바/주점/베이커리/기타
                                  -- 6대분류: 동아시아(한식,일식,중식) / 동남아·남아시아(태국,베트남,인도) / 유럽(이탈리안,프렌치,스페인,지중해) / 아메리카(미국,멕시칸) / 음료·디저트(카페,바/주점,베이커리) / 기타
  price_range INT,                 -- 1~3 (저가/중간/고가)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,                     -- {"mon": "11:00-22:00", ...}
  photos TEXT[],
  menus JSONB,                     -- 대표 메뉴+가격 [{"name":"오마카세 코스","price":150000},{"name":"런치 오마카세","price":50000}]

  -- 외부 평점
  naver_rating DECIMAL(2,1),
  kakao_rating DECIMAL(2,1),
  google_rating DECIMAL(2,1),

  -- 권위 인증
  michelin_stars INT,              -- NULL or 1,2,3
  has_blue_ribbon BOOLEAN NOT NULL DEFAULT false,
  media_appearances JSONB,         -- TV출연 등 [{"show":"흑백요리사","season":"S1","year":2024}]

  -- nyam 종합 점수 (외부 평점 + 권위 인증 가중 평균. 주기적 재계산 캐시)
  nyam_score DECIMAL(4,1),         -- 0~100. NULL이면 아직 미산출
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,              -- {"kakao": "...", "naver": "...", "google": "..."}
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,     -- 2주 갱신 스케줄

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 가격대 필터 매핑: price_range 1=저가, 2=중간, 3=고가

CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_country_city ON restaurants(country, city);  -- 세계지도 드릴다운
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
  abv DECIMAL(3,1),               -- 알코올 도수
  label_image_url TEXT,
  photos TEXT[],                   -- 와인 사진 배열 (라벨, 병, 코르크 등). 상세 히어로 캐러셀용

  -- 와인 DB 메타
  body_level INT,                  -- 1~5 (DB 기준, 사용자 평가와 별개)
  acidity_level INT,               -- 1~3 (1=낮음, 2=중간, 3=높음)
  sweetness_level INT,             -- 1~3 (1=드라이, 2=오프드라이, 3=스위트)
  food_pairings TEXT[],            -- 영문 키로 저장 ["steak", "lamb", "cheese"]. 프론트에서 한글 변환 (스테이크, 양갈비, 치즈)
  serving_temp VARCHAR(20),        -- "16-18°C"
  decanting VARCHAR(30),            -- "2시간 권장" 등

  reference_price INT,              -- 참고 시세 (원) — 와인 찜 목록 예상 가격 표시 ("≈ 38만")
  drinking_window_start INT,        -- 음용 적기 시작 연도 — 셀러 카드 "마실 적기: 2025~2035"
  drinking_window_end INT,          -- 음용 적기 종료 연도

  -- 외부 평점
  vivino_rating DECIMAL(2,1),       -- Vivino 커뮤니티 평점 (0.0~5.0) — 목업 뱃지 "Vivino 4.5"
  critic_scores JSONB,              -- 외부 평론가 점수 {"RP":97,"WS":95,"JR":18.5,"JH":96}
                                    -- RP=Robert Parker, WS=Wine Spectator, JR=Jancis Robinson, JH=James Halliday

  -- 권위 인증
  classification VARCHAR(100),      -- 와인 등급 (Grand Cru Classé, Premier Cru, DOC, DOCG 등) — 목업 뱃지 표시용

  -- nyam 종합 점수 (외부 평점 + 권위 인증 가중 평균. 주기적 재계산 캐시)
  nyam_score DECIMAL(4,1),          -- 0~100. NULL이면 아직 미산출
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,                -- {"vivino": "...", "wine_searcher": "..."} — restaurants와 동일 패턴
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,      -- 갱신 스케줄 (restaurants와 동일 패턴)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

### records (핵심 테이블)
```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,         -- restaurant_id or wine_id
  target_type VARCHAR(10) NOT NULL, -- 'restaurant' | 'wine'

  -- 상태
  status VARCHAR(10) NOT NULL DEFAULT 'rated', -- 'checked' | 'rated' | 'draft'

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
  axis_x DECIMAL(5,2),             -- 0~100 (식당: 음식 퀄리티, 와인: 구조·완성도)
  axis_y DECIMAL(5,2),             -- 0~100 (식당: 경험 가치, 와인: 즐거움·감성)
  satisfaction INT,                 -- 1~100 computed as (axis_x + axis_y) / 2
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
  companions TEXT[],               -- 함께 간 사람 ⚠️ 무조건 비공개 (본인만 열람, API·버블·프로필 등 외부 노출 절대 금지)
  companion_count INT,              -- 동반자 수 (1=혼자, 2, 3, 4, 5+) — 필터/통계용. companions와 별개, 비공개 아님
  total_price INT,                 -- 식당 1인 결제 금액 (원) — 목업 "가격 (1인)". 총액이 아님 주의
                                    -- 본인 지불 금액 입력 (영수증 AI 인식 또는 수동). 월별 소비 통계 SUM 기준
  purchase_price INT,              -- 구매 가격 (원) — 와인 구매/병 단가. 월별 소비 추적용

  -- 날짜
  visit_date DATE,                 -- 방문/음용 날짜 (wine_status='cellar'일 때는 구매 날짜로 사용)
  meal_time VARCHAR(10),           -- 'breakfast' | 'lunch' | 'dinner' | 'snack' — 캘린더 뷰 시간대 라벨 (EXIF 또는 수동 입력)

  -- 연결
  linked_restaurant_id UUID REFERENCES restaurants(id),  -- 와인 기록의 식당 연결
  linked_wine_id UUID REFERENCES wines(id),              -- 식당 기록의 와인 연결

  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,  -- GPS가 식당 위치 반경 200m 이내일 때 true
  record_quality_xp INT NOT NULL DEFAULT 0,         -- 이 기록으로 획득한 총 XP (비정규화)
  score_updated_at TIMESTAMPTZ,            -- 만족도 점수 마지막 부여 시점 (6개월 제한 기준)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_records_user_type_date ON records(user_id, target_type, visit_date DESC);  -- 홈 피드 (유저+타입+최신순)
CREATE INDEX idx_records_user_satisfaction ON records(user_id, target_type, satisfaction, target_id)  -- 추천 엔진 집계
  WHERE satisfaction IS NOT NULL AND status = 'rated';
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_scene ON records(scene);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_wine_status ON records(user_id, wine_status) WHERE target_type = 'wine';  -- 와인 탭 3분류 필터
CREATE INDEX idx_records_purchase ON records(user_id, visit_date, purchase_price) WHERE purchase_price IS NOT NULL;  -- 월별 소비 집계
CREATE INDEX idx_records_linked_restaurant ON records(linked_restaurant_id) WHERE linked_restaurant_id IS NOT NULL;  -- 와인→식당 연결 조회
CREATE INDEX idx_records_linked_wine ON records(linked_wine_id) WHERE linked_wine_id IS NOT NULL;  -- 식당→와인 연결 조회
```

### record_photos
```sql
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);
```

### wishlists
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,  -- 'restaurant' | 'wine'
  source VARCHAR(10) NOT NULL DEFAULT 'direct',  -- 'direct' | 'bubble' | 'ai' | 'web'
                                        -- direct: 사용자가 직접 찜 (상세 페이지 하트)
                                        -- bubble: 버블 멤버 기록 보고 찜 (reactions.bookmark 트리거)
                                        -- ai: AI 추천에서 찜
                                        -- web: 외부 평점/정보 보고 찜
  source_record_id UUID REFERENCES records(id) ON DELETE SET NULL,  -- source='bubble'일 때 원본 기록 ID
                                                  -- 찜 카드에서 "김영수 93 · 을지로 최고 바베큐" 표시용
                                                  -- source='ai'일 때 ai_recommendations.id 참조도 가능 (target_id로)
  is_visited BOOLEAN NOT NULL DEFAULT false,
  -- 기록 생성 시 동일 target의 wishlist.is_visited = true로 자동 업데이트 (트리거 또는 application layer)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);
CREATE INDEX idx_wishlists_user ON wishlists(user_id, target_type, is_visited);
```

---

## 3. 경험치 관련 테이블

→ 상세: `systems/XP_SYSTEM.md`

```sql
CREATE TABLE user_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  axis_type VARCHAR(20) NOT NULL,   -- 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'
  axis_value VARCHAR(50) NOT NULL,  -- category: 'restaurant' | 'wine' (중간 계층 — 식당 레벨, 와인 레벨)
                                    -- area: '을지로' | '광화문' 등
                                    -- genre: '일식' | '양식' 등
                                    -- wine_variety: 'Cabernet Sauvignon' 등
                                    -- wine_region: '프랑스' 등
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, axis_type, axis_value)
);

-- UNIQUE 제약이 (user_id, axis_type, axis_value) 순서이므로 (user_id, axis_type) 접두사 쿼리 커버됨
-- 추가 인덱스: 같은 축의 다른 사용자 비교 (리더보드 등)
CREATE INDEX idx_user_experiences_axis ON user_experiences(axis_type, axis_value);

CREATE TABLE xp_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,  -- 기록 삭제 시 XP 이력은 유지, 참조만 해제
  axis_type VARCHAR(20),
  axis_value VARCHAR(50),
  xp_amount INT,
  reason VARCHAR(50),  -- 'record_name' | 'record_score' | 'record_photo' | 'record_full'
                       -- | 'category' | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual'
                       -- | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share'
                       -- | 'milestone'  ← 03_profile 레벨 디테일 시트 XP 구성에 마일스톤 항목 존재
                       -- | 'revisit'    ← 재방문 XP (최근 경험치 목록의 "재방문 2차" 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xp_histories_user_created ON xp_histories(user_id, created_at DESC);  -- 최근 경험치 리스트 + 월간 XP 합계
CREATE INDEX idx_xp_histories_axis ON xp_histories(user_id, axis_type, axis_value);    -- 레벨 디테일 XP 구성 (reason별 집계)

CREATE TABLE level_thresholds (
  level INT PRIMARY KEY,
  required_xp INT NOT NULL,
  title VARCHAR(20),              -- 레벨 칭호: "입문자"(1-3), "초보 미식가"(4-5), "탐식가"(6-7), "미식가"(8-9), "식도락 마스터"(10+)
                                  -- SSOT: XP_SYSTEM.md §5 레벨 칭호 테이블
  color VARCHAR(10)
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  axis_type VARCHAR(20) NOT NULL,    -- 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region' | 'global'
  metric VARCHAR(30) NOT NULL,       -- 'unique_places' | 'total_records' | 'revisits' | 'unique_wines' 등
  threshold INT NOT NULL,            -- 달성 기준값 (10, 20, 30, 50, 100...)
  xp_reward INT NOT NULL,            -- 달성 시 보너스 XP (+25, +30, +50...)
  label VARCHAR(50) NOT NULL         -- 표시 텍스트 ("50번째 고유 장소", "100번째 기록" 등)
);
CREATE INDEX idx_milestones_axis_threshold ON milestones(axis_type, metric, threshold);  -- 다음 마일스톤 조회
-- 03_profile 레벨 디테일 시트의 "다음 마일스톤" 기능 지원
-- 예: axis_type='area', metric='unique_places', threshold=50, xp_reward=30, label='50번째 고유 장소'

CREATE TABLE user_milestones (
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID NOT NULL REFERENCES milestones(id),
  axis_value VARCHAR(50) NOT NULL DEFAULT '_global',  -- '을지로' 등 (global 마일스톤은 '_global'. PK 포함이므로 NOT NULL 필수)
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id, milestone_id, axis_value)
);
-- user_milestones로 달성 여부 추적 + 다음 마일스톤 계산 가능

-- 레벨 커브는 XP_SYSTEM.md §5 참조. 게임 스타일 비선형 커브.
-- 공식: required_xp = ROUND(base * (level^exponent - 1)), base/exponent는 XP_SYSTEM.md 정의
-- 주요 마일스톤: Lv.2=3XP, Lv.10=48XP, Lv.30=396XP, Lv.50=2,036XP, Lv.72≈10,000XP
-- INSERT 값은 XP_SYSTEM.md §5 테이블에서 생성. seed 스크립트에서 일괄 삽입.

```

### 비정규화 갱신

> **트리거 기반 실시간 갱신 + 크론 기반 일/주간 갱신으로 이원화.**
> 상세: §10 "비정규화 업데이트 전략" 참조.

---

## 4. 소셜 관련 테이블

→ 상세: `pages/BUBBLE.md`

```sql
CREATE TABLE bubbles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(20) NOT NULL,
  description VARCHAR(100),
  focus_type VARCHAR(20) NOT NULL DEFAULT 'all',        -- 'all' | 'restaurant' | 'wine' (라벨일 뿐, 제한 없음)
  area VARCHAR(50),                           -- 버블 주요 지역 (을지로, 광화문 등) — 04_bubbles 필터: 지역
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',   -- 'private' | 'public'
  content_visibility VARCHAR(20) NOT NULL DEFAULT 'rating_only',  -- 'rating_only' | 'rating_and_comment'
                                                         -- UI 라벨: rating_and_comment → "양방향", rating_only → "일방향"
                                                         -- 04_bubbles_detail 설정: "유형: 양방향"
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  allow_external_share BOOLEAN NOT NULL DEFAULT false,

  -- 가입 정책 (04_bubbles 생성 화면 + 04_bubbles_detail 설정 화면)
  join_policy VARCHAR(20) NOT NULL DEFAULT 'invite_only',  -- 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
                                                   -- invite_only: 비공개 — 초대받은 사람만 가입
                                                   -- closed: 공개 — 팔로우만 (가입 안 받음, 이름+점수만 열람)
                                                   -- manual_approve: 공개 — 가입 신청 → 관리자 승인/거절
                                                   -- auto_approve: 공개 — 기준 충족 시 자동 가입
                                                   -- open: 공개 — 누구나 바로 가입
  min_records INT NOT NULL DEFAULT 0,                  -- 가입 최소 기록 수 (04_bubbles_detail 설정: "최소 기록 수 5개")
  min_level INT NOT NULL DEFAULT 0,                    -- 가입 최소 레벨 (04_bubbles_detail 설정: "최소 레벨 Lv.3")
  max_members INT,                            -- 최대 인원 (NULL=무제한) (04_bubbles_detail 설정: "최대 인원 20명")
  rules TEXT[],                               -- 버블 규칙 텍스트 배열 (04_bubbles_detail info sheet: "직장 주변 식당 위주로...")

  -- 검색/탐색 (04_bubbles_detail 설정: 검색 노출)
  is_searchable BOOLEAN NOT NULL DEFAULT true,          -- 탐색에 노출 여부
  search_keywords TEXT[],                     -- 검색 키워드 배열

  -- 비정규화: 기본 카운트 (트리거 실시간 갱신)
  follower_count INT NOT NULL DEFAULT 0,               -- 팔로워 수 (role='follower')
  member_count INT NOT NULL DEFAULT 0,                 -- 멤버 수 (role in 'owner','admin','member') — 04_bubbles: "멤버 8명"
  record_count INT NOT NULL DEFAULT 0,                 -- 총 기록 수 — 04_bubbles: "기록 47개", 소팅 "기록 많은순"
  avg_satisfaction DECIMAL(4,1),              -- 평균 만족도 — 04_bubbles_detail 통계: "평균 점수 87" (크론 일간)
  last_activity_at TIMESTAMPTZ,               -- 최신 활동 시점 — 04_bubbles 소팅: "최신 활동순"

  -- 비정규화: 통계 캐시 (크론 일/주간 갱신) — 04_bubbles_detail 통계칩 + 설정 통계
  unique_target_count INT NOT NULL DEFAULT 0,          -- 고유 장소/와인 수 — 04_bubbles_detail 통계: "고유 장소 15"
  weekly_record_count INT NOT NULL DEFAULT 0,          -- 이번 주 기록수 — 04_bubbles_detail 통계: "이번 주 6"
  prev_weekly_record_count INT NOT NULL DEFAULT 0,     -- 지난 주 기록수 — 04_bubbles_detail 설정 통계: "주간 활성도 +12%" 계산용

  -- 아이콘
  icon TEXT,                                  -- lucide 아이콘명 (예: 'utensils-crossed', 'wine', 'flame')
                                              -- 또는 커스텀 이미지 URL. 프론트에서 URL 형식이면 이미지, 아니면 lucide 렌더
  icon_bg_color VARCHAR(10),                  -- 아이콘 배경색 hex (04_bubbles: "#F5EDE8", "#F0ECF3" 등 버블마다 상이)
  created_by UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bubble_members (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member' | 'follower'
  -- 기존 'subscriber' → 'follower'로 변경. follower도 동일 테이블에 저장.
  status VARCHAR(10) NOT NULL DEFAULT 'active',  -- 'pending' | 'active' | 'rejected'
                                        -- pending: 가입 신청 대기 (알림 수락/거절 버튼)
                                        -- active: 가입 승인 완료
                                        -- rejected: 거절됨 (재신청 방지용)
  -- 버블별 프라이버시 커스텀 (05_settings 버블별 설정 시트)
  -- NULL이면 users.visibility_bubble 기본값 사용 ("기본값" 배지)
  -- JSONB면 이 버블에서만 적용 ("커스텀" 배지). 키는 visibility_bubble과 동일
  visibility_override JSONB,  -- 예: {"score":true,"comment":true,"photos":false,"level":true,"quadrant":true,"bubbles":true,"price":false}

  -- 멤버 활동 캐시 (크론 일/주간 갱신) — 04_bubbles_detail 멤버 탭 + 버블러 프로필 컨텍스트
  taste_match_pct DECIMAL(4,1),           -- 뷰어와의 취향 일치도 (0.0~100.0). 뷰어 로그인 시 재계산 (application layer)
                                          -- 04_bubbles_detail 멤버 카드: "91%", 멤버 소팅 "일치도순"
                                          -- 04_bubbler_profile 컨텍스트: "나와 취향 일치도 78%"
  common_target_count INT NOT NULL DEFAULT 0,      -- 뷰어와 공통 방문 장소/와인 수. taste_match_pct와 동시 갱신
                                          -- 04_bubbler_profile 컨텍스트: "같이 가본 곳 8곳"
  avg_satisfaction DECIMAL(4,1),          -- 이 멤버의 버블 내 평균 만족도 (크론 일간)
                                          -- 04_bubbles_detail 멤버 탭 "나" 카드: "88점"
  member_unique_target_count INT NOT NULL DEFAULT 0, -- 이 멤버의 버블 내 고유 장소/와인 수 (크론 일간)
                                          -- 04_bubbles_detail 멤버 카드: "8곳"
  weekly_share_count INT NOT NULL DEFAULT 0,       -- 이번 주 공유 수 (크론 주간 리셋)
                                          -- 04_bubbler_profile 컨텍스트: "이번 주 순위 1위/8명" 계산용
  badge_label VARCHAR(30),                -- 버블 내 대표 배지 라벨 (크론 일간, milestones 기반)
                                          -- 04_bubbles_detail 멤버 카드: "🧭 탐험왕" (고유장소 최다 등)

  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(bubble_id, user_id)
);

CREATE INDEX idx_bubble_members_active ON bubble_members(bubble_id, role, status) WHERE status = 'active';  -- 활성 멤버 목록/RLS
CREATE INDEX idx_bubble_members_user ON bubble_members(user_id, bubble_id) WHERE status = 'active';          -- 사용자의 소속 버블 조회

CREATE TABLE bubble_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,  -- 기록 삭제 시 공유도 제거
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(record_id, bubble_id)
);

CREATE INDEX idx_bubble_shares_bubble ON bubble_shares(bubble_id, shared_at DESC);  -- 버블 피드 페이지네이션
CREATE INDEX idx_bubble_shares_record ON bubble_shares(record_id);                  -- 기록→공유된 버블 조회
CREATE INDEX idx_bubble_shares_user ON bubble_shares(shared_by);                    -- 사용자별 공유 이력

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,  -- 'record' (버블에서 같은 대상에 대한 다른 멤버의 기록도 record)
  target_id UUID NOT NULL,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE CASCADE,  -- 버블 삭제 시 댓글도 삭제
  user_id UUID REFERENCES users(id),
  content VARCHAR(300) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, bubble_id);  -- 기록별 버블 내 댓글 조회

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(10) NOT NULL,  -- 'record' | 'comment'
  target_id UUID NOT NULL,
  reaction_type VARCHAR(10) NOT NULL,  -- 'like' | 'bookmark' | 'want' | 'check' | 'fire'
                                       -- like: 좋아요 ❤️ (피드 하단)
                                       -- bookmark: 찜 → wishlists INSERT 트리거
                                       -- want: "가고싶다" (04_bubbles_detail 피드 리액션 버튼)
                                       -- check: "나도가봤어" (04_bubbles_detail 피드 리액션 버튼)
                                       -- fire: "맛있어보인다" (04_bubbles_detail 피드 리액션 버튼)
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_type, target_id, reaction_type, user_id)
);

CREATE INDEX idx_reactions_target ON reactions(target_type, target_id, reaction_type);  -- 리액션 타입별 카운트

-- 피드 읽음 확인 (04_bubbles_detail: "외 4명이 봤어요")
CREATE TABLE bubble_share_reads (
  share_id UUID NOT NULL REFERENCES bubble_shares(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(share_id, user_id)
);

-- 랭킹 스냅샷 (04_bubbles_detail 랭킹 탭: 등락 ▲3/▼1/NEW 표시용)
-- 크론 주간 생성. 이번 주 rank - 지난 주 rank = 등락. 지난 주 없으면 "NEW"
CREATE TABLE bubble_ranking_snapshots (
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,                   -- restaurant_id or wine_id
  target_type VARCHAR(10) NOT NULL,          -- 'restaurant' | 'wine'
  period_start DATE NOT NULL,                -- 스냅샷 기준 주 시작일 (월요일)
  rank_position INT NOT NULL,                -- 해당 주 순위
  avg_satisfaction DECIMAL(4,1),             -- 해당 주 평균 만족도
  record_count INT NOT NULL DEFAULT 0,                -- 해당 주 기록 수
  PRIMARY KEY(bubble_id, target_id, target_type, period_start)
);

CREATE INDEX idx_ranking_snapshots_bubble_period ON bubble_ranking_snapshots(bubble_id, target_type, period_start DESC);

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',  -- 'pending' | 'accepted' | 'rejected'
                                          -- pending: 팔로우 요청 대기 (알림 수락/거절 버튼)
                                          -- accepted: 수락 완료
                                          -- rejected: 거절됨
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_follows_no_self CHECK (follower_id != following_id),
  PRIMARY KEY(follower_id, following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);  -- 맞팔 확인 + "이 사람을 팔로우하는 사람" 조회

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),   -- 알림 수신자 (반드시 존재)
  notification_type VARCHAR(30) NOT NULL,
  -- ── 06_notifications 목업: 5가지 핵심 알림 ──
  -- 'level_up'              — 레벨 달성 ("을지로 레벨 4 달성!", "와인 레벨 7 달성!")
  -- 'bubble_join_request'   — 버블 가입 신청 (관리자에게, 인라인 수락/거절)
  -- 'bubble_join_approved'  — 버블 가입 승인 (신청자에게, "'와인러버' 가입이 승인되었어요")
  -- 'follow_request'        — 팔로우 요청 (대상자에게, 인라인 수락/거절)
  -- 'follow_accepted'       — 팔로우 수락 (요청자에게, "박민호님이 팔로우를 수락했어요")
  -- ── 기타 알림 (03_profile, 04_bubbles 등 타 목업 출처) ──
  -- 'bubble_invite'         — 버블 초대 (초대받은 사람에게, 수락/거절)
  -- 'bubble_new_record'     — 버블에 새 기록 공유됨 (04_bubbles 배너: "직장 맛집에 새 피드가 올라왔어요")
  -- 'bubble_member_joined'  — 버블에 새 멤버 합류 (04_bubbles 배너: "와인 모임에 새 멤버가 합류했습니다")
  -- 'reaction_like'         — 내 기록에 좋아요
  -- 'comment_reply'         — 내 기록에 댓글
  actor_id UUID REFERENCES users(id),   -- 알림을 유발한 사용자 (level_up은 NULL)
  target_type VARCHAR(20),              -- 타입별 target 매핑:
                                        -- level_up:           'user_experiences'  (target_id → user_experiences.id → axis_value/level 조회)
                                        -- bubble_new_record:  'record'           (target_id → records.id → 기록 대상명/점수 조회)
                                        -- reaction_like:      'record'           (target_id → records.id → 좋아요 대상 기록)
                                        -- comment_reply:      'comment'          (target_id → comments.id → content/기록 대상 조회)
                                        -- follow_request:     NULL               (actor_id가 요청자, user_id가 대상자)
                                        -- follow_accepted:    NULL               (actor_id가 수락자)
                                        -- bubble_join_request: NULL              (actor_id가 신청자, bubble_id로 버블 조회)
                                        -- bubble_join_approved: NULL             (bubble_id로 버블 조회)
                                        -- bubble_invite:      NULL               (actor_id가 초대자, bubble_id로 버블 조회)
                                        -- bubble_member_joined: NULL            (actor_id가 합류한 멤버, bubble_id로 버블 조회)
  target_id UUID,                       -- target_type에 따른 참조 ID (위 매핑 참조, NULL 허용)
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL, -- 버블 삭제 시 알림 기록은 보존, 버블 참조만 해제

  metadata JSONB,                      -- 렌더링용 비정규화 데이터 (JOIN 없이 알림 드롭다운 바로 표시)
  -- 06_notifications 목업 렌더링 예시:
  --   level_up(지역):       {"axis_value":"을지로","level":4,"axis_type":"area"}
  --   level_up(와인):       {"axis_value":"wine","level":7,"axis_type":"category"}
  --   bubble_join_request:  {"actor_name":"김영수","bubble_name":"을지로 맛탐정 클럽"}
  --   bubble_join_approved: {"bubble_name":"와인러버"}
  --   follow_request:       {"actor_name":"이수진"}
  --   follow_accepted:      {"actor_name":"박민호"}
  --   bubble_invite:        {"actor_name":"...","bubble_name":"..."}
  --   bubble_new_record:    {"actor_name":"...","bubble_name":"...","target_name":"..."}
  --   bubble_member_joined: {"actor_name":"...","bubble_name":"와인 모임"}
  --   reaction_like:        {"actor_name":"...","target_name":"..."}
  --   comment_reply:        {"actor_name":"...","comment_preview":"..."}

  is_read BOOLEAN NOT NULL DEFAULT false,       -- 06_notifications: unread dot + 굵은 제목 + 헤더 벨 뱃지
  action_status VARCHAR(10),           -- 'pending' | 'accepted' | 'rejected' | NULL
  -- 액션 있는 알림: bubble_join_request, follow_request, bubble_invite (06_notifications: 인라인 수락/거절 버튼)
  -- NULL: 액션 불필요 (level_up, follow_accepted, bubble_join_approved 등)
  -- 06_notifications: 처리 후 버튼 → 결과 텍스트 ("수락 완료" / "거절됨")

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);  -- 06_notifications 드롭다운: 미읽음 우선, 최신순
```

---

## 5. 넛지 관련 테이블

```sql
CREATE TABLE nudge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  nudge_type VARCHAR(30) NOT NULL,  -- 'location' | 'time' | 'photo' | 'unrated' | 'new_area' | 'weekly'
  target_id UUID,
  status VARCHAR(10) NOT NULL,      -- 'sent' | 'opened' | 'acted' | 'dismissed' | 'skipped'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_nudge_history_user ON nudge_history(user_id, created_at DESC);

CREATE TABLE nudge_fatigue (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  score INT NOT NULL DEFAULT 0,
  last_nudge_at TIMESTAMPTZ,
  paused_until TIMESTAMPTZ
);
```

---

## 5-1. 저장 필터 (홈 필터칩)

> 홈 화면의 Notion-style 필터 엔진에서 사용자가 저장한 필터 프리셋.
> 필터칩 이름을 지정하고 탭하면 해당 필터 조합이 즉시 적용됨.

```sql
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(20) NOT NULL,          -- 필터칩 표시 이름
  target_type VARCHAR(20) NOT NULL,   -- 'restaurant' | 'wine' | 'bubble' | 'bubbler' | 'bubble_feed' | 'bubble_ranking' | 'bubble_member'
                                      -- bubble: 04_bubbles 버블 탭 필터칩
                                      -- bubbler: 04_bubbles 버블러 탭 필터칩
                                      -- bubble_feed: 04_bubbles_detail 피드 탭 필터칩
                                      -- bubble_ranking: 04_bubbles_detail 랭킹 탭 필터칩
                                      -- bubble_member: 04_bubbles_detail 멤버 탭 필터칩
  context_id UUID,                    -- 컨텍스트 ID (bubble_feed/ranking/member → bubble_id, 나머지 NULL)
  rules JSONB NOT NULL,               -- 필터 규칙 배열
                                      -- [{"attr":"scene","op":"is","value":"solo"},
                                      --  {"conjunction":"and","attr":"genre","op":"is","value":"일식"}]
                                      -- 식당/와인 속성: scene, genre, area, satisfaction, visit_date, companions, prestige, price_range
                                      -- 버블 속성: area(지역), focus_type(유형), member_count(멤버 수), activity(활성도), join_policy(가입 방식)
                                      -- 버블러 속성: level(레벨), record_count(기록 수), taste_match(취향 일치), bubble(소속 버블), area(활동 지역)
                                      -- 버블 피드 속성: target_type(유형), member(멤버), period(시기), satisfaction(점수)
                                      -- 버블 랭킹 속성: period(기간), target_type(유형), member(멤버)
                                      -- 버블 멤버 속성: role(역할), taste_match(일치도), level(레벨), follow_status(팔로우)
                                      -- 지원 연산: is, is_not, contains, not_contains, gte, lt
                                      --
                                      -- ── 복합 속성 매핑 (쿼리 엔진 구현 참조) ──
                                      -- prestige → restaurants.michelin_stars IS NOT NULL
                                      --            OR restaurants.has_blue_ribbon = true
                                      --            OR restaurants.media_appearances IS NOT NULL
                                      -- value 예: "michelin_1" | "michelin_2" | "michelin_3" | "blue_ribbon" | "tv"
                                      --
                                      -- ── 그룹 중첩 (AND-of-ORs) ──
                                      -- [{"attr":"scene","op":"is","value":"solo"},
                                      --  {"conjunction":"and","group":[
                                      --    {"attr":"genre","op":"is","value":"일식"},
                                      --    {"conjunction":"or","attr":"genre","op":"is","value":"프렌치"}]}]
  sort_by VARCHAR(20),                -- 저장된 소팅 (최신순, 점수높은순, 점수낮은순, 이름순, 방문많은순)
  order_index INT NOT NULL DEFAULT 0,          -- 칩 표시 순서
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id, target_type);
CREATE INDEX idx_saved_filters_context ON saved_filters(user_id, target_type, context_id) WHERE context_id IS NOT NULL;
```

---

## 5-2. AI 추천

> 홈 추천 탭(식당·와인)의 AI 기반 개인화 추천.
> 사용자 기록 패턴 분석 → 추천 대상 + 사유 텍스트 생성.
> 버블 추천은 별도 테이블 불필요 (bubble_shares + records 조인으로 도출).

```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,            -- restaurant_id or wine_id
  target_type VARCHAR(10) NOT NULL,   -- 'restaurant' | 'wine'
  reason TEXT NOT NULL,               -- AI 추천 사유 ("오마카세를 좋아하시니까 여기도 좋아하실 거예요")
  algorithm VARCHAR(30),              -- 추천 알고리즘 식별자 (taste_match, new_area, bubble_popular 등)
  confidence DECIMAL(3,2),            -- 추천 확신도 0.00~1.00
  is_dismissed BOOLEAN NOT NULL DEFAULT false, -- 사용자가 무시한 추천
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ              -- 추천 만료 시점 (주기적 갱신)
);

CREATE INDEX idx_ai_rec_user ON ai_recommendations(user_id, target_type, is_dismissed);
CREATE INDEX idx_ai_rec_expires ON ai_recommendations(expires_at) WHERE NOT is_dismissed;
```

---

## 5-3. 포도 품종 프로필 (통계 차트용)

> 03_profile 와인 통계 탭의 "품종" 차트가 껍질 두께 순서(얇음→두꺼움)로 정렬됨.
> wines.body_level은 개별 와인의 바디감이지 품종 자체의 표준 특성이 아니므로,
> 품종별 기본 특성 참조 테이블이 필요함.
> **WSET Level 2 + Level 3 전체 커버리지 기준 (55종)**

```sql
CREATE TABLE grape_variety_profiles (
  name VARCHAR(100) PRIMARY KEY,         -- 품종명 (영문 기준: 'Cabernet Sauvignon', 'Pinot Noir' 등)
  name_ko VARCHAR(100) NOT NULL,         -- 한글명 ('카베르네 소비뇽', '피노 누아')
  body_order INT NOT NULL,               -- 바디 순서 (1=가장 가벼움) — 차트 정렬 기준
  category VARCHAR(10) NOT NULL,         -- 'red' | 'white' — 레드/화이트 구분
  typical_body INT,                      -- 전형적 바디감 1~5 (참고용)
  typical_acidity INT,                   -- 전형적 산미 1~3 (참고용)
  typical_tannin INT                     -- 전형적 타닌 1~5 (참고용, 레드 전용)
);

-- ═══════════════════════════════════════════════════════
-- WSET L2+L3 완전 커버리지 seed 데이터 (55종)
-- 품종 자동 입력이므로 필터에서도 전체 노출
-- ═══════════════════════════════════════════════════════

-- ── WHITE (23종, body_order 1~23: 라이트→풀바디) ──
-- 1: Muscat (뮈스카) — L2 Principal, Alsace/Piedmont
-- 2: Glera (글레라) — L2 Regional, Veneto (Prosecco)
-- 3: Cortese (코르테제) — L2 Regional, Piedmont (Gavi)
-- 4: Melon de Bourgogne (멜롱 드 부르고뉴) — L3, Loire (Muscadet)
-- 5: Trebbiano (트레비아노) — L2 Regional, Central Italy
-- 6: Albarino (알바리뇨) — L2 Regional, Spain (Rias Baixas)
-- 7: Riesling (리슬링) — L2 Principal
-- 8: Pinot Grigio (피노 그리) — L2 Principal
-- 9: Sauvignon Blanc (소비뇽 블랑) — L2 Principal
-- 10: Gruner Veltliner (그뤼너 벨트리너) — L3, Austria
-- 11: Garganega (가르가네가) — L2 Regional, Veneto (Soave)
-- 12: Verdicchio (베르디키오) — L3, Marche
-- 13: Vermentino (베르멘티노) — L2/L3, Sardinia/Liguria
-- 14: Assyrtiko (아시르티코) — L3, Greece (Santorini)
-- 15: Arneis (아르네이스) — L3, Piedmont (Roero)
-- 16: Friulano (프리울라노) — L3, Friuli
-- 17: Furmint (푸르민트) — L2 Principal, Hungary (Tokaj)
-- 18: Falanghina (팔랑기나) — L3, Campania
-- 19: Fiano (피아노) — L3, Campania
-- 20: Greco (그레코) — L3, Campania
-- 21: Chenin Blanc (슈냉 블랑) — L2 Principal, Loire/South Africa
-- 22: Semillon (세미용) — L2 Principal, Bordeaux/Hunter Valley
-- 23: Gewurztraminer (게뷔르츠트라미너) — L2 Principal, Alsace
-- 24: Marsanne (마르산느) — L3, N. Rhone
-- 25: Roussanne (루산느) — L3, N. Rhone
-- 26: Viognier (비오니에) — L2 Principal, N. Rhone
-- 27: Chardonnay (샤르도네) — L2 Principal (climate-dependent)
-- 28: Torrontes (토론테스) — L3, Argentina (Salta)
-- 29: Grillo (그릴로) — L3, Sicily
-- 30: Carricante (카리칸테) — L3, Sicily (Etna)
-- 31: Pecorino (페코리노) — L3, Abruzzo/Marche
-- 32: Vernaccia (베르나차) — L3, Tuscany (San Gimignano)
-- 33: Catarratto (카타라토) — L3, Sicily

-- ── RED (32종, body_order 34~65: 라이트→풀바디) ──
-- 34: Schiava (스키아바) — L3, Alto Adige
-- 35: Frappato (프라파토) — L3, Sicily
-- 36: Gamay (가메) — L2 Principal, Beaujolais
-- 37: Dolcetto (돌체토) — L2 Regional, Piedmont
-- 38: Cinsault (생소) — L3, S. Rhone/Languedoc
-- 39: Pinot Noir (피노 누아) — L2 Principal
-- 40: Corvina (코르비나) — L2 Regional, Veneto (Amarone)
-- 41: Nerello Mascalese (네렐로 마스칼레제) — L3, Sicily (Etna)
-- 42: Lambrusco (람브루스코) — L3, Emilia-Romagna
-- 43: Barbera (바르베라) — L2 Regional, Piedmont
-- 44: Cabernet Franc (카베르네 프랑) — L3, Loire/Bordeaux
-- 45: Grenache (그르나슈) — L2 Principal, S. Rhone/Spain
-- 46: Carignan (카리냥) — L3, Languedoc
-- 47: Sangiovese (산지오베제) — L2 Regional, Tuscany
-- 48: Tempranillo (템프라니요) — L2 Principal, Rioja
-- 49: Merlot (메를로) — L2 Principal
-- 50: Montepulciano (몬테풀치아노) — L2 Regional, Abruzzo
-- 51: Nero d'Avola (네로 다볼라) — L2 Regional, Sicily
-- 52: Carmenere (카르메네르) — L2 Regional, Chile
-- 53: Pinotage (피노타주) — L2 Regional, South Africa
-- 54: Zinfandel (진판델) — L2 Regional, USA/Puglia (=Primitivo)
-- 55: Negroamaro (네그로아마로) — L3, Puglia
-- 56: Syrah (쉬라즈) — L2 Principal
-- 57: Nebbiolo (네비올로) — L2 Regional, Piedmont
-- 58: Malbec (말벡) — L2 Principal, Argentina
-- 59: Cabernet Sauvignon (카베르네 소비뇽) — L2 Principal
-- 60: Mourvedre (무르베드르) — L3, S. Rhone/Bandol
-- 61: Aglianico (알리아니코) — L3, Campania
-- 62: Sagrantino (사그란티노) — L3, Umbria
-- 63: Touriga Nacional (투리가 나시오날) — L3, Portugal (Douro)
-- 64: Tannat (타나) — L3, SW France/Uruguay
-- 65: Petit Verdot (프티 베르도) — L3, Bordeaux
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
| `decanting` | 디캔팅 | `#A0896C` (탄) |

> 색상은 DESIGN_SYSTEM.md의 상황 태그 색상과 동일하게 유지. Tailwind 원색 사용 금지.

### 식사시간 ENUM (캘린더 뷰)
| 값 | 표시명 | 비고 |
|----|--------|------|
| `breakfast` | 아침 | ~11:00 |
| `lunch` | 점심 | 11:00~15:00 |
| `dinner` | 저녁 | 15:00~ |
| `snack` | 간식 | 비정규 식사 |

> `records.meal_time`에 저장. EXIF 촬영 시각에서 자동 추론하거나 사용자가 수동 선택.
> 캘린더 뷰에서 같은 날 여러 기록이 있을 때 "점심"/"저녁" 라벨로 구분.

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

---

## 9. CHECK 제약조건

```sql
-- 와인 전용 필드가 식당 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_wine_fields
  CHECK (target_type = 'wine' OR (
    aroma_regions IS NULL AND aroma_labels IS NULL AND aroma_color IS NULL
    AND wine_status IS NULL AND camera_mode IS NULL
    AND ocr_data IS NULL AND complexity IS NULL AND finish IS NULL
    AND balance IS NULL AND auto_score IS NULL AND pairing_categories IS NULL
    AND purchase_price IS NULL
  ));

-- 식당 전용 필드가 와인 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_restaurant_fields
  CHECK (target_type = 'restaurant' OR (
    total_price IS NULL
  ));
```

---

## 10. 비정규화 업데이트 전략

### 트리거 (실시간 — 즉시 반영 필요한 카운트)

모든 트리거는 `SET col = col ± 1` 증분 방식. 서브쿼리로 전체 카운트 재계산 금지.

```sql
-- users.record_count: records INSERT/DELETE 시
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

-- users.follower_count / following_count: follows INSERT/UPDATE/DELETE 시
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

-- bubbles.member_count + follower_count: bubble_members INSERT/UPDATE/DELETE 시
-- member_count: role in ('owner','admin','member') AND status='active'
-- follower_count: role='follower' AND status='active'
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count()
RETURNS TRIGGER AS $$
  -- 헬퍼: 역할이 멤버급인지 팔로워인지 판별
  DECLARE
    v_old_is_member BOOLEAN := false;
    v_new_is_member BOOLEAN := false;
    v_old_is_follower BOOLEAN := false;
    v_new_is_follower BOOLEAN := false;
  BEGIN
    IF TG_OP IN ('UPDATE','DELETE') THEN
      v_old_is_member   := OLD.status = 'active' AND OLD.role IN ('owner','admin','member');
      v_old_is_follower := OLD.status = 'active' AND OLD.role = 'follower';
    END IF;
    IF TG_OP IN ('INSERT','UPDATE') THEN
      v_new_is_member   := NEW.status = 'active' AND NEW.role IN ('owner','admin','member');
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

-- bubbles.record_count + last_activity_at: bubble_shares INSERT/DELETE 시
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

### 크론 (일/주간 — 실시간 정확도 불필요)

```sql
-- 매일: 활성 XP + 활성 검증 기록 수 재계산
UPDATE users SET
  active_xp = (
    SELECT COALESCE(SUM(record_quality_xp), 0)
    FROM records WHERE user_id = users.id
      AND created_at > NOW() - INTERVAL '6 months'
  ),
  active_verified = (
    SELECT COUNT(*) FROM records WHERE user_id = users.id
      AND is_exif_verified = true
      AND created_at > NOW() - INTERVAL '6 months'
  );

-- 주간: 연속 기록 주 (application layer에서 연속성 검사 후 UPDATE 권장)

-- 일간: 버블 통계 캐시 (avg_satisfaction + unique_target_count)
UPDATE bubbles SET
  avg_satisfaction = (
    SELECT AVG(r.satisfaction)
    FROM bubble_shares bs JOIN records r ON r.id = bs.record_id
    WHERE bs.bubble_id = bubbles.id AND r.satisfaction IS NOT NULL
  ),
  unique_target_count = (
    SELECT COUNT(DISTINCT r.target_id)
    FROM bubble_shares bs JOIN records r ON r.id = bs.record_id
    WHERE bs.bubble_id = bubbles.id
  );

-- 주간 (월요일 크론): 버블 주간 기록수 롤링 + 랭킹 스냅샷
UPDATE bubbles SET
  prev_weekly_record_count = weekly_record_count,
  weekly_record_count = (
    SELECT COUNT(*) FROM bubble_shares
    WHERE bubble_id = bubbles.id AND shared_at >= date_trunc('week', NOW())
  );

-- 주간: bubble_members 멤버 활동 캐시 갱신
UPDATE bubble_members bm SET
  avg_satisfaction = (
    SELECT AVG(r.satisfaction)
    FROM bubble_shares bs JOIN records r ON r.id = bs.record_id
    WHERE bs.bubble_id = bm.bubble_id AND bs.shared_by = bm.user_id AND r.satisfaction IS NOT NULL
  ),
  member_unique_target_count = (
    SELECT COUNT(DISTINCT r.target_id)
    FROM bubble_shares bs JOIN records r ON r.id = bs.record_id
    WHERE bs.bubble_id = bm.bubble_id AND bs.shared_by = bm.user_id
  ),
  weekly_share_count = (
    SELECT COUNT(*) FROM bubble_shares
    WHERE bubble_id = bm.bubble_id AND shared_by = bm.user_id
      AND shared_at >= date_trunc('week', NOW())
  )
WHERE bm.status = 'active';

-- 주간: 랭킹 스냅샷 생성 (이전 주 기준)
INSERT INTO bubble_ranking_snapshots (bubble_id, target_id, target_type, period_start, rank_position, avg_satisfaction, record_count)
SELECT
  bs.bubble_id, r.target_id, r.target_type,
  date_trunc('week', NOW() - INTERVAL '1 week')::DATE AS period_start,
  ROW_NUMBER() OVER (PARTITION BY bs.bubble_id, r.target_type ORDER BY AVG(r.satisfaction) DESC) AS rank_position,
  AVG(r.satisfaction), COUNT(*)
FROM bubble_shares bs JOIN records r ON r.id = bs.record_id
WHERE bs.shared_at >= date_trunc('week', NOW() - INTERVAL '1 week')
  AND bs.shared_at < date_trunc('week', NOW())
  AND r.satisfaction IS NOT NULL
GROUP BY bs.bubble_id, r.target_id, r.target_type
ON CONFLICT (bubble_id, target_id, target_type, period_start) DO UPDATE SET
  rank_position = EXCLUDED.rank_position,
  avg_satisfaction = EXCLUDED.avg_satisfaction,
  record_count = EXCLUDED.record_count;

-- 주간: 멤버 배지 갱신 (버블 내 고유장소 최다 → "탐험왕" 등)
-- application layer에서 bubble_members.member_unique_target_count 기준 MAX → badge_label 설정 권장
```

---

## 11. Database Functions (RPC)

### get_bubble_feed — 버블 피드 (N+1 방지)

```sql
-- 버블 피드: 기록 + 대상 정보 + 작성자 정보 + 사진 + 리액션/댓글/읽음을 한 번에 조회
-- 04_bubbles_detail 피드 카드 렌더링에 필요한 모든 데이터를 단일 쿼리로 반환
-- SECURITY INVOKER — RLS 정책 따름, SECURITY DEFINER 사용 금지
CREATE OR REPLACE FUNCTION get_bubble_feed(
  p_bubble_id UUID,
  p_user_id UUID,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  share_id UUID,
  record_id UUID,
  shared_at TIMESTAMPTZ,
  shared_by UUID,
  -- record data
  target_id UUID,
  target_type VARCHAR,
  satisfaction INT,
  comment VARCHAR,
  visit_date DATE,
  scene VARCHAR,
  -- target info (식당명/와인명 + 메타) — 04_bubbles_detail: "미진" "한식 · 을지로"
  target_name VARCHAR,            -- restaurants.name 또는 wines.name
  target_meta JSONB,              -- 식당: {"genre":"한식","area":"을지로"}
                                  -- 와인: {"wine_type":"red","variety":"카베르네 소비뇽"}
  -- photos — 04_bubbles_detail: feed-photos 영역 (최대 3장)
  photo_urls TEXT[],              -- record_photos에서 order_index 순 집계
  -- author — 04_bubbles_detail: feed-avatar + feed-user-name + feed-user-level
  author_nickname VARCHAR,
  author_avatar TEXT,
  author_avatar_color VARCHAR,    -- 아바타 이미지 없을 때 이니셜+색상 렌더용
  author_handle VARCHAR,
  author_level INT,               -- user_experiences(category, target_type과 동일 카테고리) 기준 레벨
  -- aggregates
  reaction_counts JSONB,    -- {"like":3,"want":1,"check":2,"fire":0}
  user_reactions JSONB,     -- {"like":true,"want":false,...} 현재 유저의 리액션
  comment_count BIGINT,
  read_count BIGINT
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    bs.id AS share_id,
    bs.record_id,
    bs.shared_at,
    bs.shared_by,
    r.target_id, r.target_type, r.satisfaction, r.comment, r.visit_date, r.scene,
    -- target info: 식당/와인 이름 + 메타
    CASE r.target_type
      WHEN 'restaurant' THEN rst.name
      WHEN 'wine' THEN w.name
    END AS target_name,
    CASE r.target_type
      WHEN 'restaurant' THEN jsonb_build_object('genre', rst.genre, 'area', rst.area)
      WHEN 'wine' THEN jsonb_build_object('wine_type', w.wine_type, 'variety', w.variety)
    END AS target_meta,
    -- photos (배열 집계)
    COALESCE(ph.urls, '{}'::TEXT[]) AS photo_urls,
    -- author
    u.nickname AS author_nickname, u.avatar_url AS author_avatar,
    u.avatar_color AS author_avatar_color, u.handle AS author_handle,
    COALESCE(ue.level, 1) AS author_level,
    -- 리액션 카운트 (lateral subquery)
    COALESCE(rc.counts, '{}'::JSONB) AS reaction_counts,
    COALESCE(ur.user_reacts, '{}'::JSONB) AS user_reactions,
    COALESCE(cc.cnt, 0) AS comment_count,
    COALESCE(rr.cnt, 0) AS read_count
  FROM bubble_shares bs
    JOIN records r ON r.id = bs.record_id
    JOIN users u ON u.id = bs.shared_by
    LEFT JOIN restaurants rst ON r.target_type = 'restaurant' AND rst.id = r.target_id
    LEFT JOIN wines w ON r.target_type = 'wine' AND w.id = r.target_id
    LEFT JOIN LATERAL (
      SELECT array_agg(url ORDER BY order_index) AS urls
      FROM record_photos WHERE record_id = r.id
    ) ph ON true
    LEFT JOIN LATERAL (
      SELECT level FROM user_experiences
      WHERE user_id = bs.shared_by AND axis_type = 'category'
        AND axis_value = r.target_type
    ) ue ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(reaction_type, cnt) AS counts
      FROM (SELECT reaction_type, COUNT(*) AS cnt FROM reactions
            WHERE target_type = 'record' AND target_id = r.id
            GROUP BY reaction_type) sub
    ) rc ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(reaction_type, true) AS user_reacts
      FROM reactions
      WHERE target_type = 'record' AND target_id = r.id AND user_id = p_user_id
    ) ur ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM comments
      WHERE target_type = 'record' AND target_id = r.id AND bubble_id = p_bubble_id
    ) cc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM bubble_share_reads WHERE share_id = bs.id
    ) rr ON true
  WHERE bs.bubble_id = p_bubble_id
    AND (p_cursor IS NULL OR bs.shared_at < p_cursor)
  ORDER BY bs.shared_at DESC
  LIMIT p_limit;
$$;
```

### get_visible_fields — 프라이버시 캐스케이드 해석

```sql
-- 뷰어가 대상 유저의 어떤 필드를 볼 수 있는지 해석
-- 05_settings 프라이버시 3단계: privacy_profile → visibility 레이어 → 버블별 override
-- 우선순위: privacy_profile 접근 차단 > bubble visibility_override > visibility_bubble > visibility_public
CREATE OR REPLACE FUNCTION get_visible_fields(
  p_viewer_id UUID,
  p_target_user_id UUID,
  p_bubble_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER
AS $$
DECLARE
  v_privacy VARCHAR;
  v_result JSONB;
  v_is_co_member BOOLEAN := false;
  v_override JSONB;
  v_all_false CONSTANT JSONB := '{"score":false,"comment":false,"photos":false,"level":false,"quadrant":false,"bubbles":false,"price":false}'::JSONB;
BEGIN
  -- 본인이면 전체 공개
  IF p_viewer_id = p_target_user_id THEN
    RETURN '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":true,"price":true}'::JSONB;
  END IF;

  -- privacy_profile 확인 (05_settings: 기본 공개 대상)
  SELECT u.privacy_profile INTO v_privacy FROM users u WHERE u.id = p_target_user_id;

  -- 'private': 나에게만 보임 (05_settings: "프로필과 기록이 나에게만 보입니다. 버블 공유도 불가")
  IF v_privacy = 'private' THEN
    RETURN v_all_false;
  END IF;

  -- 버블 컨텍스트에서 co-member 확인
  IF p_bubble_id IS NOT NULL THEN
    SELECT bm.visibility_override INTO v_override
    FROM bubble_members bm
    WHERE bm.bubble_id = p_bubble_id AND bm.user_id = p_target_user_id AND bm.status = 'active';

    IF FOUND THEN
      SELECT EXISTS(
        SELECT 1 FROM bubble_members
        WHERE bubble_id = p_bubble_id AND user_id = p_viewer_id AND status = 'active'
      ) INTO v_is_co_member;

      IF v_is_co_member THEN
        -- visibility_override가 있으면 사용, 없으면 visibility_bubble
        IF v_override IS NOT NULL THEN
          RETURN v_override;
        ELSE
          SELECT u.visibility_bubble INTO v_result FROM users u WHERE u.id = p_target_user_id;
          RETURN v_result;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 'bubble_only': 버블 co-member가 아닌 외부 뷰어 → 비공개
  -- (위 co-member 블록에서 이미 RETURN했으므로, 여기 도달 = co-member 아님)
  IF v_privacy = 'bubble_only' THEN
    RETURN v_all_false;
  END IF;

  -- 'public': 외부 뷰어에게 visibility_public 반환
  SELECT u.visibility_public INTO v_result FROM users u WHERE u.id = p_target_user_id;
  RETURN COALESCE(v_result, '{"score":true,"comment":true,"photos":true,"level":true,"quadrant":true,"bubbles":false,"price":false}'::JSONB);
END;
$$;
```

---

## 12. RLS 전략

### 원칙
- 모든 테이블 RLS 활성화 필수
- SECURITY DEFINER 함수 사용 절대 금지
- RPC 함수는 SECURITY INVOKER로 RLS 정책을 통과
- 멤버십 확인은 PK `(bubble_id, user_id)` 인덱스 활용 — O(1) 조회

### 핵심 정책 패턴

```sql
-- records: 본인 기록만 CRUD
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY records_owner ON records
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- bubble_shares: 같은 버블 멤버만 읽기, 본인 기록만 공유
ALTER TABLE bubble_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY bubble_shares_read ON bubble_shares FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bubble_members
    WHERE bubble_id = bubble_shares.bubble_id
      AND user_id = auth.uid()
      AND status = 'active'
  ));
CREATE POLICY bubble_shares_insert ON bubble_shares FOR INSERT
  WITH CHECK (shared_by = auth.uid());

-- bubbles: 멤버/팔로워만 읽기 (public 버블은 is_searchable이면 누구나)
ALTER TABLE bubbles ENABLE ROW LEVEL SECURITY;
CREATE POLICY bubbles_member_read ON bubbles FOR SELECT
  USING (
    visibility = 'public'
    OR EXISTS (
      SELECT 1 FROM bubble_members
      WHERE bubble_id = bubbles.id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

-- comments, reactions: 버블 멤버만 (bubble_id 기준)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_bubble_read ON comments FOR SELECT
  USING (
    bubble_id IS NULL  -- 버블 외 댓글 (향후)
    OR EXISTS (
      SELECT 1 FROM bubble_members
      WHERE bubble_id = comments.bubble_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
```

> **성능 참고**: `EXISTS (SELECT 1 FROM bubble_members WHERE bubble_id = X AND user_id = auth.uid())` 패턴은
> PK `(bubble_id, user_id)` 인덱스로 O(1) 조회. 대규모에서도 성능 문제 없음.
> 피드 등 대량 조회는 `get_bubble_feed` RPC 함수로 멤버십 1회 체크 후 데이터 반환.
