# DISCOVER — 탐색 화면

> depends_on: DATA_MODEL, RECOMMENDATION, DESIGN_SYSTEM
> route: `/discover` (독립 페이지)
> prototype: `prototype/01_home.html` (screen-discover)

---

## 1. 화면 역할

- **홈과의 차이**: 홈은 **내 기록 + 개인 추천**, 탐색은 **새로운 곳 발견** (지역 + 장르 기반 + AI 분석)
- Google Places API 기반으로 지역/장르별 식당 검색
- AI 추천순위(수상 내역 + 구글 평점) + 자연어 추천 + 개별 식당 AI 분석
- **독립 페이지**(`/discover`)로 구현 — 홈 서브 스크린이 아님
- 진입: 홈 검색 토글 버튼 → `router.push('/discover')`

> RECOMMENDATION.md 참조: Discover는 추천이 아닌 **지역 기반 탐색 + AI 분석**. 추천은 홈 식당 탭 `추천` 필터칩에서 노출.

---

## 2. 화면 구성

```
┌──────────────────────────────┐
│ nyam    bubbles 🔔 Lv ⓐ      │  AppHeader (공통 앱 헤더)
├──────────────────────────────┤
│ 지역                          │  섹션 레이블
│ [광화문] [을지로] [종로] … →   │  지역 칩 (flex-wrap, 다중 선택)
│ [📍 내 근처]                  │  GPS 기반 근처 검색
│ [구/동 직접 입력             ]  │  텍스트 입력 (area 직접 지정)
├──────────────────────────────┤
│ 음식 종류                      │  섹션 레이블
│ [한식] [일식] [중식] [양식] … │  장르 칩 (flex-wrap, 다중 선택)
├──────────────────────────────┤
│ [🏆 AI 추천순위 받기         ] │  AI 랭킹 버튼 (검색 결과 있을 때)
├──────────────────────────────┤
│ [✨ AI 답변 결과 영역        ] │  자연어 추천 결과 (랭킹 후)
│ [✨ AI에게 물어보세요...  ➤  ] │  자연어 질의 입력 (랭킹 후)
├──────────────────────────────┤
│ 30개 결과 · AI 추천순          │  결과 수 + 정렬 표시
│ ┌──────────────────────────┐ │
│ │ ① 식당명            87.5 │ │  순위 뱃지 + 점수
│ │ 주소                      │ │  주소
│ │ [G 4.4 (+49)] [미슐랭★]   │ │  평점 pill + 수상 태그
│ │                      ▶   │ │  확장 토글
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ② 식당명            72.3 │ │
│ │ …                        │ │
│ └──────────────────────────┘ │
│ ...                          │  세로 스크롤 리스트
│                              │
│ [◀ FabBack]                  │  좌하단 FAB 뒤로가기
└──────────────────────────────┘
```

---

## 3. 헤더

공통 `AppHeader` 컴포넌트 사용 (discover 자체 헤더 아님).

| 요소 | 스펙 |
|------|------|
| AppHeader | nyam 로고, bubbles 링크, 알림 벨, 레벨 바, 아바타 드롭다운 |
| FabBack | 좌하단 FAB, ChevronLeft 22px, `useBackNavigation().goBack()` |
| header-spacer | 46px (고정 헤더 아래 여백) |

---

## 4. 지역 필터

### 4-1. 지역 칩 (다중 선택)

```
[광화문] [을지로] [종로] [강남] [성수] [홍대] [이태원] [연남]
```

| 속성 | 값 |
|------|-----|
| 소스 | `DISCOVER_AREAS` (domain/entities/discover.ts) |
| 선택 방식 | **다중 선택** (Set) |
| 칩 스타일 | `shrink-0 rounded-full text-[13px] font-semibold`, padding `6px 14px`, border `1.5px solid` |
| 활성 상태 | bg `var(--accent-food)`, fg `#FFFFFF`, border-color `var(--accent-food)` |
| 비활성 상태 | bg `var(--bg-card)`, fg `var(--text-sub)`, border-color `var(--border)` |
| 터치 피드백 | `active:scale-95` |
| 탭 동작 | toggle → 즉시 검색 실행 (지역 변경 시 `useEffect`에서 자동 fetch) |

### 4-2. 내 근처 버튼

| 속성 | 값 |
|------|-----|
| 아이콘 | `Navigation` (lucide), 12px |
| 동작 | GPS 위치 획득 → 반경 1km 검색 |
| 상호배제 | 활성 시 지역칩/직접입력 초기화 |
| GPS 실패 | `useNearby` false로 전환 |

### 4-3. 직접 입력

| 속성 | 값 |
|------|-----|
| placeholder | "구/동 직접 입력 (예: 역삼동, 마포구)" |
| 크기 | height 36px, `text-[13px]`, rounded-lg, border `1px solid var(--border)`, bg `var(--bg-card)` |
| 동작 | Enter 키 → `fetchRestaurants()` 실행 |
| 상호배제 | 입력 시 지역칩/내근처 초기화 |

---

## 5. 장르 필터 (다중 선택)

```
[한식] [일식] [중식] [양식] [아시안] [카페] [바/주점]
```

| 속성 | 값 |
|------|-----|
| 소스 | `GENRE_MAJOR_CATEGORIES` keys (domain/entities/restaurant.ts) |
| 선택 방식 | **다중 선택** (Set) |
| 칩 스타일 | 지역 칩과 동일 |
| 동작 | toggle → 검색 쿼리에 반영, 자동 fetch |

---

## 6. AI 추천순위

### 6-1. AI 추천순위 버튼

| 속성 | 값 |
|------|-----|
| 표시 조건 | 필터 있음 + 로딩 아님 + 결과 > 0 + 아직 미랭킹 |
| 아이콘 | `Trophy` (lucide), 16px |
| 로딩 중 | `Loader2` spin + "AI가 평점/수상을 분석 중..." |
| 스타일 | bg `var(--accent-food)`, fg `#FFFFFF`, `fontSize: 14px, fontWeight: 700`, rounded-xl, py-3, w-full |
| 로딩 시 | `opacity: 0.6`, `transition-opacity` |

### 6-2. AI 스코어링 공식 (100점 만점)

| 카테고리 | 배점 | 계산 방식 |
|----------|------|-----------|
| 구글 평점 | 70점 | `(rating - 3.0) / 2.0 × 70` (3.0 미만 = 0점, 5.0 = 70점) |
| 수상/출연 | 30점 | 최고 등급 1개 풀점수 + 나머지 × 0.3 (S=15, A=10, B=5, cap 30) |

> 소스: `domain/services/discover-scoring.ts` — `calculateScore()` 함수

### 6-3. 수상 내역 매칭

- DB 테이블: `restaurant_accolades` (verified = true)
- 이름 정규화: 공백/특수문자 제거 + lowercase
- 부분 매칭: 정규화된 이름이 DB 키에 포함되거나 반대

---

## 7. AI 자연어 추천

랭킹 완료 후 활성화되는 자연어 검색 기능.

| 속성 | 값 |
|------|-----|
| 표시 조건 | `isRanked === true` |
| 아이콘 | `Sparkles` (lucide), 16px, `var(--accent-food)` |
| 입력 placeholder | "AI에게 물어보세요 (예: 조용한 분위기의 파스타집)" |
| 입력 텍스트 | `text-[13px]`, `var(--text)` |
| 전송 버튼 | `Send` 16px, `var(--accent-food)` — `aiQuery` 값이 있을 때만 표시 |
| 로딩 | `Loader2` 16px spin, `var(--accent-food)` |
| 입력 컨테이너 | height 44px, rounded-xl, `px-3`, bg `var(--bg-card)`, border `1px solid var(--border)` |

### 추천 결과 영역 (입력 위에 표시)

| 요소 | 스펙 |
|------|------|
| 컨테이너 | `rounded-xl p-3 mb-3`, bg `color-mix(in srgb, var(--accent-food) 8%, transparent)`, border `1px solid color-mix(in srgb, var(--accent-food) 20%, transparent)` |
| 답변 텍스트 | `text-[14px]`, `var(--text)`, `line-height: 1.6` |
| picks 컨테이너 | `flex flex-col gap-1.5`, `mt-2` |
| 각 pick 행 | `Sparkles` 12px (`mt-0.5 shrink-0`) + **식당명** — 추천 이유, `text-[13px]`, `flex items-start gap-2` |

### 파이프라인

```
사용자 질문 입력
  → POST /api/discover/ai-recommend
  → Tavily 웹 검색 (질문 + 지역 + 상위 5개 식당명)
  → Gemini 2.5 Flash (질문 + 상위 20개 식당 리스트 + 웹 정보)
  → { answer: string, picks: [{ name, reason }] }
```

---

## 8. 식당 결과 리스트

### 8-1. 결과 카운트

```
{N}개 결과 · AI 추천순    (랭킹 완료 시)
{N}개 결과                (랭킹 전)
```

`text-[12px]`, `var(--text-hint)`

### 8-2. RestaurantItem 구조

카드 스타일: `rounded-xl`, bg `var(--bg-card)`, border `1px solid var(--border)`, `overflow-hidden`

```
┌──────────────────────────────────────────┐
│ ① 식당명                          87.5   │  순위 뱃지 + 이름(15px/700) + 점수(15px/800)
│ 서울 종로구 세종로 xxx                     │  주소 (12px, text-sub)
│ [G 4.4 (+49)] [미슐랭 ★] [수상 +15]      │  평점 pill + 수상 태그
│                                      ▶  │  확장 토글 (ChevronLeft 16px)
├──────────────────────────────────────────┤  ← 확장 시 표시 (border-top)
│ 점수 산출: 구글 49 + 수상 15 = 64점        │  breakdown 텍스트 (12px, text-hint)
│ [✨ AI 분석] [기록하기] [♡]              │  액션 버튼 3개 (gap-2)
│                                          │
│ 한줄 평가: …                              │  AI 분석 결과 (있을 때)
│ 맛: …                                    │
│ 분위기: …                                │
│ 꿀팁: …                                  │
│ 가격대: …                                │
│ 추천 메뉴: [메뉴1] [메뉴2] [메뉴3]       │
│                                          │
│ [구글맵] [네이버] [카카오]                │  외부 포탈 링크 (gap-2, mt-3)
└──────────────────────────────────────────┘
```

접힌 영역(button): `px-4 py-3`, `gap-3`, `text-left`
확장 영역: `border-t border-[var(--border)] px-4 py-3`

### 8-3. 순위 뱃지

| 속성 | 값 |
|------|-----|
| 크기 | `h-7 w-7`, rounded-full, `text-[12px] font-bold` |
| 1~3위 | bg `var(--accent-food)`, fg `#FFFFFF` |
| 4위+ | bg `var(--bg-elevated)`, fg `var(--text-sub)` |
| 미랭킹 | 뱃지 비노출 |

### 8-4. 평점 pill (RatingPill)

- **랭킹 전** (`!rankInfo`): `[G 4.4]` pill + 옆에 `(1,234)` 리뷰 수 (별도 span, `text-[11px]`, `var(--text-hint)`, `ml-1`)
- **랭킹 후** (`rankInfo`): `[G 4.4 (+49)]` pill (점수 기여분 포함) + 수상 태그 (TagPill)

pill 스타일: `text-[11px] font-semibold`, bg `var(--bg-elevated)`, color `var(--text-sub)`, border `1px solid var(--border)`, rounded, `px-1.5 py-0.5`

### 8-5. 수상 태그 (TagPill)

| 등급 | 컬러 | 예시 |
|------|------|------|
| S | `#EF4444` | 미슐랭 ★★★ |
| A | `#3B82F6` | 블루리본 |
| B | `#059669` | 기타 수상 |
| 합계 | `#8B5CF6` | 수상 +15 |

스타일: bg `{color}15`, border `1px solid {color}30`, `text-[11px] font-bold`, rounded, `px-1.5 py-0.5`

### 8-6. 확장 영역 액션 버튼

버튼 컨테이너: `flex gap-2`

AI 분석 / 기록하기 공통: `flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5`, `fontSize: 13px, fontWeight: 600`

| 버튼 | 스펙 |
|------|------|
| AI 분석 | `Sparkles` 14px + "AI 분석", bg `color-mix(in srgb, var(--accent-food) 10%, transparent)`, fg `var(--accent-food)`. 로딩 시 `Loader2` 14px spin |
| 기록하기 | bg `var(--accent-food)`, fg `#FFFFFF` |
| 찜 (Heart) | `Heart` 16px, width 44px, rounded-lg. 비활성: bg `var(--bg-elevated)`, border `1px solid var(--border)`, fg `var(--text-hint)`. 활성: fill + fg `var(--negative)`, bg `color-mix(in srgb, var(--negative) 10%, transparent)`, border `1px solid var(--negative)` |

### 8-7. AI 분석 결과 (AnalysisRow)

| 항목 | 설명 |
|------|------|
| 한줄 평가 | summary (20자 이내) |
| 맛 | taste (2-3문장) |
| 분위기 | atmosphere (2-3문장) |
| 꿀팁 | tips (2-3문장) |
| 가격대 | priceRange (예: 15,000~25,000원) |
| 추천 메뉴 | recommendedDishes[] (chip 스타일, `text-[12px]`, bg `var(--bg-elevated)`, rounded-full, `px-2.5 py-1`) |

라벨: `text-[12px] font-semibold(fontWeight:600)`, `var(--text-sub)`
값: `text-[13px]`, `var(--text)`, `line-height: 1.5`

> `value`가 빈 문자열 또는 `"정보 없음"`인 항목은 렌더링하지 않음 (AnalysisRow 내부 필터)

### 8-8. 외부 포탈 링크

| 포탈 | URL 패턴 |
|------|---------|
| 구글맵 | `https://www.google.com/maps/place/?q=place_id:{googlePlaceId}` |
| 네이버 | `https://search.naver.com/search.naver?query={name}` |
| 카카오 | `https://map.kakao.com/?q={name}` |

스타일: flex-1, rounded-lg, py-2, text-center, `fontSize: 12px, fontWeight: 600`, color `var(--text-sub)`, bg `var(--bg-elevated)`, border `1px solid var(--border)`, `target="_blank" rel="noopener noreferrer"`

---

## 9. 빈 상태

### 필터 미선택 시

```
┌──────────────────────────────┐
│                              │
│         📍                   │
│   지역을 선택하면             │
│   맛집을 찾아드려요           │
│                              │
└──────────────────────────────┘
```

`MapPin` 36px, `var(--text-hint)` + `text-[14px]`, `var(--text-sub)`, text-center

### 검색 결과 없음

표시 조건: `hasFilter && !isLoading && hasSearched && restaurants.length === 0` — 첫 검색 전에는 미표시.

```
┌──────────────────────────────┐
│                              │
│         🔍                   │
│   검색 결과가 없어요          │
│                              │
└──────────────────────────────┘
```

`Search` 36px, `var(--text-hint)` + `text-[14px]`, `var(--text-sub)`

### 로딩 중

`Loader2` 24px, `var(--text-hint)`, `animate-spin`, py-12

---

## 10. 데이터 소스

### Google Places 검색 (주 데이터소스)

- 검색 쿼리: `{지역} {장르} 맛집` 형식
- GPS 근처: `area='맛집'` + lat/lng, 반경 1,000m
- 지역 지정: 반경 20,000m
- 최대 30개 결과

### 복합 점수 (list API 정렬용, 현재 미사용 경로)

```
compositeScore = (외부 평점 평균 정규화) × 0.4
               + (Nyam 점수 / 100) × 0.3
               + (log₁₀(기록 수) / 2, cap 1) × 0.2
               + (배지 보유 여부) × 0.1
```

> 소스: `domain/services/composite-score.ts` — `calculateCompositeScore()` 함수

### AI 스코어링 (ai-rank API 정렬용)

```
score (100점) = googleRatingScore (0~70)
              + accoladeScore (0~30)
```

> 소스: `domain/services/discover-scoring.ts` — `calculateScore()` 함수

---

## 11. API 구조

> **인증 필수**: 모든 Discover API는 `supabase.auth.getUser()` 인증을 요구합니다. 미인증 시 401 반환.

### 11-1. Google Places 검색

```
GET /api/discover/search
  ?area=광화문
  &genre=한식
  &lat=37.xxx (GPS 시)
  &lng=126.xxx (GPS 시)
  → { restaurants: DiscoverSearchResult[] }
```

| 필드 | 타입 |
|------|------|
| id | `google_{googlePlaceId}` |
| name | string |
| address | string |
| lat, lng | number \| null |
| googleRating | number \| null |
| googleRatingCount | number \| null |
| googlePlaceId | string |

### 11-2. AI 추천순위

```
POST /api/discover/ai-rank
  body: { restaurants: [{ name, address, googleRating }] }
  → { success, ranked: [{ name, googleRating, breakdown }] }
```

- 클라이언트에서 `area`도 전송하지만 서버에서는 미사용
- 상위 30개 식당 대상
- `restaurant_accolades` 테이블에서 수상 내역 매칭
- `calculateScore(googleRating, accolades)` → 점수 산출
- 점수 내림차순 정렬

### 11-3. AI 개별 분석

```
POST /api/discover/ai-analyze
  body: { restaurantName, area }
  → { success, analysis: { taste, atmosphere, tips, priceRange, recommendedDishes[], summary } }
```

- Tavily API → 웹 검색
- Gemini 2.5 Flash → 구조화된 분석 JSON 생성
- temperature 0.3, maxOutputTokens 2048

### 11-4. AI 자연어 추천

```
POST /api/discover/ai-recommend
  body: { question, restaurants: [{ name, score, reason }], area }
  → { success, answer, picks: [{ name, reason }] }
```

- Tavily advanced 검색 (질문 + 지역 + 상위 5 식당명)
- Gemini 2.5 Flash 자연어 추천 (상위 20개 리스트 + 웹 정보 기반)

### 11-5. DB 기반 목록 (list API) — 현재 미사용

> 이 API는 초기 설계의 DB 직접 조회 경로입니다. 현재 DiscoverContainer에서 호출하지 않습니다.

```
GET /api/discover/list
  ?area=광화문
  &page=1
  &limit=20
  → { results: DiscoverCard[], total: number }
```

- Cache-Control: `public, max-age=3600` (1시간)
- `restaurants` 테이블 직접 조회
- compositeScore DESC 정렬

---

## 12. 기록 / 찜 연동

### 기록하기 플로우

```
"기록하기" 버튼
  → POST /api/restaurants (식당 DB 생성/조회)
  → router.push('/record?type=restaurant&targetId={id}&name={name}&from=discover')
```

### 찜하기 플로우

```
♡ 버튼 (인증 사용자만)
  → google_ 접두사 ID → POST /api/restaurants로 DB 생성 먼저
  → useWishlist hook으로 toggle
```

---

## 13. 인터랙션

### 화면 전환

| 전환 | 방식 |
|------|------|
| 홈 → 탐색 | 홈 검색 토글 → `router.push('/discover')` |
| 탐색 → 홈 | FabBack (좌하단 FAB) → `useBackNavigation().goBack()` |
| 탐색 → 기록 | "기록하기" 버튼 → `/record?...` |

### 지역/장르 변경

- 칩 탭 시 Set toggle → `areaQuery` 또는 `genreQuery` 변경 감지 → `hasFilter`일 때 자동 fetch
- 내 근처: GPS 획득 완료 시 자동 fetch
- 내 근처 / 직접 입력 / 칩 상호 배제 (하나 활성화 시 나머지 초기화)

### 식당 아이템 확장

- 아이템 클릭 → `expandedId` toggle
- ChevronLeft 아이콘 회전: 접힌 상태 `180deg`, 펼친 상태 `-90deg`, `transition: 0.2s`

### 레이아웃

- 루트 컨테이너: `content-feed flex min-h-dvh flex-col bg-[var(--bg)]`
- 하단 여백: `80px` (FabBack 겹침 방지)

---

## 14. Phase 구분

| 항목 | 현재 상태 | 비고 |
|------|----------|------|
| 지역 칩 필터 (다중 선택) | ✅ 구현 완료 | 8개 지역 |
| 직접 지역 입력 | ✅ 구현 완료 | 텍스트 입력 |
| GPS 내 근처 | ✅ 구현 완료 | 반경 1km |
| 장르 필터 (다중 선택) | ✅ 구현 완료 | 7개 대분류 |
| Google Places 검색 | ✅ 구현 완료 | 최대 30개 |
| AI 추천순위 (수상+평점) | ✅ 구현 완료 | 100점 만점 |
| AI 개별 식당 분석 | ✅ 구현 완료 | Tavily + Gemini |
| AI 자연어 추천 | ✅ 구현 완료 | 랭킹 후 활성화 |
| 기록하기 연동 | ✅ 구현 완료 | /record로 이동 |
| 찜하기 연동 | ✅ 구현 완료 | 인증 사용자 |
| 와인 탐색 | ❌ 미구현 | Phase 2 검토 |
| 취향 유사 추천 (CF) | ❌ 미구현 | Phase 2 검토 (RECOMMENDATION.md) |

---

## 15. 아키텍처 참고

> **현재 데이터 흐름**: `DiscoverContainer`는 `useDiscover` 훅이나 `DiscoverRepository`를 사용하지 않고, `/api/discover/search` (Google Places) API를 직접 `fetch()`로 호출합니다.
>
> **사용 중 (Google Places 경로)**:
> - `DiscoverContainer` → `fetch('/api/discover/search')` → Google Places API
> - `DiscoverContainer` → `fetch('/api/discover/ai-rank')` → `discover-scoring.ts`
> - `DiscoverContainer` → `fetch('/api/discover/ai-analyze')` → Tavily + Gemini
> - `DiscoverContainer` → `fetch('/api/discover/ai-recommend')` → Tavily + Gemini
>
> **미사용 (DB 직접 조회 레거시 경로)**:
> - `useDiscover` 훅 → `discoverRepo` → `SupabaseDiscoverRepository` → `restaurants` 테이블
> - `DiscoverCard` 컴포넌트, `DiscoverSearchBar` 컴포넌트
> - `/api/discover/list` API route (호출하는 곳 없음)
> - `composite-score.ts`는 list API와 SupabaseDiscoverRepository에서만 사용 (둘 다 미사용 경로)

---

## 16. 구현 파일 맵

```
src/
├── domain/
│   ├── entities/discover.ts            → DiscoverCard, DiscoverFilter, DISCOVER_AREAS, DiscoverArea
│   ├── repositories/discover-repository.ts → DiscoverRepository 인터페이스
│   └── services/
│       ├── discover-scoring.ts         → calculateScore(), formatBreakdownText(), Accolade, ScoreBreakdown
│       └── composite-score.ts          → calculateCompositeScore()
├── infrastructure/
│   └── repositories/
│       └── supabase-discover-repository.ts → SupabaseDiscoverRepository (getByArea)
├── application/
│   └── hooks/use-discover.ts           → useDiscover() (SWRInfinite, 20개/페이지, 1시간 캐시) ※ 미사용
├── presentation/
│   ├── components/discover/
│   │   ├── discover-card.tsx           → DiscoverCard (사진+뱃지+메타+평점 pill) ※ 미사용 (list API용 레거시)
│   │   └── discover-search-bar.tsx     → DiscoverSearchBar (disabled placeholder) ※ 미사용
│   └── containers/
│       └── discover-container.tsx      → DiscoverContainer (메인 UI, 자체 상태관리, AI 기능, 기록/찜)
├── shared/di/container.ts              → discoverRepo: DiscoverRepository (line 54)
└── app/
    ├── (main)/discover/page.tsx        → <DiscoverContainer /> 렌더링
    └── api/discover/
        ├── search/route.ts             → GET: Google Places 검색
        ├── ai-rank/route.ts            → POST: AI 추천순위 (수상+평점 스코어링)
        ├── ai-analyze/route.ts         → POST: 개별 식당 AI 분석 (Tavily+Gemini)
        ├── ai-recommend/route.ts       → POST: 자연어 추천 (Tavily+Gemini)
        └── list/route.ts              → GET: DB 기반 목록 (compositeScore 정렬)
```

### 타입 정의

```typescript
// domain/entities/discover.ts
interface DiscoverCard {
  id: string
  name: string
  genre: string | null
  area: string | null
  specialty: string | null
  photoUrl: string | null
  nyamScore: number | null
  compositeScore: number
  michelinStars: number | null
  hasBlueRibbon: boolean
  naverRating: number | null
  kakaoRating: number | null
  googleRating: number | null
}

interface DiscoverFilter {
  area: string
}

const DISCOVER_AREAS = ['광화문', '을지로', '종로', '강남', '성수', '홍대', '이태원', '연남'] as const
type DiscoverArea = (typeof DISCOVER_AREAS)[number]
```

```typescript
// domain/services/discover-scoring.ts
interface Accolade {
  source: string
  detail: string | null
  prestigeTier: 'S' | 'A' | 'B'
}

interface ScoreBreakdown {
  googleScore: number
  accoladeScore: number
  accolades: Accolade[]
  total: number
}
```

```typescript
// api/discover/search — DiscoverSearchResult
interface DiscoverSearchResult {
  id: string              // `google_{googlePlaceId}`
  name: string
  address: string
  lat: number | null
  lng: number | null
  googleRating: number | null
  googleRatingCount: number | null
  googlePlaceId: string
}
```

```typescript
// discover-container.tsx 내부 타입
interface DiscoverRestaurant {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  googleRating: number | null
  googleRatingCount: number | null
  googlePlaceId: string
}

interface RankedInfo {
  googleRating: number | null
  breakdown: ScoreBreakdown       // domain/services/discover-scoring.ts
}

interface AiAnalysis {
  taste: string
  atmosphere: string
  tips: string
  priceRange: string
  recommendedDishes: string[]
  summary: string
}

interface AiRecommendation {
  answer: string
  picks: Array<{ name: string; reason: string }>
}
```
