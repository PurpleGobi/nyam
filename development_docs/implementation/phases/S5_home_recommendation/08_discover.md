# 08: Discover 서브스크린

> Google Places API + AI 랭킹 기반 식당 탐색 화면. 별도 `/discover` 라우트로 구현.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/07_DISCOVER.md` | 화면 역할, 지역 칩, 카드, 정렬, API |
| `prototype/01_home.html` | `screen-discover` |

---

## 구현 완료 파일 목록

```
src/domain/entities/discover.ts                              ← DiscoverCard, DiscoverArea 타입
src/domain/services/discover-scoring.ts                      ← AI 점수 계산 서비스 (calculateScore, ScoreBreakdown)
src/presentation/containers/discover-container.tsx           ← Discover 전체 컨테이너
src/presentation/components/discover/discover-search-bar.tsx ← 검색바 (현재 미사용, 직접 입력으로 대체)
src/presentation/components/discover/area-chips.tsx          ← 지역 칩 (현재 Chip 인라인 컴포넌트 사용)
src/presentation/components/discover/discover-card.tsx       ← Discover 카드 (현재 RestaurantItem 인라인 사용)
src/app/(main)/discover/page.tsx                             ← 라우트
src/app/api/discover/search/route.ts                         ← Google Places 식당 검색 API
src/app/api/discover/ai-rank/route.ts                        ← AI 추천순위 계산 API
src/app/api/discover/ai-analyze/route.ts                     ← AI 개별 식당 분석 API
src/app/api/discover/ai-recommend/route.ts                   ← AI 자연어 추천 API
src/app/api/discover/list/route.ts                           ← 지역별 식당 목록 API (DB 기반)
```

---

## 상세 구현 현황 (설계 변경)

기존 설계(DB 기반 복합 점수)에서 **Google Places API + AI 랭킹** 기반으로 전면 변경.

### 1. DiscoverContainer 핵심 구조

```typescript
function DiscoverContainer() {
  // §1 지역: 다중 선택 (Set<string>) + 직접 입력 + "내 근처" (GPS)
  // §2 음식 종류: 다중 선택 (GENRE_MAJOR_CATEGORIES)
  // 검색: Google Places API (/api/discover/search)
  // AI 랭킹: /api/discover/ai-rank
  // AI 자연어 추천: /api/discover/ai-recommend
  // AI 분석: /api/discover/ai-analyze (개별 식당)
}
```

**UI 구조**:
```
┌──────────────────────────────────────┐
│ AppHeader + FabBack                   │
├──────────────────────────────────────┤
│ §1 지역                              │
│ [광화문] [을지로] ... [내 근처]        │
│ [구/동 직접 입력 _______________]     │
├──────────────────────────────────────┤
│ §2 음식 종류                          │
│ [한식] [일식] [중식] ...             │
├──────────────────────────────────────┤
│ [AI 추천순위 받기]                    │
│ (또는 랭킹 완료 후: AI 자연어 검색)   │
├──────────────────────────────────────┤
│ N개 결과 · AI 추천순                  │
│ ┌─ RestaurantItem (rank + name + score) │
│ │  └─ 확장: AI 분석/기록하기/찜/외부 링크 │
│ └─ ...                                │
└──────────────────────────────────────┘
```

### 2. 지역 선택

```typescript
const DISCOVER_AREAS = ['광화문', '을지로', '종로', '강남', '성수', '홍대', '이태원', '연남']
```

- 다중 선택 가능 (기존 단일 선택에서 변경)
- "내 근처": GPS 기반 (`navigator.geolocation`)
- 직접 입력: 구/동 이름 텍스트 입력
- 지역/직접입력/내근처 상호 배타

### 3. API Routes

#### `/api/discover/search` (GET)

```
GET /api/discover/search?area=광화문&genre=일식&lat=...&lng=...
```

- Google Places API (`searchGooglePlaces`) 호출
- 반환: `{ restaurants: DiscoverSearchResult[] }`
- 인증 필수 (401)

#### `/api/discover/ai-rank` (POST)

```
POST /api/discover/ai-rank
Body: { restaurants: [{ name, address, googleRating }], area }
```

- `discover-scoring.ts`의 `calculateScore()` 사용
- DB의 수상/인증 정보 매칭 (restaurant_name_norm 정규화)
- 반환: `{ ranked: [{ name, googleRating, breakdown: ScoreBreakdown }] }`

```typescript
interface ScoreBreakdown {
  total: number              // 최종 점수
  googleScore: number
  accoladeScore: number
  accolades: Accolade[]      // 수상 내역
}
```

#### `/api/discover/ai-analyze` (POST)

```
POST /api/discover/ai-analyze
Body: { restaurantName, area }
```

- AI(Gemini)로 개별 식당 분석
- 반환: `{ analysis: { taste, atmosphere, tips, priceRange, recommendedDishes, summary } }`

#### `/api/discover/ai-recommend` (POST)

```
POST /api/discover/ai-recommend
Body: { question, restaurants: [{ name, score, reason }], area }
```

- 자연어 질문에 대한 AI 추천
- 랭킹 완료 후에만 활성화
- 반환: `{ answer, picks: [{ name, reason }] }`

### 4. RestaurantItem (인라인 컴포넌트)

- 랭킹 뱃지: rank 1-3 accent, 4+ elevated
- 점수: `rankInfo.breakdown.total`
- Google 평점 표시 (RatingPill)
- 수상 내역 표시 (TagPill: 미슐랭/블루리본 등)
- 확장 시: 점수 산출 상세 + AI 분석 + 기록하기 + 찜 + 외부 링크(구글맵/네이버/카카오)

### 5. 찜(Wishlist) 연동

- `WishlistBtn`: 식당이 DB에 없으면 자동 등록 후 찜 토글
- `useWishlist` 훅 사용

### 6. 기록 연동

- "기록하기" 버튼: 식당 DB 미등록 시 자동 등록 → `/record?type=restaurant&targetId=...&from=discover`

---

## 데이터 흐름

```
[지역 선택/입력] → fetchRestaurants()
  → GET /api/discover/search?area=광화문
  → Google Places API 호출
  → restaurants[] 세팅

[AI 추천순위 받기] → handleAiRank()
  → POST /api/discover/ai-rank
  → calculateScore() + DB 수상 매칭
  → rankedMap 세팅 → 점수순 정렬

[AI 자연어 추천] → handleAiRecommend()
  → POST /api/discover/ai-recommend
  → AI 추천 결과 + picks 표시

[식당 확장] → handleAnalyze()
  → POST /api/discover/ai-analyze
  → AI 분석 결과 (맛/분위기/꿀팁/가격대/추천메뉴)

[기록하기] → handleRecord()
  → POST /api/restaurants (자동 등록)
  → router.push('/record?...')

[찜] → WishlistBtn → useWishlist toggle
```

---

## 검증 체크리스트

```
□ 지역 칩: 8개 (광화문~연남), 다중 선택, active accent
□ 지역: "내 근처" GPS 연동
□ 지역: 직접 입력 (구/동)
□ 음식 종류: GENRE_MAJOR_CATEGORIES 기반 다중 선택
□ 검색: Google Places API 정상 호출
□ AI 추천순위: ai-rank API → ScoreBreakdown 표시
□ AI 자연어 추천: 랭킹 후 활성화, 답변+picks 표시
□ AI 분석: 개별 식당 분석 (맛/분위기/꿀팁/가격대/추천메뉴)
□ RestaurantItem: rank 뱃지, 점수, 수상 태그, Google 평점
□ RestaurantItem 확장: 점수 산출 상세 + AI 분석 + 기록/찜/외부 링크
□ 기록하기: 미등록 식당 자동 등록 → 기록 플로우
□ 찜: DB 미등록 시 자동 등록 후 찜 토글
□ 빈 상태: "검색 결과가 없어요", 필터 미선택 시 안내
□ AppHeader + FabBack 정상 표시
□ 인증 필수: 비로그인 시 401
□ 360px: 칩 wrap 정상, 카드 표시 정상
□ R1~R5 위반 없음 (discover-scoring → domain/services)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
