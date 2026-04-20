# SEARCH_REGISTER — 검색 & 등록

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM
> affects: RECORD_FLOW
> prototype: `prototype/01_home.html` (screen-add-restaurant, screen-add-restaurant-search, screen-add-wine, screen-add-wine-search, screen-add-wine-confirm)

**이 문서의 범위**: 식당/와인을 **찾고 특정**하는 과정 (카메라 화면, 검색 화면, 등록 화면).
기록 화면(screen-rest-record, screen-wine-record), 저장 시퀀스는 → **RECORD_FLOW** 참조.

---

## 1. 진입점

| 경로 | 동작 | 라우트 |
|------|------|--------|
| 홈 FAB (+) | 현재 탭(식당/와인)에 따라 카메라 화면 진입 | `/add?type=restaurant` 또는 `/add?type=wine` |
| 상세 페이지 FAB (+) | 검색/특정 스킵, 바로 기록 화면 | `/add?type=...&from=detail_fab&targetId=...&name=...` → RECORD_FLOW |

---

## 2. Add Flow — 카메라/AI 인식 통합 (`/add`)

`AddFlowContainer`가 식당/와인 공통으로 카메라→AI→기록 전체 흐름을 관리한다.

### 2.1 플로우 스텝

```
AddFlowStep = 'camera' | 'ai_result' | 'wine_confirm' | 'search' | 'record' | 'success'
```

| 스텝 | 설명 | 비고 |
|------|------|------|
| `camera` | 카메라 촬영/앨범 선택 화면 | |
| `ai_result` | AI 인식 후보 목록 (식당 전용 — 복수 후보 시) | |
| `wine_confirm` | 와인 확인 화면 | 타입에 정의되어 있으나 현재 미사용 |
| `search` | AI 인식 실패 → "이름으로 검색" / "직접 등록" 폴백 + 근처 식당 목록 | |
| `record` | 기록 화면으로 리다이렉트 (`/record?type=...&targetId=...`) | |
| `success` | 성공 화면 (내용 추가하기 / 한 곳 더 추가 / 홈으로) | 컴포넌트 존재하나 현재 도달 경로 없음 |

### 2.2 진입 경로 분기

| `from` 파라미터 | 초기 스텝 |
|-----------------|-----------|
| `camera` (기본) | `camera` |
| `search` | `search` |
| `detail_fab` | `record` (바로 기록 화면) |

---

## 3. 식당 추가 — 카메라 화면 (`camera` 스텝)

### 레이아웃
```
┌──────────────────────────────┐
│  AppHeader                   │
│  ← FabBack                   │
├──────────────────────────────┤
│                              │
│     ┌────────────────┐       │
│     │  UtensilsCrossed │      │
│     │  음식 사진을     │       │
│     │  촬영하세요      │       │
│     └────────────────┘       │
│  음식 또는 식당 사진을 촬영하면  │
│  자동으로 인식합니다            │
│                              │
│         [📷 촬영]            │  ← Camera 아이콘, accent-food 배경
│                              │
│  [앨범에서 추가] [목록에서 추가] │
└──────────────────────────────┘
```

### 버튼 동작
| 버튼 | 아이콘 | 동작 |
|------|--------|------|
| 촬영 (📷) | `Camera` | `<input capture="environment">` → 파일 → AI 인식 |
| 앨범에서 추가 | `ImagePlus` | `<input type="file" accept="image/*">` → 파일 → AI 인식 |
| 목록에서 추가 | `List` | `/search?type=restaurant`로 이동 |

### AI 인식 플로우 (촬영/앨범)
```
사진 파일
  │
  ├─ Phase 1: resizeImage → Storage 업로드 → photoUrl (임시)
  │
  └─ Phase 2: POST /api/records/identify
     ├─ imageUrl, targetType, latitude, longitude
     ├─ 서버: LLM Vision → 음식 판별, 장르/식당명/검색키워드 추출
     ├─ 서버: 추출된 키워드로 카카오 API 검색 (최대 5쿼리, 장르 매칭 순위화)
     ├─ AI 실패 + GPS 좌표 있음 → GPS 기반 카카오 카테고리 검색 (반경 500m) fallback
     └─ 결과 반환: RestaurantAIResult
        │
        ├─ isConfidentMatch + candidates[0] 있음
        │   └─ 카카오 ID → POST /api/restaurants (DB 등록)
        │   └─ target 설정 → record 스텝 → /record 리다이렉트
        │
        ├─ candidates > 0 (복수 후보)
        │   └─ ai_result 스텝 → 후보 목록 표시
        │
        └─ candidates 없음
            └─ search 스텝 → 폴백 화면
```

### 미리보기 상태
```
촬영 후 → 사진 미리보기 (img 태그)
  └─ isRecognizing=true → 반투명 오버레이(bg-black/40) + 스피너 + "와인 검색 중..."
```
> **참고**: CameraCapture는 식당/와인 공용 컴포넌트이며, 인식 중 텍스트는 targetType에 관계없이 "와인 검색 중..."으로 고정되어 있음.

### 임시 사진 관리
- Phase 1에서 즉시 Storage 업로드 (`user_id/pending/uuid`)
- 기록 완료 시: `photoRepo.savePhotos(recordId, [{url, orderIndex: 0}])`
- 기록 미완료 시: 컴포넌트 언마운트 → `imageService.deleteImage(url)` 자동 정리

---

## 4. AI 인식 후보 화면 (`ai_result` 스텝, 식당 전용)

### 레이아웃 (`AIResultDisplay` 컴포넌트)
```
┌──────────────────────────────┐
│  AI 인식: 일식               │  ← detectedGenre (Sparkles 아이콘)
├──────────────────────────────┤
│  🍴 스시코우지  일식·을지로    │
│                       120m   │
│  🍴 몽탄  한식·을지로         │
│                       350m   │
│  🍴 라 메종  프렌치·을지로     │
│                       650m   │
└──────────────────────────────┘
```

### 후보 항목
| 항목 | 표시 |
|------|------|
| 아이콘 | `UtensilsCrossed` (18px, accent-food-light 배경) |
| 가게명 | 볼드 14px |
| 장르 · 지역 | 서브텍스트 12px |
| 거리 | `MapPin` 아이콘 + "120m" / "1.2km" |

### 동작
| 사용자 행동 | 결과 |
|-------------|------|
| 후보 탭 | 카카오 ID → DB 등록 → target 설정 → AI prefill 저장 → record 스텝 |
| "직접 검색하기" | `/search?type=restaurant`로 이동 |

---

## 5. 와인 추가 — 카메라 화면 (`camera` 스텝)

### 레이아웃
```
┌──────────────────────────────┐
│  AppHeader                   │
│  ← FabBack                   │
├──────────────────────────────┤
│                              │
│     ┌────────────────┐       │
│     │   Wine 아이콘   │       │
│     │   라벨을        │       │
│     │   맞춰주세요    │       │
│     └────────────────┘       │
│  와인 라벨을 촬영하면          │
│  자동으로 인식합니다           │
│                              │
│         [📷 촬영]            │  ← Camera 아이콘, accent-wine 배경
│                              │
│  [앨범에서 추가] [이름으로 검색] │
│  [진열장] [영수증]             │
└──────────────────────────────┘
```

### 버튼 동작 (5가지)
| 버튼 | 아이콘 | 동작 |
|------|--------|------|
| 촬영 (📷) | `Camera` | 라벨 촬영 → OCR → 와인 매칭 |
| 앨범에서 추가 | `ImagePlus` | 갤러리 → OCR → 와인 매칭 |
| 이름으로 검색 | `List` | `/search?type=wine`로 이동 |
| 진열장 | 텍스트만 | 여러 병 사진 → 업로드만 (AI 인식 미연결, WIP) |
| 영수증 | 텍스트만 | 영수증 촬영 → 업로드만 (AI 인식 미연결, WIP) |

### OCR 인식 데이터 (`records.ocr_data`)
| 모드 | JSONB 구조 |
|------|-----------|
| `individual` | `{"wine_name":"...", "vintage":"...", "producer":"..."}` |
| `shelf` | `{"wines":[{"name":"...", "price":...}, ...]}` |
| `receipt` | `{"items":[{"name":"...", "price":..., "qty":1}], "total":...}` |

### AI 인식 후 분기

> **참고**: 와인 카메라는 식당과 달리 GPS 좌표를 identify 요청에 포함하지 않음.

```
사진 파일
  │
  ├─ Phase 1: resizeImage → Storage 업로드 → photoUrl
  │
  └─ Phase 2: POST /api/records/identify (targetType: 'wine', GPS 미포함)
     ├─ 서버: LLM Vision → 라벨 OCR (와인명, 생산자, 빈티지, 산지)
     ├─ 서버: 3단계 fuzzy 매칭 (정확 → 키워드 → 생산자+빈티지)
     ├─ 서버: 매칭 없으면 upsertWineFromAI (DB 생성)
     └─ 결과 반환: WineAIResult
        │
        ├─ candidates[0] 있음 (최상위 후보)
        │   └─ target 자동 설정 (name, wineId, meta)
        │   └─ sessionStorage에 AI prefill 저장 (wineType, region, vintage)
        │   └─ record 스텝 → /record 리다이렉트
        │
        └─ candidates 없음
            └─ search 스텝 → 폴백 화면
```

> **참고**: 기존 설계의 와인 확인 화면(`screen-add-wine-confirm`)은 별도 스텝 대신, AI 최상위 후보를 자동 선택하여 바로 기록 화면으로 진입하도록 구현됨.

---

## 6. AI 실패 폴백 화면 (`search` 스텝)

### 레이아웃
```
┌──────────────────────────────┐
│  식당을 찾지 못했어요          │  ← 또는 "와인을 찾지 못했어요"
│                              │
│  [이름으로 검색] [직접 등록]   │
├──────────────────────────────┤
│  (식당 타입일 때)             │
│  📍 근처 식당                │  ← NearbyList 컴포넌트
│  [100m] [250m] [500m] [1km] [2km] │
│  [전체][한식][일식][중식][양식]... │
│  ...식당 목록                 │
└──────────────────────────────┘
```

### 동작
| 버튼 | 결과 |
|------|------|
| 이름으로 검색 | `/search?type=restaurant\|wine`로 이동 |
| 직접 등록 | `/register?type=restaurant\|wine`로 이동 |
| 근처 식당 선택 | POST /api/restaurants (DB 등록) → target 설정 → record 스텝 |

---

## 7. 식당 검색 화면 (`/search?type=restaurant`)

### 레이아웃 — 검색 전 (idle)
```
┌──────────────────────────────┐
│  AppHeader                   │
│  ← FabBack                   │
├──────────────────────────────┤
│ 🔍 식당 이름으로 검색          │  ← SearchBar (variant: restaurant)
│   [최근 검색 드롭다운]         │  ← 포커스 + 빈 쿼리 시 표시
├──────────────────────────────┤
│ 📍 근처 식당                  │  ← NearbyList
│ [100m][250m][500m][1km][2km]  │  ← 반경 필터 (기본 500m)
│ [전체][한식][일식][중식][양식]   │  ← 장르 필터
│ [아시안][카페/바]              │
│  🍴 스시코우지  일식·을지로     │
│     📍 120m          기록 있음 │
│  🍴 몽탄  한식·을지로          │
│     📍 350m                   │
│  ...                         │
│  ──────────────────────────  │
│  ⊕ 목록에 없나요? 직접 등록하기 │
└──────────────────────────────┘
```

### 레이아웃 — 검색 중 (results)
```
┌──────────────────────────────┐
│ 🔍 스시코우지        [✕]     │  ← SearchBar
├──────────────────────────────┤
│  🍴 스시코우지  일식·을지로     │  ← SearchResultItem
│     📍 120m          기록 있음 │
│  🍴 스시코우지 강남  일식·강남  │
│     📍 3.2km                 │
│  ──────────────────────────  │
│  ⊕ 목록에 없나요? 직접 등록하기 │
└──────────────────────────────┘
```

### SearchBar
- 아이콘: `Search` (18px, text-hint)
- 입력 필드: 14px, placeholder "식당 이름으로 검색"
- 클리어 버튼: `X` (16px, 입력값 존재 시)
- 포커스 링: `border-[var(--accent-food)]`
- **최근 검색**: 포커스 + 빈 쿼리 → 드롭다운 (Clock 아이콘 + 쿼리 텍스트, "전체 삭제" 버튼)

### 최근 검색
- 저장소: `localStorage` 키 `nyam_recent_searches`
- 최대 10개 (targetType별 필터링)
- 데이터: `{ query, targetType, timestamp }`
- 동작: 항목 탭 → 해당 쿼리로 검색 실행

### 근처 식당 (NearbyList)
- GPS 기반, 기본 반경 500m
- **반경 필터**: 100m, 250m, 500m, 1km, 2km (accent-food 칩)
- **장르 필터**: 전체, 한식, 일식, 중식, 양식, 아시안, 카페/바 (스크롤 칩)
- **항목 표시**: UtensilsCrossed 아이콘(18px) + 가게명(볼드 14px) + 장르·지역(서브 12px) + 거리(MapPin + "120m"/"1.2km") + "기록 있음" 뱃지

### 검색 로직 (useSearch 훅)
```
입력 → 300ms debounce → 최소 2자 이상 →
GET /api/restaurants/search?q=<query>&lat=<lat>&lng=<lng>
  ├─ 1순위: Nyam DB (restaurants 테이블 name/address ilike)
  ├─ DB 결과 ≥5 → DB만 반환
  └─ DB 결과 <5 → 외부 API 동시 호출
     ├─ 카카오 Local API (keyword, FD6 카테고리)
     ├─ 네이버 Local API (keyword)
     └─ 구글 Places API (location-based)
     → 중복 제거 (이름 유사도 + 200m 근접) → 거리순 정렬
```

### 검색 결과 항목 (SearchResultItem)
| 항목 | 표시 |
|------|------|
| 아이콘 | `UtensilsCrossed` (18px, accent-food-light 배경) |
| 가게명 | 볼드 14px |
| 장르 · 지역 | `genreDisplay · area` 서브텍스트 12px |
| 거리 | `MapPin` 아이콘 + "120m"/"1.2km" (있을 때만) |
| 기록 여부 | "기록 있음" 뱃지 (accent-food 컬러, 있을 때만) |

### 선택 시 동작
```
검색 결과 선택
  │
  ├─ 외부 API 결과 (id가 kakao_/naver_/google_ 접두사)
  │   └─ POST /api/restaurants → DB 자동 등록 → targetId 획득
  │   └─ 등록 실패 시 → 토스트 "식당 등록에 실패했습니다"
  │
  ├─ sessionStorage 저장
  │   ├─ nyam_genre_hint: 장르 (기록 폼 프리필)
  │   └─ nyam_record_extra: { categoryPath, address, distance }
  │
  ├─ addRecentSearch(query) → localStorage 업데이트
  │
  └─ router.push(/record?type=restaurant&targetId=...&name=...&meta=...&from=search)
      meta = genreDisplay · area
```

> **참고**: `hasRecord`가 true인 식당도 동일하게 `/record`로 이동한다. 별도 토스트나 상세페이지 리다이렉트는 없음.

---

## 8. 와인 검색 화면 (`/search?type=wine`)

### 레이아웃 — 검색 전 (idle)
```
┌──────────────────────────────┐
│  AppHeader                   │
│  ← FabBack                   │
├──────────────────────────────┤
│ 🔍 와인 이름으로 검색          │  ← SearchBar (variant: wine)
│   [최근 검색 드롭다운]         │
├──────────────────────────────┤
│  (근처 식당 목록 없음 — 와인은 │
│   idle 상태에서 빈 화면)       │
└──────────────────────────────┘
```

### 레이아웃 — 검색 중 (results)
```
┌──────────────────────────────┐
│ 🔍 Chateau Margaux    [✕]   │
├──────────────────────────────┤
│  🍷 Chateau Margaux 2018    │  ← DB 결과
│     Red · France · Bordeaux  │
│  🍷 Chateau Margaux 2015    │
│     Red · Bordeaux   기록 있음│
│  ──────────────────────────  │
│  ✨ AI 추천 와인       🔄    │  ← DB 결과 <3개일 때 자동 트리거
│  ┌─────┐ Margaux 2019       │  ← 라벨 이미지 or Sparkles 아이콘
│  │label│ Red · France · Bord│
│  └─────┘                    │
│  ┌─────┐ Margaux 2020       │
│  │  ✨ │ Red · France        │
│  └─────┘                    │
│  ──────────────────────────  │
│  ⊕ 목록에 없나요? 직접 등록하기│
└──────────────────────────────┘
```

### 검색 로직 (useSearch 훅)
```
입력 → 300ms debounce → 최소 2자 이상 →
GET /api/wines/search?q=<query>
  └─ Nyam DB (wines 테이블 name/producer ilike, 최대 20개)

DB 결과 < 3개 → AI 자동 트리거
POST /api/wines/search-ai { query }
  └─ LLM 텍스트 검색 → 와인 후보 추론 + 구글 이미지 검색 (라벨)
  └─ 반환: WineSearchCandidate[]
```

### DB 검색 결과 항목
| 항목 | 표시 |
|------|------|
| 아이콘 | `Wine` (18px, accent-wine-light 배경) |
| 와인명 + 빈티지 | 볼드 14px (예: "Chateau Margaux 2018") |
| 타입 · 국가 · 산지 | 서브텍스트 12px (예: "Red · France · Bordeaux") |
| 기록 여부 | "기록 있음" 뱃지 (accent-wine 컬러, 있을 때만) |

### AI 추천 와인 항목
| 항목 | 표시 |
|------|------|
| 라벨 이미지 | 44x44 썸네일 (없으면 `Sparkles` 아이콘, accent-wine-light 배경) |
| 와인명(한글) + 빈티지 | 볼드 14px (nameKo 우선, fallback: name) |
| 타입 · 국가 · 산지 · 생산자 | 서브텍스트 12px |

### DB 검색 결과 선택 시 동작
```
DB 결과 탭
  │
  ├─ addRecentSearch(query) → localStorage 업데이트
  │
  └─ router.push(/record?type=wine&targetId=...&name=...&meta=...&from=search&vintage=...&producer=...)
      meta = wineType · region · vintage
```

### AI 후보 선택 시 동작
```
AI 후보 탭
  │
  ├─ isSelectingAi=true → 스피너 + "와인 정보 가져오는 중..."
  │
  ├─ POST /api/wines/detail-ai { name, producer, vintage }
  │   └─ 서버: LLM 상세 조회 → upsertWineFromAI (3단계 fuzzy 매칭)
  │   └─ DB에 와인 upsert → { id, name } 반환
  │   └─ 실패 시 → 토스트 "와인 정보를 가져오지 못했습니다"
  │
  ├─ addRecentSearch(query)
  │
  └─ router.push(/record?type=wine&targetId=...&name=...&meta=...&from=search&vintage=...&producer=...)
      meta = wineType · region · country
```

> **참고**: `hasRecord`가 true인 와인도 동일하게 `/record`로 이동한다. 별도 토스트나 상세페이지 리다이렉트는 없음.

### 빈티지 처리
- 같은 와인 + 다른 빈티지 = 다른 기록
- "빈티지 모름" 선택 가능 (등록 폼)

---

## 9. 직접 등록 (`/register?type=restaurant|wine`)

### 진입 경로
- 검색 결과 하단 "⊕ 목록에 없나요? 직접 등록하기" 버튼
- AI 실패 폴백 "직접 등록" 버튼
- URL 파라미터: `name` (검색 쿼리 프리필), `producer`, `vintage`, `wineType` (와인용)

### 식당 등록 (`RestaurantRegisterForm`)

| 필드 | 필수 | 타입 | 비고 |
|------|------|------|------|
| 가게명 | **필수** | 텍스트 | placeholder: "가게 이름을 입력하세요" |
| 장르 | 선택 | 칩 선택 (단일) | 6그룹 16종 (아래 참조) |
| 주소 | 선택 | 텍스트 | placeholder: "주소 또는 위치를 입력하세요" |
| 지역 | 선택 | 텍스트 | placeholder: "예: 을지로, 강남" |
| 가격대 | 선택 | 1~4 버튼 | ₩ / ₩₩ / ₩₩₩ / ₩₩₩₩ |
| GPS 좌표 | 자동 | — | 브라우저 geolocation에서 자동 획득, 사용자 입력 아님 |

**장르 그룹**:
| 대분류 | 장르 |
|--------|------|
| 동아시아 | 한식, 일식, 중식 |
| 동남아 · 남아시아 | 태국, 베트남, 인도 |
| 유럽 | 이탈리안, 프렌치, 스페인, 지중해 |
| 아메리카 | 미국, 멕시칸 |
| 음료 · 디저트 | 카페, 바/주점, 베이커리 |
| 기타 | 기타 |

**등록 후**: POST /api/restaurants → `/record?type=restaurant&targetId=...&name=...&meta=...` (from 파라미터 없음)

### 와인 등록 (`WineRegisterForm`)

| 필드 | 필수 | 타입 | 비고 |
|------|------|------|------|
| 와인명 | **필수** | 텍스트 | placeholder: "와인 이름을 입력하세요" |
| 타입 | **필수** | 칩 선택 (단일) | 7종: 레드, 화이트, 로제, 스파클링, 오렌지, 주정강화, 디저트 |
| 생산자 | 선택 | 텍스트 | placeholder: "와이너리 또는 생산자명" |
| 빈티지 | 선택 | 숫자 + "빈티지 모름" 체크박스 | placeholder: "2020" |
| 국가 | 선택 | 텍스트 | placeholder: "France" |
| 산지 | 선택 | 텍스트 | placeholder: "Bordeaux, Napa Valley" |
| 품종 | 선택 | 텍스트 | placeholder: "Cabernet Sauvignon, 피노 누아" |

**등록 후**: POST /api/wines → `/record?type=wine&targetId=...&name=...&meta=...` (from 파라미터 없음)

---

## 10. 성공 화면 (`success` 스텝)

> **현재 상태**: `SuccessScreen` 컴포넌트와 렌더링 코드는 존재하나, 현재 코드에서 `success` 스텝으로 전환하는 경로가 없음. 모든 흐름이 `record` 스텝 → `/record` 리다이렉트로 이동.

AddFlowContainer 내부의 `SuccessScreen` 컴포넌트.

### 레이아웃
```
┌──────────────────────────────┐
│                              │
│          ✓ (체크 원형)        │  ← accent 컬러 배경
│                              │
│      추가되었습니다!           │
│      타겟명 · 메타정보         │
│                              │
│     [ 내용 추가하기 ]         │  ← accent 컬러 버튼 → /record
│     [ + 한 곳 더 추가 ]      │  ← 테두리 버튼 → flow 리셋
│     [ 🏠 홈으로 ]            │  ← 텍스트 버튼 → /
│                              │
└──────────────────────────────┘
```

---

## 11. 데이터 핸드오프 (검색/카메라 → 기록 화면)

### URL 파라미터
```
/record?type=restaurant|wine
       &targetId=<uuid>
       &name=<encoded>
       &meta=<encoded>
       &from=search|camera|detail_fab   // 등록(/register) 경로에서는 from 미포함
       &vintage=<optional>              // 와인 전용
       &producer=<optional>             // 와인 전용
```

### meta 생성 규칙 (소스별)
| 소스 | 식당 meta | 와인 meta |
|------|-----------|-----------|
| 검색 결과 선택 | `genreDisplay · area` | `wineType · region · vintage` |
| AI 와인 후보 선택 | — | `wineType · region · country` |
| 카메라 AI 식당 | `genre · area` | — |
| 카메라 AI 와인 | — | `wineType · region · vintage` |
| 직접 등록 | `genre · area` | `wineType · region · vintage` |

### sessionStorage 키
| 키 | 용도 | 설정 위치 |
|----|------|-----------|
| `nyam_genre_hint` | 식당 장르 프리필 | 검색 결과 선택 시 |
| `nyam_record_extra` | 추가 정보 (categoryPath, address, distance) | 검색 결과 선택 시 |
| `nyam_ai_prefill` | AI 인식 데이터 (genre, wineType, region, vintage 등) | 카메라 AI 인식 후 |
| `nyam_captured_photo_url` | 촬영 사진 URL | 카메라 → 기록 전환 시 |

---

## 12. 예외 처리

### AI 인식 에러 (useCameraCapture)
| 서버 에러 코드 | 사용자 메시지 | HTTP |
|---------------|-------------|------|
| `NOT_FOOD` | "음식 사진을 선택해주세요" | 422 |
| `NOT_WINE_LABEL` | "와인 라벨을 찾지 못했어요" | 422 |
| `UNAUTHORIZED` | "로그인이 필요합니다" | 401 |
| 기타/미지정 | "인식에 실패했습니다. 다시 시도해주세요." | 500 |
| 네트워크 오류 | "네트워크 오류가 발생했습니다" | — |

### 등록 에러 (useRegister)
| 에러 코드 | 사용자 메시지 |
|----------|-------------|
| `NAME_REQUIRED` (식당) | "가게명을 입력해주세요" |
| `NAME_REQUIRED` (와인) | "와인명을 입력해주세요" |
| `WINE_TYPE_REQUIRED` | "와인 타입을 선택해주세요" |
| 기타 | "등록에 실패했습니다" |
| 네트워크 오류 | "네트워크 오류가 발생했습니다" |

### 흐름별 예외 처리
| 상황 | 처리 |
|------|------|
| 외부 API 식당 선택 | 자동 POST /api/restaurants → DB 등록 후 기록 진행 |
| 카카오 ID 등록 실패 | search 스텝으로 폴백 |
| AI 인식 실패 (식당) | GPS 있으면 → GPS 기반 카카오 카테고리 검색 fallback → 그래도 실패 시 search 스텝 |
| AI 인식 실패 (와인) | search 스텝 → "이름으로 검색" / "직접 등록" |
| 와인 DB 결과 부족 | 자동 AI 추천 트리거 (결과 <3개) |
| AI 후보 상세 조회 실패 | 토스트 "와인 정보를 가져오지 못했습니다" |
| 식당 등록 실패 (검색에서) | 토스트 "식당 등록에 실패했습니다" |
| GPS 없음 | 근처 목록 미표시, 수동 검색/등록만 가능 |
| 사진 업로드 실패 | search 스텝으로 폴백 |
| 기록 미완료 | 임시 업로드 사진 자동 삭제 (컴포넌트 언마운트 시) |

---

## 13. API 엔드포인트 요약

| 엔드포인트 | 메서드 | 용도 | 인증 |
|-----------|--------|------|------|
| `/api/restaurants/search` | GET | DB + 외부 API 통합 검색 (DB <5건 시 카카오/네이버/구글 병렬) | 필요 |
| `/api/restaurants/nearby` | GET | GPS 기반 근처 식당 (카카오 카테고리 FD6) | 불필요 |
| `/api/restaurants` | POST | 식당 등록/upsert (구글 Places 상세 자동 enrichment) | 필요 |
| `/api/restaurants` | PATCH | 식당 장르/가격대 수정 | 필요 |
| `/api/wines/search` | GET | 와인 DB 검색 (name/producer ilike, 최대 20건) | 필요 |
| `/api/wines/search-ai` | POST | AI 기반 와인 추천 + 구글 이미지 검색 (라벨) | 필요 |
| `/api/wines/detail-ai` | POST | AI 후보 상세 조회 + 3단계 fuzzy 매칭 + DB upsert | 필요 |
| `/api/wines` | POST | 와인 등록/upsert (name + vintage 중복 체크) | 필요 |
| `/api/wines` | PATCH | 와인 메타데이터 수정 (빈티지, 산지, 테이스팅노트 등) | 필요 |
| `/api/records/identify` | POST | 사진 AI 인식 — 식당: Vision+카카오 / 와인: OCR+fuzzy매칭 | 필요 |

---

## 14. 컴포넌트 구조

```
/add (AddFlowContainer)
├── CameraCapture          — 촬영/앨범/검색폴백 버튼
├── AIResultDisplay        — 식당 AI 후보 목록
├── NearbyList             — 근처 식당 (폴백 시)
└── SuccessScreen          — 추가 완료

/search (SearchContainer)
├── SearchBar              — 검색 입력 + 최근 검색 드롭다운
├── SearchResults          — DB 결과 + AI 와인 결과
│   └── SearchResultItem   — 개별 검색 결과 항목
└── NearbyList             — 근처 식당 (idle 시, 식당만)

/register (RegisterContainer)
├── RestaurantRegisterForm — 식당 등록 폼
└── WineRegisterForm       — 와인 등록 폼
```

---

## 15. 도메인 엔티티

### SearchResult (`domain/entities/search.ts`)
```typescript
interface RestaurantSearchResult {
  id: string; type: 'restaurant'; name: string; hasRecord: boolean
  genre: string | null; genreDisplay: string | null; categoryPath: string | null
  area: string | null; address: string | null; distance: number | null
  lat: number | null; lng: number | null; phone: string | null; kakaoMapUrl: string | null
}

interface WineSearchResult {
  id: string; type: 'wine'; name: string; hasRecord: boolean
  producer: string | null; vintage: number | null; wineType: string | null
  region: string | null; country: string | null
}
```

### AddFlowTarget (`domain/entities/add-flow.ts`)
```typescript
interface AddFlowTarget {
  id: string; name: string; type: 'restaurant' | 'wine'
  meta: string; isAiRecognized: boolean
}
```

### RegisterInput (`domain/entities/register.ts`)
```typescript
interface CreateRestaurantInput {
  name: string; address?: string | null; area?: string | null
  genre?: RestaurantGenre | null; priceRange?: number | null
  lat?: number | null; lng?: number | null; phone?: string | null
  externalIds?: Record<string, string> | null
}

interface CreateWineInput {
  name: string; wineType: WineType
  producer: string | null; vintage: number | null
  region: string | null; country: string | null; variety: string | null
  labelImageUrl?: string | null
}
```
