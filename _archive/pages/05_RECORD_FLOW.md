# RECORD_FLOW — 기록 플로우

> depends_on: RATING_ENGINE, SEARCH_REGISTER, DATA_MODEL, DESIGN_SYSTEM, XP_SYSTEM
> affects: HOME, RESTAURANT_DETAIL, WINE_DETAIL, RECORD_DETAIL
> prototype: `prototype/01_home.html` (screen-add-restaurant, screen-add-wine, screen-rest-record, screen-wine-record)

---

## 1. 핵심 원칙

**기록은 카메라 촬영 → AI 인식 → 통합 기록 화면 → 저장의 단일 플로우다.**

| 경로 | 설명 | 결과 |
|------|------|------|
| **카메라 경로** | 촬영/앨범 → AI 인식 → 통합 기록 화면 (AI pre-fill) | `status: 'visited'`(식당) / `'tasted'`(와인) — 사분면·태그·코멘트 등 포함 |
| **검색/목록 경로** | 이름 검색 or GPS 목록 선택 | `status: 'visited'`(식당) / `'tasted'`(와인) — 최소 데이터만, 풍성화는 상세페이지에서 |
| **상세 FAB 경로** | 식당/와인 상세 페이지 FAB → 바로 통합 기록 화면 | `status: 'visited'`(식당) / `'tasted'`(와인) — 대상 선택 스킵 |

**카메라 경로가 Primary이며, AI가 최대한 자동 입력한다.**
검색/목록은 폴백이고, 풍성화는 상세페이지에서 언제든 가능.

---

## 2. 진입점

### 홈 FAB (+) → 현재 탭 기반 직접 진입

```
홈 [+] 탭
    ↓
현재 탭 판별 (currentHomeTab)
    ↓
┌─ 식당 탭 ──→ screen-add-restaurant (카메라 촬영)
│
└─ 와인 탭 ──→ screen-add-wine (라벨 촬영)
```

- 바텀시트 없이 현재 활성 탭에 따라 바로 해당 기록 플로우 진입
- FAB 스펙: 44×44px, glassmorphism `rgba(248,246,243,0.88)` + blur(12px), z-index 85 (DESIGN_SYSTEM 참조)

### 상세 페이지 FAB (+)

| 진입 | 동작 |
|------|------|
| 식당 상세 FAB | 식당 선택 스킵 → 바로 식당 기록 화면 (screen-rest-record) |
| 와인 상세 FAB | 와인 선택 스킵 → 바로 와인 기록 화면 (screen-wine-record) |
| 기록 있을 때 | "새 방문 추가" (이전 기록 참조점 표시) |
| 미방문 상태 | "첫 기록 남기기" |

### 기타 진입점

| 진입 | 경로 |
|------|------|
| 추천 카드 "다녀왔어요" | 대상 특정 완료 → 기록 화면 |
| 넛지 스트립 "기록하기" | 사진 감지 기반 → 기록 화면 |
| 재방문/재시음 | 상세 → FAB → 기록 화면 (이전 평가 반투명 참조) |

### URL 파라미터

기록 화면은 `/record` 라우트이며, 다음 URL 파라미터로 초기화:

| 파라미터 | 설명 |
|---------|------|
| `type` | `'restaurant'` \| `'wine'` |
| `from` | 진입 경로 (`'camera'`, `'detail'` 등) — 저장 후 네비게이션 결정 |
| `edit` | 기존 record ID (수정 모드) |
| `targetId` | 식당/와인 UUID |
| `name` | 대상 이름 |
| `meta` | 대상 메타 (장르·지역 등) |
| `lat` / `lng` | GPS 좌표 (EXIF 검증용) |
| `vintage` | 와인 빈티지 (힌트) |
| `variety` | 와인 품종 (힌트) |
| `producer` | 와인 생산자 (힌트) |

### sessionStorage 데이터

| 키 | 용도 |
|----|------|
| `nyam_captured_photo_url` | 카메라 촬영 사진 Blob URL |
| `nyam_ai_prefill` | AI 인식 결과 `{genre?, foodType?}` |
| `nyam_genre_hint` | 장르 힌트 문자열 |
| `nyam_record_extra` | 추가 메타 `{categoryPath?, address?, distance?}` |

---

## 3. 식당 기록 플로우

### Step 1: 카메라 촬영 (screen-add-restaurant)

```
┌──────────────────────────────┐
│ [←]    식당 추가          [✕] │  record-nav
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │    🍴                 │    │  카메라 뷰파인더
│  │  음식 사진을 촬영하세요 │    │
│  │                      │    │
│  │        [📷]           │    │  camera-btn (food-btn)
│  └──────────────────────┘    │
│  음식 또는 식당 사진을 촬영하면 │  camera-hint
│  자동으로 인식합니다          │
│                              │
│  [🖼 앨범에서 추가]           │  폴백 1 → 동일 AI 인식
│  [🔍 목록에서 추가]           │  폴백 2 → screen-add-restaurant-search
│                              │
└──────────────────────────────┘
```

#### AI 인식 후 분기

```
사진 촬영 (or 앨범)
    ↓
OCR + 사진 매칭 + GPS 위치 조합
    ↓
┌─ 확실한 매칭 (1곳) ──→ 바로 기록 화면 (screen-rest-record)
│
└─ 여러 후보 ──→ 후보 목록 표시 → 사용자 선택 → 기록 화면
```

### Step 1-B: 검색/목록 폴백 (screen-add-restaurant-search)

```
┌──────────────────────────────┐
│ [←]    식당 검색          [✕] │
├──────────────────────────────┤
│ [🔍 식당 이름 검색...]        │  rec-search-input
│                              │
│ 검색 결과 (입력 시 표시)       │
│  스시코우지                   │
│  일식 · 교대역    [기록 있음]  │  기록 있으면 primary 뱃지
│  ─────────────────────────── │
│  스시코우지 을지로점           │
│  일식 · 을지로3가             │
│                              │
│ 📍 근처 식당                 │  GPS 기반 nearby 목록
│  🍴 스시코우지  일식·을지로  120m  [기록 있음] │
│  🍴 몽탄       한식·을지로  350m               │
│  🍴 을지로 골목집  한식·을지로3가  500m          │
│  🍴 라 메종  프렌치·을지로  650m                │
│  🍴 리스토란테 에오  이탈리안·청담  1.2km        │
│                              │
│  [⊕ 목록에 없나요? 직접 등록]  │  직접 등록 진입
└──────────────────────────────┘
```

- 검색/목록에서 선택 시 → 토스트 알림 + 홈 이동 (`status: 'visited'`)
- 이미 기록한 항목 → "기록 있음" 뱃지 + 토스트 → 상세페이지 이동

### Step 2: 식당 통합 기록 화면 (screen-rest-record)

**카메라 경로 or 상세 FAB에서 진입. AI가 자동 입력한 단일 화면.**

```
┌──────────────────────────────┐
│ [←]                      [✕] │  AppHeader + FabBack
├──────────────────────────────┤
│ ┌─────┐ 스시코우지            │  AI 인식 결과 헤더
│ │ 🍴  │ 카테고리 · 주소 · 거리 │  RestaurantTarget 정보
│ └─────┘                      │  ※ 식당은 현재 AI 뱃지 미표시
├──────────────────────────────┤
│ 방문 날짜                     │
│ [2026-04-02]                 │  date input, max=today
├──────────────────────────────┤
│ 음식 종류       (선택)        │  RestaurantGenre 버튼 그리드
│ [한식] [일식✓] [중식] [양식]  │  ALL_GENRES에서 동적 로드
│ [아시안] [카페] [바] ...      │  단일 선택 (토글)
├──────────────────────────────┤
│ 📷 사진                      │  PhotoPicker (최대 10장)
│ [카메라] [갤러리]              │  촬영/선택 → 크롭 에디터
│ [📸] [📸] [📸]              │  썸네일 그리드, 드래그 재정렬
├──────────────────────────────┤
│ 어떤 곳이었나요?               │
│ ┌─────────────────────────┐  │
│ │ [맛,음식]  [경험  ]      │  │  좌측: 세로 바 게이지 2개
│ │ [완성도]  [만족도]       │  │  각 바 터치로 0~100 조절
│ │ [■■■44]  [■■■■56]      │  │
│ │          ┌──────────┐   │  │
│ │  총점    │ ●        │   │  │  우측: 사분면 (2D 캔버스)
│ │   50    │      ·   │   │  │  참조점(과거 기록) 반투명
│ │          │    ·    │   │  │  터치/드래그로 현재 점 배치
│ │          └──────────┘   │  │
│ └─────────────────────────┘  │
│                              │
│ 가격대                        │  PriceLevelSelector
│ [저가] [중간✓] [고가]         │  3단계, 단일 선택 (토글)
├──────────────────────────────┤
│ 어떤 상황이었나요?             │  SceneTagSelector
│ [혼밥] [데이트✓] [친구]       │  SCENE_TAGS 6종
│ [가족] [회식] [술자리]        │  단일 선택 (토글)
├──────────────────────────────┤
│ 한줄평             (선택)     │
│ [________________________]   │  200자 제한
├──────────────────────────────┤
│ 추천 메뉴           (선택)    │  menuTags 입력
│ [스시✕] [사케동✕]             │  칩 + 입력 필드
│ [메뉴 이름 입력______] [추가]  │
├──────────────────────────────┤
│ 같이 마신 와인      (선택)    │
│ [⊕ 와인 검색]                │  LinkSearchSheet 모달
│ 또는                         │
│ 🍷 Château Margaux 2018     │  연결된 와인 카드 + [해제]
├──────────────────────────────┤
│ ─── 🔒 나만 보는 기록 ───     │  비공개 영역 구분선
│ 아래 내용은 버블·프로필·검색에  │
│ 공개되지 않습니다              │
├──────────────────────────────┤
│ 누구와 함께?        (선택)    │  CompanionInput
│ [김] 김영수  [✕]              │  최근 동행자 자동 제안 (빈도순 top10)
│ [⊕ 동반자 추가]               │
├──────────────────────────────┤
│ 지출내역            (선택)    │  totalPrice 입력
│ [85,000] 원                  │  영수증 인식 라벨
├──────────────────────────────┤
│ 개인 메모            (선택)   │  privateNote
│ [________________________]   │  500자 제한
├──────────────────────────────┤
│     [저장]  또는  [수정완료]   │  RecordSaveBar (하단 고정)
│     [삭제] (수정모드만)        │  variant="food"
└──────────────────────────────┘
```

#### 사분면 인터랙션

| 요소 | 스펙 |
|------|------|
| **축 정의 (식당)** | X=맛,음식 완성도 (0~100), Y=경험 만족도 (0~100) |
| **좌측 바 게이지** | 2개 (X축, Y축), 터치/드래그로 개별 조절, 게이지 색상 gradient |
| **총점** | `Math.round((x + y) / 2)` — 바 게이지 아래 표시 |
| **참조 점 (기존 기록)** | 반투명 (opacity 0.3), 고정 20px, 최대 12개, 클릭→상세 표시, 롱프레스→상세 이동 |
| **현재 기록 점** | 고정 20px, 사분면 터치/드래그로 위치 배치 |
| **만족도** | `(x + y) / 2` 자동 계산 — 독립 드래그 아님 |
| **점 색상** | 만족도 기반 게이지 색상 (`getGaugeColor(totalScore, channel)`) |
| **glow 효과** | 만족도에 비례하는 box-shadow |
| **사분면 라벨** | info 버튼 토글로 4영역 라벨 표시/숨김 |
| **힌트 말풍선** | 사분면 미터치 시 저장 버튼 클릭하면 자동 스크롤 + 힌트 표시 |
| **진동 피드백** | 점 배치 시 `navigator.vibrate(10)` |

#### 사분면 영역 라벨 (식당)

| 영역 | 라벨 | 색상 |
|------|------|------|
| 우상 (맛↑경험↑) | "맛도 좋고\n경험도 좋은" | 녹색 (#3A7D5C) |
| 좌상 (맛↓경험↑) | "맛은 아쉽지만\n경험이 좋은" | 황갈 (#7A6C3A) |
| 우하 (맛↑경험↓) | "경험은 아쉽지만\n맛이 좋은" | 청색 (#4A6FA5) |
| 좌하 (맛↓경험↓) | "전반적으로\n아쉬운" | 적갈 (#9E6B6B) |

#### 와인 연결

```
[⊕ 와인 검색] 탭
    ↓
LinkSearchSheet 바텀시트 (type="wine")
    ↓
검색 입력 (최소 2자, 디바운스 300ms)
    ↓
GET /api/wines/search?q=...
    ↓
결과 선택 → 자동 연결 + 시트 닫힘
```

| 상태 | 동작 |
|------|------|
| 연결된 와인 있음 | 와인명 + 메타 표시, `--accent-wine` 테두리, [해제] 버튼 |
| 연결 없음 | "⊕ 와인 검색" 버튼 (dashed border) |

---

## 4. 와인 기록 플로우

### Step 1: 카메라 촬영 (screen-add-wine)

```
┌──────────────────────────────┐
│ [←]    와인 추가          [✕] │  record-nav (--wine 색상)
├──────────────────────────────┤
│                              │
│  ┌──────────────────────┐    │
│  │    🍷                 │    │  카메라 뷰파인더
│  │  라벨을 맞춰주세요     │    │
│  │                      │    │
│  │        [📷]           │    │  camera-btn (wine-btn)
│  └──────────────────────┘    │
│  와인 라벨을 촬영하면 자동으로 │  camera-hint
│  인식합니다                  │
│                              │
│  [🖼 앨범에서 추가]           │  폴백 1 → 동일 AI 인식
│  [🔍 이름으로 검색]           │  폴백 2 → screen-add-wine-search
│  [📐 진열장]                 │  여러 병 동시 촬영 (cameraMode='shelf')
│  [🧾 영수증]                 │  구매 목록 정리 (cameraMode='receipt')
│                              │
└──────────────────────────────┘
```

**와인은 5가지 입력 방식 제공**: 카메라(라벨), 앨범, 이름 검색, 진열장(다수 병), 영수증(구매 목록)

#### AI 인식 후 확인 (screen-add-wine-confirm)

```
┌──────────────────────────────┐
│ [←]    와인 확인          [✕] │
├──────────────────────────────┤
│                              │
│     이 와인이 맞나요?         │  17px weight 700
│                              │
│  ┌─────────────────────────┐ │
│  │ 🍷  Chateau Margaux     │ │  wine-confirm-card
│  │     Red · Bordeaux       │ │
│  │     2018                 │ │
│  │     [레드]               │ │  타입 칩
│  └─────────────────────────┘ │
│                              │
│  [맞아요]                    │  → addWine() → screen-wine-record
│  [다른 와인이에요]            │  → goBack()
│                              │
└──────────────────────────────┘
```

### Step 1-B: 와인 검색 (screen-add-wine-search)

```
┌──────────────────────────────┐
│ [←]    와인 검색          [✕] │
├──────────────────────────────┤
│ [🔍 와인 이름을 입력하세요]    │  wine-focus 스타일
│                              │
│ Chateau Margaux 2018          │
│ Red · Bordeaux, France        │
│ ───────────────────────────  │
│ Chateau Margaux 2015          │
│ Red · Bordeaux    [기록 있음]  │  wine-light 배경 뱃지
│ ───────────────────────────  │
│ Chateau Margaux 2010          │
│ Red · Bordeaux, France        │
│                              │
│ 와인 이름이나 생산자를 입력하세요 │  힌트 (검색 전)
└──────────────────────────────┘
```

### Step 2: 와인 통합 기록 화면 (screen-wine-record)

**카메라/확인 → 또는 상세 FAB에서 진입. 와인 메타 자동 채움 + WSET 기반 평가.**

```
┌──────────────────────────────┐
│ [←]                      [✕] │  AppHeader + FabBack
├══════════════════════════════╡
│ 섹션1: 기본 정보              │
├──────────────────────────────┤
│ ┌─────┐ Chateau Margaux      │  와인 아이콘 + 이름
│ │ 🍷  │ [Red]  등급 Vivino RP│  wineType 칩(클릭→순환) + 스코어
│ └─────┘ 2018  Winery         │  vintage(숫자입력) + producer(텍스트)
│         적정가 ——~—— 원      │  referencePriceMin~Max
│ Country › Region › Sub-region│  NyamSelect 3단 캐스케이드
│ 🍇 Cabernet Sauvignon ×     │  품종 칩 (복수), wineType 기반 필터
│ Light Body | Med Acid | Dry  │  bodyLevel, acidityLevel, sweetnessLevel
│ | ABV 14.5%                  │  NyamSelect + 숫자 입력
│ 🌡 16-18°C · 디캔팅 1h       │  servingTemp, decanting (AI 데이터시만)
│ 📅 음용 2020-2035            │  drinkingWindowStart~End (AI 데이터시만)
│ 🍴 Steak, Lamb, Cheese      │  foodPairings (AI 추천, 읽기전용)
│ "Dark fruits, cedar..."     │  tastingNotes (AI 요약, 이탤릭)
│ [추가정보] → 가격 분석 모달   │  priceReview 있을 때만
├══════════════════════════════╡
│ 섹션2: 사진                  │
├──────────────────────────────┤
│ 📷 [카메라] [갤러리]          │  PhotoPicker (최대 10장)
│ [📸] [📸]                   │  크롭, 재정렬, 공개/비공개 토글
├══════════════════════════════╡
│ 섹션3: 테이스팅               │
├──────────────────────────────┤
│ 테이스팅                      │
│ ┌─────────────────────────┐  │
│ │ [구조  ]  [즐거움]       │  │  좌측: 세로 바 게이지 2개
│ │ [완성도]  [감성 ]       │  │  X=구조·완성도, Y=즐거움·감성
│ │ [■■44]   [■■■56]       │  │
│ │          ┌──────────┐   │  │
│ │  총점    │    ●     │   │  │  우측: 사분면 (2D 캔버스)
│ │   50    │  ·  ·   │   │  │  참조점 반투명, 현재 점 터치/드래그
│ │          └──────────┘   │  │
│ └─────────────────────────┘  │
├──────────────────────────────┤
│ 향 프로필    AI 감지          │  AromaWheel (인터랙티브 SVG)
│ ┌──────────────────────┐     │
│ │ Ring 1 (1차향, 외곽)   │     │  8섹터, 각 45°
│ │ Ring 2 (2차향, 중간)   │     │  4섹터, 각 90°
│ │ Ring 3 (3차향, 안쪽)   │     │  3섹터, 각 120°
│ └──────────────────────┘     │  탭→토글, 선택 시 섹터 고유 색상
├──────────────────────────────┤
│ 구조 평가          (선택)     │  WineStructureEval
│ 복합성     [───●──────] 30   │  AI 초기값: 아로마 링 수 기반
│ 여운       [─────●────] 8초  │  0~100 → 1~15초 환산
│ 균형       [───────●──] 50   │  0=불균형, 100=완벽한 조화
├══════════════════════════════╡
│ 섹션4: 페어링                │
├──────────────────────────────┤
│ 페어링                       │  PairingGrid (grid-cols-2, 2열 4행)
│ ┌───────────┐┌───────────┐  │
│ │🥩 적색육    ││🍗 백색육    │  │  Beef, Drumstick
│ │스테이크·양갈비││닭·돼지·토끼 │  │  복수 선택
│ └───────────┘└───────────┘  │
│ ┌───────────┐┌───────────┐  │
│ │🐟 어패류    ││🥛 치즈·유제품│  │  Fish, Milk
│ │생선·갑각류  ││숙성치즈·크림 │  │
│ └───────────┘└───────────┘  │
│ ┌───────────┐┌───────────┐  │
│ │🌿 채소·곡물 ││🔥 매운·발효 │  │  Leaf, Flame
│ │버섯·리조또  ││커리·마라·김치│  │
│ └───────────┘└───────────┘  │
│ ┌───────────┐┌───────────┐  │
│ │🍬 디저트·과일││🥜 샤퀴트리  │  │  Candy, Nut
│ │초콜릿·타르트││하몽·아몬드  │  │  ·견과
│ └───────────┘└───────────┘  │
│ [직접 입력: _______________]  │  pairingCustom 텍스트
├══════════════════════════════╡
│ 섹션5: 테이스팅 노트          │
├──────────────────────────────┤
│ 테이스팅 노트      (선택)     │
│ [________________________]   │  200자 제한 (comment와 동기화)
├══════════════════════════════╡
│ 섹션6: 기타 정보             │
├──────────────────────────────┤
│ 기타 정보          (선택)     │
│ 구입가  [89,000] 원          │  purchasePrice
│ 음용일  [2026-04-02]         │  visitDate (date input)
│ 식당    [⊕ 식당 검색]        │  LinkSearchSheet (type="restaurant")
├──────────────────────────────┤
│ ─── 🔒 나만 보는 기록 ───     │  비공개 영역 구분선
│ 아래 내용은 버블·프로필·검색에  │
│ 공개되지 않습니다              │
├──────────────────────────────┤
│ 개인 메모            (선택)   │  privateNote
│ [________________________]   │  500자 제한
├──────────────────────────────┤
│     [저장]  또는  [수정완료]   │  RecordSaveBar (하단 고정)
│     [삭제] (수정모드만)        │  variant="wine"
└──────────────────────────────┘
```

#### 사분면 영역 라벨 (와인)

| 영역 | 라벨 |
|------|------|
| 우상 (구조↑감성↑) | "잘 만들어졌고\n마시면서도 좋은" |
| 좌상 (구조↓감성↑) | "완성도는 아쉽지만\n마시면서 좋았던" |
| 우하 (구조↑감성↓) | "잘 만들어졌지만\n감흥이 적은" |
| 좌하 (구조↓감성↓) | "전반적으로\n아쉬운" |

#### 와인 메타 필드 (섹션1 상세)

와인 기록 시 AI가 자동 채우고, 사용자가 수정 가능한 와인 메타데이터:

| 필드 | 타입 | UI |
|------|------|-----|
| producer | string | 텍스트 인라인 입력 |
| vintage | number | 숫자 인라인 입력 (1900~현재) |
| country | string | NyamSelect 드롭다운 |
| region | string | NyamSelect (country 기반 필터) |
| subRegion | string | NyamSelect (region 기반 필터) |
| appellation | string | UI 미표시 (target 초기값 → 저장에만 포함) |
| wineType | WineType | 칩 클릭→순환 / NyamSelect |
| variety | string[] | 복수 선택 칩 (wineType 기반 필터), 비율 표시 |
| bodyLevel | 1~5 | NyamSelect (Light~Full) |
| acidityLevel | 1~3 | NyamSelect (Low~High) |
| sweetnessLevel | 1~3 | NyamSelect (Dry~Sweet) |
| abv | number | 숫자 인라인 입력 (%) |
| classification | string | 읽기전용 뱃지 |
| servingTemp | string | 읽기전용 (AI 데이터시만) |
| decanting | string | 읽기전용 (AI 데이터시만) |
| referencePriceMin/Max | number | 인라인 숫자 입력 (원) |
| drinkingWindowStart/End | number | 읽기전용 (AI 데이터시만) |
| vivinoRating | number | 읽기전용 스코어 |
| criticScores.RP/WS | number | 읽기전용 스코어 |
| tastingNotes | string | 이탤릭 텍스트 (AI 요약) |
| foodPairings | string[] | 읽기전용 목록 (AI 추천) |

저장 시 `wineMetaUpdate` 객체로 wines 테이블에 PATCH 업데이트.

#### 가격 분석 모달 (priceReview)

와인에 `priceReview` 데이터가 있을 때 "추가정보" 버튼으로 표시:

| 필드 | 설명 |
|------|------|
| verdict | `'buy'` (구매 추천, 녹색) / `'conditional_buy'` (조건부, 황색) / `'avoid'` (비추천, 적색) |
| summary | 분석 요약 텍스트 |
| alternatives | 같은 가격대 대안 와인 목록 `{name, price}[]` |

#### 페어링 8카테고리 상세

| 카테고리 | 아이콘 | PairingCategory 값 | 예시 |
|---------|--------|-------------------|------|
| 적색육 | Beef | `red_meat` | 스테이크 · 양갈비 · 오리 · 사슴 |
| 백색육 | Drumstick | `white_meat` | 닭 · 돼지 · 송아지 · 토끼 |
| 어패류 | Fish | `seafood` | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| 치즈·유제품 | Milk | `cheese` | 숙성치즈 · 블루 · 브리 · 크림소스 |
| 채소·곡물 | Leaf | `vegetable` | 버섯 · 트러플 · 리조또 · 파스타 |
| 매운·발효 | Flame | `spicy` | 커리 · 마라 · 김치 · 된장 |
| 디저트·과일 | Candy | `dessert` | 다크초콜릿 · 타르트 · 건과일 |
| 샤퀴트리·견과 | Nut | `charcuterie` | 하몽 · 살라미 · 아몬드 · 올리브 |

#### 아로마 휠 상세

| 링 | 섹터 수 | 섹터 ID | 한국어명 | 고유 색상(hex) |
|----|---------|---------|---------|---------------|
| Ring 1 (1차향, 외곽) | 8 | `citrus` | 시트러스 | #fde047 |
| | | `apple_pear` | 사과/배 | #a3e635 |
| | | `tropical` | 열대과일 | #fb923c |
| | | `stone_fruit` | 핵과 | #fda4af |
| | | `red_berry` | 붉은베리 | #f87171 |
| | | `dark_berry` | 검은베리 | #a855f7 |
| | | `floral` | 꽃 | #f472b6 |
| | | `white_floral` | 흰꽃 | #fef3c7 |
| Ring 2 (2차향, 중간) | 4 | `butter` | 버터/브리오슈 | #fde68a |
| | | `vanilla` | 바닐라/토스트 | #d97706 |
| | | `spice` | 향신료 | #991b1b |
| | | `herb` | 허브 | #4ade80 |
| Ring 3 (3차향, 안쪽) | 3 | `leather` | 가죽/담배 | #78350f |
| | | `earth` | 흙/미네랄 | #78716c |
| | | `nut` | 견과/초콜릿 | #92400e |

- SVG 300×300 캔버스 (cx=150, cy=150)
- Ring 1: outer=140px, inner=100px / Ring 2: 100→65px / Ring 3: 65→20px
- 각 섹터 탭 → `active` 토글 → 색상 변경
- `calculateAromaColor()`: 선택된 섹터 색상의 가중 평균 hex → `aroma_color` 저장
- AI가 품종/라벨 기반으로 pre-select (AI 감지 뱃지)

#### 구조 평가 (WineStructureEval)

| 슬라이더 | 범위 | 마크 | AI 초기값 |
|---------|------|------|----------|
| 복합성 | 0~100 | '1차향(과일/꽃)' — '2차향(발효)' — '3차향(숙성)' | 1링=30, 2링=60, 3링=85 |
| 여운 | 0~100 (→1~15초 환산) | '짧음(<3초)' — '보통(5~8초)' — '긴(10초+)' | 50 (기본) |
| 균형 | 0~100 | '불균형' — '보통' — '완벽한 조화' | 50 (기본) |

**자동 만족도 (autoScore)**: `calculateAutoScore(activeRingCount, finish, balance)`
- 공식: `50 + complexityBonus + (finish * 0.1) + (balance * 0.15)`
- complexityBonus: 1링=0, 2링=7, 3링=15
- 결과: 1~100 범위

---

## 5. 이미 있는 항목 처리

```
식당/와인 특정
    ↓
DB에서 사용자 기록 조회
    ↓
┌─ 기록 없음 → 저장 → 네비게이션 (§7 저장 후 동작 참조)
│
├─ 찜만 있음 → "찜해둔 곳이에요! 방문하셨나요?" → 상세페이지
│                                                 (기록 추가 유도)
│
└─ 기록 있음 → "이전에 기록한 곳이에요" → 상세페이지
                                         (재방문/재음용 기록 유도)
```

---

## 6. 재방문/재시음 기록

```
상세 → FAB (+)
→ 식당/와인 정보 이미 있음 (특정 스킵)
→ 통합 기록 화면 진입
→ 사분면: 이전 평가 위치를 반투명 참조점으로 표시 (최대 12개, 현재 수정 중인 기록은 제외)
→ 새 위치 찍기 (비교 가능)
→ 상황 태그 (이전과 다를 수 있음)
→ 저장 (독립된 새 기록)
```

---

## 7. 저장 후 동작

저장 완료 시 별도 성공 화면 없이 직접 네비게이션 (일부 경우에만 토스트):

| 조건 | 동작 |
|------|------|
| 수정 모드 | 토스트 없이 식당/와인 상세 페이지로 `router.replace` |
| 신규 + `from=detail` | 토스트 없이 상세 페이지로 `router.replace` (순환 네비게이션) |
| 신규 + 그 외 | `showToast('기록이 추가되었습니다')` + 즉시 홈으로 `router.replace('/')` |
| 버블 공유됨 | 비동기 토스트 "버블명에 공유됨" (모든 모드 공통, navigate 후 표시될 수 있음) |
| 사진 업로드 실패 | `showToast('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')` |

---

## 8. 수정 모드

`/record?edit=recordId&type=...` 로 진입 시 수정 모드 활성화.

### 데이터 로딩

1. `recordRepo.findById(editRecordId)` → 기존 기록 로드
2. `photoRepo.getPhotosByRecordId(editRecordId)` → 기존 사진 로드
3. 대상(식당/와인) 메타데이터 로드 → targetName, targetMeta 갱신
4. 모든 폼 필드에 기존 값 pre-populate

### 수정 시 변경사항

| 항목 | 동작 |
|------|------|
| 폼 필드 | 전체 폼 데이터를 `Partial<DiningRecord>`로 `recordRepo.update()` |
| 사진 삭제 | Storage + DB에서 제거 |
| 사진 크롭 편집 | 기존 삭제 → 새로 업로드 |
| 사진 추가 | 새 사진 업로드 + DB 저장 |
| XP | 이전 recordQualityXp와 delta 계산하여 차이분만 적립 |
| 식당 가격대 | priceRange 변경 시 식당 PATCH |

### 삭제

`DeleteConfirmModal` 확인 후:
1. XP 이력 조회 (CASCADE 삭제 대비)
2. `recordRepo.delete(recordId)` — `record_photos` CASCADE 삭제
3. XP 차감 (`updateUserTotalXp` + `deleteByRecordId`)
4. `showToast('기록이 삭제되었습니다')` + 즉시 홈으로 `router.replace('/')`

---

## 9. 풍성화 (기록 보강)

검색/목록 경로로 최소 데이터만 저장된 기록은 상세페이지에서 풍성화 가능.

### 진입점

| 진입 | 경로 |
|------|------|
| 홈 카드 | 미완성 기록 카드 탭 → 상세페이지 |
| 상세 FAB | 식당/와인 상세 FAB (+) → 통합 기록 화면 |
| 넛지 | "기록 완성하기" → 상세페이지 |

풍성화 시 수정 모드로 진입하여 사분면·상황·코멘트 등을 채움.

---

## 10. 데이터 저장

### 엔티티 타입

```typescript
// RecordTargetType
type RecordTargetType = 'restaurant' | 'wine'

// ListStatus — lists 테이블의 상태
type ListStatus = 'visited' | 'wishlist' | 'cellar' | 'tasted'

// CameraMode — 와인 촬영 모드
type CameraMode = 'individual' | 'shelf' | 'receipt'

// MealTime
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

// PairingCategory
type PairingCategory = 'red_meat' | 'white_meat' | 'seafood' | 'cheese'
                     | 'vegetable' | 'spicy' | 'dessert' | 'charcuterie'

// RestaurantScene
type RestaurantScene = 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'

// WineScene (현재 기록 플로우에서 미수집 — 풍성화 시 추가 예정)
type WineScene = 'solo' | 'romantic' | 'gathering' | 'pairing' | 'gift' | 'tasting' | 'decanting'
```

### DiningRecord 필드 (records 테이블)

```typescript
interface DiningRecord {
  id: string                          // UUID PK
  listId: string                      // FK → lists
  userId: string                      // FK → users
  targetId: string                    // FK → restaurants 또는 wines
  targetType: RecordTargetType        // 'restaurant' | 'wine'

  // 사분면 평가
  axisX: number | null                // 0~100. 식당=맛,음식 완성도 / 와인=구조·완성도
  axisY: number | null                // 0~100. 식당=경험 만족도 / 와인=즐거움·감성
  satisfaction: number | null         // 1~100. (axisX + axisY) / 2 자동 계산

  // 경험 데이터
  scene: string | null                // 식당: RestaurantScene (6종), 와인: 현재 미수집
  comment: string | null              // VARCHAR(200) 한줄평 / 테이스팅 노트
  totalPrice: number | null           // INT 식당 지출내역 (₩)
  purchasePrice: number | null        // INT 와인 구입가 (₩)
  visitDate: string | null            // 방문/음용 날짜 (YYYY-MM-DD)
  mealTime: MealTime | null           // 식사 시간대

  // 메뉴/페어링
  menuTags: string[] | null           // TEXT[] 추천 메뉴 (식당)
  pairingCategories: PairingCategory[] | null  // TEXT[] 페어링 카테고리 8종 (와인)

  // GPS
  hasExifGps: boolean                 // 사진에 GPS 데이터 존재 여부
  isExifVerified: boolean             // GPS가 대상 위치와 일치 여부

  // 와인 전용
  cameraMode: CameraMode | null       // 촬영 모드
  ocrData: Record<string, unknown> | null  // OCR 원본 데이터
  aromaRegions: Record<string, unknown> | null  // JSONB 아로마 선택 {sectorId: true}
  aromaLabels: string[] | null         // TEXT[] 선택된 아로마 한국어명
  aromaColor: string | null            // VARCHAR(7) 아로마 가중 평균 색상 hex
  complexity: number | null            // INT 0~100 복합성
  finish: number | null                // DECIMAL 0~100 여운 (→1~15초 환산)
  balance: number | null               // DECIMAL 0~100 균형
  autoScore: number | null             // 자동 산출 만족도

  // 메타
  privateNote: string | null           // VARCHAR(500) 개인 메모 (비공개)
  companionCount: number | null        // INT 1~5 (필터/통계용)
  companions: string[] | null          // TEXT[] 동반자 이름 (비공개)
  linkedRestaurantId: string | null    // UUID 와인→식당 연결
  linkedWineId: string | null          // UUID 식당→와인 연결
  recordQualityXp: number             // 기록 품질 XP (3~18점)
  scoreUpdatedAt: string | null

  createdAt: string
  updatedAt: string
}
```

### 사진 (record_photos 테이블)

```typescript
interface RecordPhoto {
  id: string              // UUID PK
  recordId: string        // FK → records (CASCADE 삭제)
  url: string             // Supabase Storage 공개 URL
  orderIndex: number      // 0-based 표시 순서
  isPublic: boolean       // 공개 여부 (default true)
  createdAt: string
}

// 사진 제약
const PHOTO_CONSTANTS = {
  MAX_PHOTOS: 10,         // 기록당 최대 10장
  MAX_WIDTH: 800,         // 리사이즈 최대 너비 px
  QUALITY: 0.7,           // WebP 품질
  OUTPUT_FORMAT: 'image/webp',
  BUCKET_NAME: 'record-photos',
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
}
```

### 저장 시퀀스

```
신규 기록:
1. EXIF GPS 추출 (첫 번째 사진에서 GPS → hasExifGps, 대상 위치와 거리 비교 → isExifVerified)
2. lists UPSERT (findOrCreateList) — status='visited'(식당) 또는 'tasted'(와인)
   - 기존 wishlist → visited/tasted 자동 업그레이드
3. records INSERT (모든 폼 데이터 + EXIF 결과)
4. 사진 리사이즈 (800px WebP) → Storage 업로드 → record_photos INSERT
5. 식당 메타 PATCH (genre, priceRange)
6. 와인 메타 PATCH (wineMetaUpdate 전체 필드)
7. XP 적립 (processRecordXp → xp_histories INSERT + user_experiences UPDATE)
   - 일일 기록 캡 확인
   - record_quality_xp 계산 (3~18점, 콘텐츠 충실도 기반)
   - 6개월 중복 점수 차단
   - 카테고리 XP (지역/장르/품종)
   - 레벨업 체크 → 알림 생성
8. 버블 자동 공유 동기화 (syncRecordToAllBubbles)
   - 각 버블 멤버십의 shareRule 평가
   - 매칭되는 버블에 자동 공유
9. 네비게이션 (§7 저장 후 동작 참조)

수정 기록:
1. records UPDATE (전체 폼 데이터를 Partial<DiningRecord>로 전달)
2. 사진 변경 처리 (삭제/재업로드/신규 업로드)
3. 식당 가격대 PATCH (변경 시)
4. XP delta 계산 (신규 recordXp - 이전 recordXp)
5. 버블 자동 공유 재동기화
6. 상세 페이지로 직접 이동 (토스트 없음)
```

---

## 11. 공통 UI 요소

### AppHeader + FabBack (기록 네비게이션)

| 요소 | 스펙 |
|------|------|
| 뒤로 버튼 | `FabBack` 컴포넌트 → `router.back()` |
| 헤더 | `AppHeader` 공통 레이아웃 헤더 |

### AI 태그 (ai-tag)

```
✨ AI 자동 인식 / AI 감지
```

- `Sparkles` 아이콘 (10px)
- 식당: `--accent-food` 색상 — 단, 현재 컨테이너에서 `isAiRecognized` 미전달로 뱃지 미표시
- 와인: `--accent-wine` 색상 — `isAiRecognized: !!wineData`로 wines 테이블 로드 시 표시

### RecordSaveBar (하단 고정 액션 바)

| 속성 | 값 |
|------|-----|
| 위치 | 하단 고정 (sticky) |
| 식당 | `variant="food"`, `--accent-food` 테마 |
| 와인 | `variant="wine"`, `--accent-wine` 테마 |
| 저장 버튼 | checkmark 아이콘, label: '기록 완료' (신규) / '수정 완료' (수정) |
| 삭제 버튼 | trash 아이콘, danger 톤 (수정 모드만) |
| 비활성 (식당) | 사분면 미터치 시 disabled (`isValid = quadrantTouched`) |
| 비활성 (와인) | 신규: 사분면 미터치 시 disabled / 수정: 항상 활성 (`isValid = isEditMode \|\| quadrantTouched`) |
| 미터치 클릭 | 사분면 섹션으로 자동 스크롤 + 힌트 말풍선 3초 표시 |

### 비공개 영역 구분선

```
─── 🔒 나만 보는 기록 ───
아래 내용은 버블·프로필·검색에 공개되지 않습니다
```

- `Lock` 아이콘 (12px) + 안내 문구
- **식당 폼**: 동행자(CompanionInput), 지출내역(totalPrice), 개인 메모(privateNote)
- **와인 폼**: 개인 메모(privateNote)만 — 구입가(purchasePrice)는 "기타 정보" 공개 섹션에 위치, CompanionInput은 와인 폼에서 미렌더링

### DeleteConfirmModal (삭제 확인)

| 요소 | 내용 |
|------|------|
| 제목 | "기록을 삭제하시겠습니까?" |
| 설명 | "이 기록을 삭제하면 경험치가 차감됩니다." |
| 취소 | neutral 버튼 |
| 삭제 | danger 버튼 (삭제 중 disabled) |

---

## 12. 특정의 정확성 요구사항

**식당/와인 특정이 앱의 성패를 결정한다.**

| 항목 | 요구 |
|------|------|
| 식당 GPS 목록 | 실제 위치 기반 정확한 목록. 건물 내 여러 식당 구분 |
| 식당 검색 | 외부 API (카카오 Local) 연동. fuzzy matching (SEARCH_REGISTER 참조) |
| 와인 라벨 인식 | OCR + AI. 빈티지 포함 정확한 매칭. 실패 시 즉시 검색 폴백 |
| 와인 검색 | 외국어 입력 지원. 자동완성. 빈티지 구분 |
| 중복 방지 | 같은 식당/와인 다른 표기 → 동일 항목으로 매칭 |
| EXIF 검증 | 사진 GPS와 대상 위치의 거리 검증 (haversineDistance) |
| 와인 중복 제거 | 정확 매칭 → fuzzy word 매칭 → producer+vintage 매칭 3단계 |

---

## 13. 컴포넌트 계층 구조

```
RecordFlowContainer (record-flow-container.tsx)
├── AppHeader
├── FabBack
├── [if restaurant]
│   └── RestaurantRecordForm
│       ├── AI Header (target info + Sparkles badge)
│       ├── VisitDate (date input)
│       ├── GenreSelector (ALL_GENRES 버튼 그리드)
│       ├── PhotoPicker (slot)
│       │   ├── Camera/Gallery input
│       │   ├── Photo thumbnails (drag reorder)
│       │   └── PhotoCropEditor (modal)
│       ├── QuadrantInput (VerticalGauge ×2 + 2D 캔버스)
│       │   └── QuadrantRefDot (참조점들)
│       ├── PriceLevelSelector (3단계 버튼)
│       ├── SceneTagSelector (SCENE_TAGS 6종)
│       ├── Comment (textarea 200자)
│       ├── MenuTags (칩 + 입력)
│       ├── LinkSearchSheet (와인 연결)
│       ├── ── 비공개 구분선 ──
│       ├── CompanionInput (최근 동행자 제안)
│       ├── TotalPrice (숫자 입력)
│       ├── PrivateNote (textarea 500자)
│       └── RecordSaveBar (저장/삭제)
├── [if wine]
│   └── WineRecordForm
│       ├── AI Header (Wine icon + name + type chip + scores)
│       ├── Wine Meta Section
│       │   ├── Vintage + Producer + 적정가 (인라인)
│       │   ├── Country › Region › Sub-region (NyamSelect 캐스케이드)
│       │   ├── Grape Varieties (복수 선택 칩)
│       │   ├── Body | Acidity | Sweetness | ABV
│       │   ├── Serving/Decanting/DrinkingWindow (AI 데이터시만)
│       │   ├── Food Pairings (AI 추천, 읽기전용)
│       │   └── Tasting Notes (AI 요약)
│       ├── PhotoPicker (slot)
│       ├── QuadrantInput (구조·완성도 × 즐거움·감성)
│       │   └── QuadrantRefDot
│       ├── AromaWheel (SVG 3링 15섹터)
│       ├── WineStructureEval (복합성/여운/균형 슬라이더)
│       ├── PairingGrid (8카테고리 2열 4행 그리드)
│       ├── TastingNote (textarea 200자, comment 동기화)
│       ├── 기타 정보 (구입가/음용일/식당 연결)
│       │   └── LinkSearchSheet (식당 연결)
│       ├── ── 비공개 구분선 ──
│       ├── PrivateNote (textarea 500자)
│       │   ※ CompanionInput은 와인 폼에서 미렌더링 (import만 존재)
│       ├── PriceReview Modal (가격 분석)
│       └── RecordSaveBar (저장/삭제)
├── DeleteConfirmModal (수정 모드만)
└── useToast (showToast 훅 — 글로벌 토스트 프로바이더)
```

---

## 14. Phase 구분

### Phase 1
- 카메라 촬영 → AI 인식 → 통합 기록 화면 → 저장 (전체 플로우)
- 검색/목록 → 빠른 추가
- 식당 기록: 사분면(맛×경험) + 가격대 + 상황태그 + 한줄평 + 추천메뉴 + 와인연결 + 동행자 + 지출내역 + 개인메모
- 와인 기록: 와인메타 + 사분면(구조×감성) + 아로마휠 + 구조평가 + 페어링 + 테이스팅노트 + 기타정보 + 개인메모
- 재방문/재시음 (참조점 표시)
- 수정/삭제 기능 + XP delta 계산
- 사진 (최대 10장, 크롭, 공개/비공개)
- EXIF GPS 검증
- 버블 자동 공유 동기화

### Phase 2
- 버블에 공유 기능 (상세페이지)
