# S3-T02: 검색 UI + 자동완성

> 텍스트 입력 → debounce 300ms → 자동완성 드롭다운 표시. 식당/와인 탭 전환. 최근 검색. fuzzy matching.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/01_SEARCH_REGISTER.md` | §3 식당 검색 화면 | 검색 바 레이아웃, 자동완성 순서, "기록 있음" 뱃지, fuzzy matching |
| `pages/01_SEARCH_REGISTER.md` | §6 와인 검색 화면 | 와인 검색 결과 항목, 빈티지 처리 |
| `pages/01_SEARCH_REGISTER.md` | §3 근처 식당 | GPS 기반 nearby 목록 (검색 전 기본 표시) |
| `systems/DESIGN_SYSTEM.md` | §1 컬러 토큰 | `--accent-food`, `--accent-wine`, `--text-hint` |
| `prototype/01_home.html` | `screen-add-restaurant-search`, `screen-add-wine-search` | 비주얼 레퍼런스 |

---

## 선행 조건

- S1-T01 (DB 스키마) 완료 — restaurants, wines 테이블 존재
- S1-T03 (디자인 토큰) 완료
- S3-T01 (카메라 AI)과 병렬 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/search.ts` | domain | SearchResult, SearchState 타입 |
| `src/shared/utils/fuzzy-match.ts` | shared | fuzzy matching 유틸 (띄어쓰기/접미사/한영 혼용) |
| `src/shared/utils/debounce.ts` | shared | debounce 유틸 (300ms) |
| `src/application/hooks/use-search.ts` | application | 검색 상태 관리 + API 호출 |
| `src/presentation/components/search/search-bar.tsx` | presentation | 검색 입력 바 |
| `src/presentation/components/search/search-results.tsx` | presentation | 검색 결과 목록 |
| `src/presentation/components/search/search-result-item.tsx` | presentation | 검색 결과 단일 항목 |
| `src/presentation/components/search/nearby-list.tsx` | presentation | 근처 식당 목록 (검색 전 표시) |
| `src/presentation/components/search/recent-searches.tsx` | presentation | 최근 검색어 |
| `src/presentation/containers/search-container.tsx` | presentation | 검색 화면 컨테이너 |

### 스코프 외

- 식당 외부 API 연동 (카카오/네이버/구글) — `03_restaurant_search.md`
- 와인 DB 검색 로직 — `04_wine_search.md`
- 신규 등록 폼 — `06_register.md`

---

## 상세 구현 지침

### 1. `src/domain/entities/search.ts`

```typescript
// src/domain/entities/search.ts
// R1: 외부 의존 0

export interface SearchResultBase {
  id: string
  name: string
  hasRecord: boolean
}

/** 식당 검색 결과 — genreDisplay, categoryPath, phone, kakaoMapUrl 추가 */
export interface RestaurantSearchResult extends SearchResultBase {
  type: 'restaurant'
  genre: string | null
  genreDisplay: string | null       // 카카오 세분류 표시용 ("한식 > 냉면")
  categoryPath: string | null       // 카카오 카테고리 원본 ("음식점 > 한식 > 냉면")
  area: string | null
  address: string | null
  distance: number | null
  lat: number | null
  lng: number | null
  phone: string | null
  kakaoMapUrl: string | null
}

/** 와인 검색 결과 */
export interface WineSearchResult extends SearchResultBase {
  type: 'wine'
  producer: string | null
  vintage: number | null
  wineType: string | null
  region: string | null
  country: string | null
}

export type SearchResult = RestaurantSearchResult | WineSearchResult

export type SearchScreenState = 'idle' | 'typing' | 'searching' | 'results' | 'empty'

export interface RecentSearch {
  query: string
  targetType: 'restaurant' | 'wine'
  timestamp: number
}

/** 근처 식당 항목 — categoryPath, address, lat, lng 추가 */
export interface NearbyRestaurant {
  id: string
  name: string
  genre: string | null
  categoryPath: string | null
  area: string | null
  address: string | null
  lat: number | null
  lng: number | null
  distance: number
  hasRecord: boolean
}
```

### 2. `src/shared/utils/fuzzy-match.ts`

**SEARCH_REGISTER.md §3 fuzzy matching**:
- 띄어쓰기 무시 ("스시 코우지" = "스시코우지")
- 점/역/호 접미사 무시
- 한영 혼용 허용 ("sushi" → "스시")

```typescript
// src/shared/utils/fuzzy-match.ts

/** 접미사 제거 패턴 (점, 역, 호, 지점, 본점, 매장) */
const SUFFIX_PATTERN = /\s*(점|역|호|지점|본점|매장|가게|식당|맛집)$/

/** 한영 매핑 (기본 케이스) */
const KOREAN_TO_ENGLISH: Record<string, string[]> = {
  '스시': ['sushi'],
  '파스타': ['pasta'],
  '라멘': ['ramen'],
  '피자': ['pizza'],
  '카페': ['cafe', 'coffee'],
  '치킨': ['chicken'],
  '버거': ['burger'],
  '스테이크': ['steak'],
  '와인': ['wine'],
  '프렌치': ['french', 'bistro'],
}

/**
 * 검색 쿼리 정규화
 * 1. 소문자 변환
 * 2. 공백 제거
 * 3. 접미사 제거
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(SUFFIX_PATTERN, '')
    .replace(/\s/g, '')
    .trim()
}

/**
 * fuzzy match: query가 target에 포함되는지 판정
 * SEARCH_REGISTER.md §3 fuzzy matching 규칙 준수
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const normQuery = normalizeQuery(query)
  const normTarget = normalizeQuery(target)

  if (normQuery.length === 0) return false

  // 직접 포함 (순방향 + 역방향)
  if (normTarget.includes(normQuery)) return true
  if (normQuery.includes(normTarget)) return true

  // 한영 혼용 체크
  for (const [korean, englishVariants] of Object.entries(KOREAN_TO_ENGLISH)) {
    if (normQuery.includes(normalizeQuery(korean))) {
      for (const eng of englishVariants) {
        const replaced = normQuery.replace(normalizeQuery(korean), eng)
        if (normTarget.includes(replaced)) return true
      }
    }
    for (const eng of englishVariants) {
      if (normQuery.includes(eng)) {
        const replaced = normQuery.replace(eng, normalizeQuery(korean))
        if (normTarget.includes(replaced)) return true
      }
    }
  }

  return false
}

/**
 * 검색 결과 정렬 점수 계산
 * 높을수록 우선 표시
 */
export function calculateSearchRelevance(query: string, name: string): number {
  const normQuery = normalizeQuery(query)
  const normName = normalizeQuery(name)

  if (normName === normQuery) return 100       // 완전 일치
  if (normName.startsWith(normQuery)) return 80 // 시작 일치
  if (normName.includes(normQuery)) return 60   // 포함
  if (fuzzyMatch(query, name)) return 40        // fuzzy 매칭

  return 0
}
```

### 3. `src/shared/utils/debounce.ts`

```typescript
// src/shared/utils/debounce.ts

/**
 * debounce 함수
 * @param fn 실행할 함수
 * @param delay 지연 시간 (ms)
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}
```

### 4. `src/application/hooks/use-search.ts`

> **설계 변경 사항**:
> - `initialQuery` 파라미터 추가 — URL searchParams에서 `q` 값을 받아 마운트 시 자동 검색
> - AI 와인 검색 통합 — 와인 DB 결과가 3개 미만이면 `/api/wines/search-ai` 자동 트리거
> - `WineSearchCandidate` 타입 import (`@/infrastructure/api/ai-recognition`)
> - `selectAiCandidate` 메서드 추가 — AI 후보 선택 시 `/api/wines/detail-ai` 호출하여 DB 저장 후 반환
> - `debounce`를 `@/shared/utils/debounce`에서 import

```typescript
// src/application/hooks/use-search.ts (실제 구현 시그니처)

interface UseSearchParams {
  targetType: 'restaurant' | 'wine'
  lat?: number | null
  lng?: number | null
  initialQuery?: string          // URL searchParams 'q' 값 (마운트 시 자동 검색)
}

export function useSearch({ targetType, lat, lng, initialQuery }: UseSearchParams) {
  // 반환:
  //   query: string
  //   setQuery: (q: string) => void
  //   screenState: SearchScreenState
  //   results: SearchResult[]               // DB 검색 결과
  //   aiCandidates: WineSearchCandidate[]    // AI 와인 검색 결과 (wine만)
  //   isSearching: boolean
  //   isAiSearching: boolean                 // AI 검색 진행 중
  //   isSelectingAi: boolean                 // AI 후보 선택(DB 저장) 진행 중
  //   selectAiCandidate: (candidate) => Promise<{id, name} | null>
  //   recentSearches: RecentSearch[]
  //   executeSearch: (q: string) => Promise<void>
  //   addRecentSearch: (q: string) => void
  //   clearRecentSearches: () => void
  //   reset: () => void
}
// 와인 검색 흐름:
//   1. DB 검색 → results (WineSearchResult[])
//   2. DB 결과 < 3개 → /api/wines/search-ai 자동 호출 → aiCandidates 업데이트
//   3. AI 후보 선택 → selectAiCandidate → /api/wines/detail-ai → DB 저장 → {id, name} 반환
```

### 5. `src/presentation/components/search/search-bar.tsx`

> **설계 변경 사항**:
> - 최근 검색 기능이 SearchBar에 내장됨 (별도 RecentSearches 컴포넌트 대신 드롭다운으로 표시)
> - `recentSearches`, `onRecentSelect`, `onRecentClear` props 추가
> - `focused` 상태로 포커스 시 border 색상 변경 관리
> - 포커스 + 입력 비어있음 + 최근 검색 존재 → 드롭다운 표시
> - 아이콘: `Search`, `X`, `Clock` (lucide-react)

```typescript
// src/presentation/components/search/search-bar.tsx

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  variant: 'restaurant' | 'wine'
  autoFocus?: boolean
  recentSearches?: RecentSearch[]       // 최근 검색 목록 (인라인 드롭다운)
  onRecentSelect?: (query: string) => void
  onRecentClear?: () => void
}
// 포커스 + value 비어있음 + recentSearches 존재 → 하단 드롭다운 표시
// 드롭다운: "최근 검색" 헤더 + 전체 삭제 버튼 + Clock 아이콘 + 검색어 목록
```

### 6. `src/presentation/components/search/search-result-item.tsx`

> **설계 변경 사항**:
> - 식당/와인 공통 렌더링으로 통합 (별도 RestaurantResultItem/WineResultItem 분리 X)
> - 아이콘 영역: 9x9 rounded-lg 배경 박스 + 아이콘 (UtensilsCrossed/Wine)
> - 식당 subtitle: `genreDisplay`(카카오 세분류) 사용 (기존 `genre` 대신)
> - 거리: MapPin 아이콘과 함께 표시 (식당만)
> - 아이콘: `UtensilsCrossed`, `Wine`, `MapPin` (lucide-react)

```typescript
// src/presentation/components/search/search-result-item.tsx

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
}
// 식당: displayName=name, subtitle=genreDisplay · area, distance=MapPin+거리
// 와인: displayName=name+vintage, subtitle=wineType · country · region
// 공통: hasRecord → "기록 있음" 뱃지 (accent-food/accent-wine)
```

### 7. `src/presentation/components/search/nearby-list.tsx`

> **설계 변경 사항**:
> - 장르 필터 + 반경 필터 UI 추가 — `genre`, `radius`, `onGenreChange`, `onRadiusChange` props
> - `NEARBY_GENRE_FILTERS` 상수 export: 전체/한식/일식/중식/양식/아시안/카페·바
> - `NEARBY_RADIUS_OPTIONS` 상수 export: 100m/250m/500m/1km/2km
> - `onRegister` prop 추가 — 하단 "직접 등록하기" 버튼
> - nearby API는 카카오맵 API를 사용 (PostGIS RPC 대신 `/api/restaurants/nearby` → 카카오 키워드/카테고리 검색)
> - 아이콘: `MapPin`, `Plus`, `UtensilsCrossed` (lucide-react)

```typescript
// src/presentation/components/search/nearby-list.tsx

interface NearbyListProps {
  restaurants: NearbyRestaurant[]
  isLoading: boolean
  genre: string                           // 현재 선택된 장르 필터
  radius: number                          // 현재 선택된 반경 (m)
  onGenreChange: (genre: string) => void
  onRadiusChange: (radius: number) => void
  onSelect: (restaurantId: string) => void
  onRegister?: () => void                 // "직접 등록하기" 클릭
}
// 상단: MapPin "근처 식당" + 반경 pill 버튼 (100m~2km)
// 중간: 장르 필터 가로 스크롤 (전체/한식/일식/...)
// 목록: UtensilsCrossed 아이콘 + 이름 + genre·area + 거리 + "기록 있음" 뱃지
// 하단: "직접 등록하기" border-dashed 버튼
```

### 8. `src/presentation/components/search/search-results.tsx`

> **설계 변경 사항**:
> - AI 와인 검색 섹션 추가 — `aiCandidates`, `isAiSearching`, `isSelectingAi`, `onSelectAiCandidate` props
> - `WineSearchCandidate` 타입 import (`@/infrastructure/api/ai-recognition`)
> - 와인 검색 시 DB 결과 하단에 "AI 추천 와인" 섹션 (Sparkles 아이콘)
> - AI 후보 항목: labelImageUrl 이미지 or Sparkles 아이콘 + 이름(한글) + 타입·국가·산지·생산자
> - 아이콘: `Plus`, `Search`, `Sparkles`, `Loader2` (lucide-react)

```typescript
// src/presentation/components/search/search-results.tsx

interface SearchResultsProps {
  screenState: SearchScreenState
  results: SearchResult[]
  variant: 'restaurant' | 'wine'
  onSelect: (result: SearchResult) => void
  onRegister: () => void
  aiCandidates?: WineSearchCandidate[]        // AI 와인 검색 결과
  isAiSearching?: boolean
  isSelectingAi?: boolean                     // AI 후보 DB 저장 진행 중
  onSelectAiCandidate?: (candidate: WineSearchCandidate) => void
}
// 렌더링 구조:
//   searching (결과 0) → 로딩 스피너
//   empty (DB+AI 모두 0) → "검색 결과가 없습니다" + "직접 등록하기"
//   results → DB 결과 목록 + (와인) "AI 추천 와인" 섹션 + "직접 등록하기"
```

---

## 목업 매핑

> **SearchContainer** (`search-container.tsx`): 검색 전용 페이지 (`/search`). `useSearch` hook 사용.
> - 최근 검색은 `SearchBar` 내부 드롭다운으로 표시 (별도 `RecentSearches` 컴포넌트 사용하지 않음, `RecentSearches` 컴포넌트는 별도 파일로 존재하지만 SearchBar에 인라인 통합)
> - 식당 검색 전: `NearbyList` (장르/반경 필터 포함, 카카오맵 API 사용)
> - 와인 검색 전: SearchBar만 표시
> - 외부 API 결과 선택 시 자동 INSERT (`/api/restaurants` POST)
> - AI 와인 후보 선택 시 `/api/wines/detail-ai` → DB 저장
> - 결과 선택 시 `/record` 페이지로 이동 (sessionStorage에 genre_hint/record_extra 저장)

| 프로토타입 Screen ID | 구현 컴포넌트 | 상태 |
|---------------------|-------------|------|
| `screen-add-restaurant-search` (검색 전) | `SearchBar` (최근 검색 드롭다운) + `NearbyList` (장르/반경 필터) | `screenState = 'idle'` |
| `screen-add-restaurant-search` (검색 중) | `SearchBar` + `SearchResults` | `screenState = 'results'` |
| `screen-add-wine-search` (검색 전) | `SearchBar` (최근 검색 드롭다운) | `screenState = 'idle'` |
| `screen-add-wine-search` (검색 중) | `SearchBar` + `SearchResults` + AI 추천 와인 섹션 | `screenState = 'results'` |

---

## 데이터 흐름

```
┌─ 사용자: 텍스트 입력
│
├─ setQuery(text)
│  ├─ text.length === 0 → screenState='idle' (근처 목록 or 대기)
│  ├─ text.length < 2 → screenState='idle'
│  └─ text.length >= 2 → screenState='typing' → debounce(300ms)
│
├─ debounce 만료 → executeSearch(query)
│  ├─ screenState='searching'
│  ├─ GET /api/restaurants/search?q={query}&lat=...&lng=... (식당)
│  │   or GET /api/wines/search?q={query} (와인)
│  │
│  ├─ 와인: DB 결과 < 3개 → POST /api/wines/search-ai 자동 트리거
│  │   → aiCandidates 업데이트 ("AI 추천 와인" 섹션 표시)
│  │
│  ├─ 결과 0개 (DB+AI 모두) → screenState='empty'
│  └─ 결과 N개 → screenState='results'
│
├─ 사용자: DB 결과 항목 선택
│  ├─ 외부 API 결과 (kakao_/naver_/google_ prefix)
│  │   → POST /api/restaurants 자동 INSERT → DB UUID 획득
│  ├─ sessionStorage에 genre_hint/record_extra 저장
│  └─ /record 페이지로 이동 (?type=...&targetId=...&name=...&meta=...)
│
├─ 사용자: AI 와인 후보 선택
│  → selectAiCandidate → POST /api/wines/detail-ai → DB 저장 → {id, name}
│  → /record 페이지로 이동
│
└─ 사용자: "직접 등록하기"
   → /register 페이지로 이동 (?type=...&name=...)
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/entities/search.ts에 외부 import 없음
□ R4: presentation/components/search/*.tsx에 infrastructure import 없음
□ debounce 300ms 동작 확인 (2자 이상 입력 시 API 호출)
□ fuzzy matching: "스시 코우지" = "스시코우지" 매칭
□ fuzzy matching: "점"/"역" 접미사 무시
□ 검색 전 → 근처 식당 목록 (식당) or 힌트 텍스트 (와인)
□ "기록 있음" 뱃지: 식당 → --accent-food, 와인 → --accent-wine
□ "기록 있음" 선택 → 토스트 + 상세 페이지 이동
□ 결과 없음 → "직접 등록하기" 버튼 표시
□ 최근 검색 localStorage 저장/로드
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 디자인 토큰 사용, 하드코딩 색상 없음
□ 모바일 360px 레이아웃 정상
```
