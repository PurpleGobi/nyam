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

/** 검색 결과 공통 인터페이스 */
export interface SearchResultBase {
  id: string
  name: string
  /** 사용자가 이미 기록한 항목인지 */
  hasRecord: boolean
}

/** 식당 검색 결과 */
export interface RestaurantSearchResult extends SearchResultBase {
  type: 'restaurant'
  genre: string | null
  area: string | null
  address: string | null
  distance: number | null  // meters (GPS 기반)
  lat: number | null
  lng: number | null
}

/** 와인 검색 결과 */
export interface WineSearchResult extends SearchResultBase {
  type: 'wine'
  producer: string | null
  vintage: number | null
  wineType: string | null  // 'red' | 'white' | ...
  region: string | null
  country: string | null
}

/** 검색 결과 유니온 */
export type SearchResult = RestaurantSearchResult | WineSearchResult

/** 검색 화면 상태 */
export type SearchScreenState =
  | 'idle'           // 검색 전 (근처 목록 or 힌트 표시)
  | 'typing'         // 입력 중 (debounce 대기)
  | 'searching'      // API 호출 중
  | 'results'        // 결과 표시
  | 'empty'          // 결과 없음

/** 최근 검색 항목 */
export interface RecentSearch {
  query: string
  targetType: 'restaurant' | 'wine'
  timestamp: number
}

/** 근처 식당 항목 (GPS 기반, 검색 전 표시) */
export interface NearbyRestaurant {
  id: string
  name: string
  genre: string | null
  area: string | null
  distance: number  // meters
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

```typescript
// src/application/hooks/use-search.ts

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { debounce } from '@/shared/utils/debounce'
import type { SearchResult, SearchScreenState, RecentSearch } from '@/domain/entities/search'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2
const MAX_RECENT_SEARCHES = 10
const RECENT_SEARCHES_KEY = 'nyam_recent_searches'

interface UseSearchParams {
  targetType: 'restaurant' | 'wine'
  /** GPS 좌표 (검색 API에 전달 — 거리 기반 정렬용) */
  lat?: number | null
  lng?: number | null
}

interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  screenState: SearchScreenState
  results: SearchResult[]
  recentSearches: RecentSearch[]
  isSearching: boolean
  /** 검색 실행 (2자 이상 시 자동 호출) */
  executeSearch: (q: string) => Promise<void>
  /** 최근 검색 추가 */
  addRecentSearch: (q: string) => void
  /** 최근 검색 삭제 */
  clearRecentSearches: () => void
  /** 전체 초기화 */
  reset: () => void
}

export function useSearch({ targetType, lat, lng }: UseSearchParams): UseSearchReturn {
  const [query, setQueryInternal] = useState('')
  const [screenState, setScreenState] = useState<SearchScreenState>('idle')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  /** 진행 중인 fetch 요청 취소용 AbortController */
  const abortRef = useRef<AbortController | null>(null)

  // 로컬 스토리지에서 최근 검색 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed: RecentSearch[] = JSON.parse(stored)
        setRecentSearches(parsed.filter((s) => s.targetType === targetType))
      }
    } catch {
      // localStorage 접근 불가 시 무시
    }
  }, [targetType])

  const executeSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setScreenState('idle')
      setResults([])
      return
    }

    // 이전 진행 중인 요청 취소
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsSearching(true)
    setScreenState('searching')

    try {
      const endpoint = targetType === 'restaurant'
        ? '/api/restaurants/search'
        : '/api/wines/search'

      let url = `${endpoint}?q=${encodeURIComponent(q)}`
      if (lat != null && lng != null) url += `&lat=${lat}&lng=${lng}`

      const response = await fetch(url, {
        signal: controller.signal,
      })
      const data: { results: SearchResult[] } = await response.json()

      if (data.results.length === 0) {
        setScreenState('empty')
      } else {
        setScreenState('results')
      }
      setResults(data.results)
    } catch (err) {
      // AbortError는 무시 (새 검색으로 대체된 요청)
      if (err instanceof DOMException && err.name === 'AbortError') return
      setScreenState('empty')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [targetType])

  // debounced search
  const debouncedSearch = useMemo(
    () => debounce((q: string) => {
      executeSearch(q)
    }, DEBOUNCE_MS),
    [executeSearch]
  )

  const setQuery = useCallback((q: string) => {
    setQueryInternal(q)
    if (q.length === 0) {
      // 입력 완전 삭제 → idle (최근 검색 표시 조건)
      setScreenState('idle')
      setResults([])
    } else if (q.length < MIN_QUERY_LENGTH) {
      // 1자 입력 → 너무 짧음, 검색 없이 idle 유지
      setScreenState('idle')
      setResults([])
    } else {
      // MIN_QUERY_LENGTH(2자) 이상 → typing + debounce 검색
      setScreenState('typing')
      debouncedSearch(q)
    }
  }, [debouncedSearch])

  // addRecentSearch: 검색 쿼리 문자열을 직접 받음 (결과 이름이 아닌 사용자 입력 쿼리 저장)
  const addRecentSearch = useCallback((q: string) => {
    const newEntry: RecentSearch = {
      query: q,
      targetType,
      timestamp: Date.now(),
    }

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.query !== q)
      const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      try {
        const allStored = localStorage.getItem(RECENT_SEARCHES_KEY)
        const all: RecentSearch[] = allStored ? JSON.parse(allStored) : []
        const otherType = all.filter((s) => s.targetType !== targetType)
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([...updated, ...otherType]))
      } catch {
        // localStorage 접근 불가 시 무시
      }
      return updated
    })
  }, [targetType])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      const allStored = localStorage.getItem(RECENT_SEARCHES_KEY)
      const all: RecentSearch[] = allStored ? JSON.parse(allStored) : []
      const otherType = all.filter((s) => s.targetType !== targetType)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(otherType))
    } catch {
      // 무시
    }
  }, [targetType])

  const reset = useCallback(() => {
    // 진행 중인 요청 취소
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setQueryInternal('')
    setScreenState('idle')
    setResults([])
    setIsSearching(false)
  }, [])

  return {
    query,
    setQuery,
    screenState,
    results,
    recentSearches,
    isSearching,
    executeSearch,
    addRecentSearch,
    clearRecentSearches,
    reset,
  }
}
```

### 5. `src/presentation/components/search/search-bar.tsx`

```typescript
// src/presentation/components/search/search-bar.tsx

import { useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** 와인 모드일 때 --accent-wine 포커스 색상 */
  variant: 'restaurant' | 'wine'
  autoFocus?: boolean
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  variant,
  autoFocus = true,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const focusRingClass = variant === 'restaurant'
    ? 'border-[var(--accent-food)]'  // onFocusCapture/onBlurCapture inline style로 구현
    : 'border-[var(--accent-wine)]'

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 mx-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-colors ${focusRingClass}`}
    >
      <Search size={18} className="text-[var(--text-hint)] flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-[14px] text-[var(--text)] placeholder:text-[var(--text-hint)] bg-transparent outline-none"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="flex-shrink-0 p-0.5"
        >
          <X size={16} className="text-[var(--text-hint)]" />
        </button>
      )}
    </div>
  )
}
```

### 6. `src/presentation/components/search/search-result-item.tsx`

```typescript
// src/presentation/components/search/search-result-item.tsx

import { UtensilsCrossed, Wine, MapPin } from 'lucide-react'
import type { SearchResult, RestaurantSearchResult, WineSearchResult } from '@/domain/entities/search'

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
}

export function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  if (result.type === 'restaurant') {
    return <RestaurantResultItem result={result} onSelect={() => onSelect(result)} />
  }
  return <WineResultItem result={result} onSelect={() => onSelect(result)} />
}

function RestaurantResultItem({
  result,
  onSelect,
}: {
  result: RestaurantSearchResult
  onSelect: () => void
}) {
  const subtextParts = [result.genre, result.area].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent-food-light)] transition-colors"
    >
      <UtensilsCrossed size={18} className="text-[var(--accent-food)] flex-shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-semibold text-[var(--text)] truncate">
          {result.name}
        </p>
        {subtextParts && (
          <p className="text-[12px] text-[var(--text-sub)] truncate">
            {subtextParts}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {result.distance !== null && (
          <span className="text-[12px] text-[var(--text-hint)]">
            {result.distance < 1000
              ? `${Math.round(result.distance)}m`
              : `${(result.distance / 1000).toFixed(1)}km`}
          </span>
        )}
        {result.hasRecord && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-food-light)] text-[var(--accent-food)] font-medium">
            기록 있음
          </span>
        )}
      </div>
    </button>
  )
}

function WineResultItem({
  result,
  onSelect,
}: {
  result: WineSearchResult
  onSelect: () => void
}) {
  const namePart = result.vintage
    ? `${result.name} ${result.vintage}`
    : result.name

  const subtextParts: string[] = []
  if (result.wineType) {
    const typeMap: Record<string, string> = {
      red: 'Red', white: 'White', rose: 'Rosé',
      sparkling: 'Sparkling', orange: 'Orange',
      fortified: 'Fortified', dessert: 'Dessert',
    }
    subtextParts.push(typeMap[result.wineType] ?? result.wineType)
  }
  if (result.country) subtextParts.push(result.country)
  if (result.region) subtextParts.push(result.region)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent-wine-light)] transition-colors"
    >
      <Wine size={18} className="text-[var(--accent-wine)] flex-shrink-0" />
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] font-semibold text-[var(--text)] truncate">
          {namePart}
        </p>
        {subtextParts.length > 0 && (
          <p className="text-[12px] text-[var(--text-sub)] truncate">
            {subtextParts.join(' · ')}
          </p>
        )}
      </div>
      {result.hasRecord && (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-wine-light)] text-[var(--accent-wine)] font-medium flex-shrink-0">
          기록 있음
        </span>
      )}
    </button>
  )
}
```

### 7. `src/presentation/components/search/nearby-list.tsx`

**SEARCH_REGISTER.md §3 근처 식당** — 검색 전 GPS 기반 기본 표시

```typescript
// src/presentation/components/search/nearby-list.tsx

import { UtensilsCrossed, MapPin } from 'lucide-react'
import type { NearbyRestaurant } from '@/domain/entities/search'

interface NearbyListProps {
  restaurants: NearbyRestaurant[]
  isLoading: boolean
  onSelect: (restaurantId: string) => void
}

export function NearbyList({ restaurants, isLoading, onSelect }: NearbyListProps) {
  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} className="text-[var(--text-sub)]" />
          <span className="text-[13px] font-semibold text-[var(--text-sub)]">근처 식당</span>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--border)] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="w-24 h-3.5 rounded bg-[var(--border)] animate-pulse" />
              <div className="w-32 h-3 rounded bg-[var(--border)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <MapPin size={32} className="text-[var(--text-hint)] mb-3" />
        <p className="text-[14px] text-[var(--text-sub)]">
          근처에 등록된 식당이 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-2 px-3">
        <MapPin size={14} className="text-[var(--text-sub)]" />
        <span className="text-[13px] font-semibold text-[var(--text-sub)]">근처 식당</span>
      </div>

      {restaurants.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r.id)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--accent-food-light)] transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-food-light)] flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed size={18} className="text-[var(--accent-food)]" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[14px] font-semibold text-[var(--text)] truncate">
              {r.name}
            </p>
            <p className="text-[12px] text-[var(--text-sub)] truncate">
              {[r.genre, r.area].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[12px] text-[var(--text-hint)]">
              {r.distance < 1000
                ? `${Math.round(r.distance)}m`
                : `${(r.distance / 1000).toFixed(1)}km`}
            </span>
            {r.hasRecord && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-food-light)] text-[var(--accent-food)] font-medium">
                기록 있음
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
```

### 8. `src/presentation/components/search/search-results.tsx`

```typescript
// src/presentation/components/search/search-results.tsx

import { Plus, Search } from 'lucide-react'
import { SearchResultItem } from '@/presentation/components/search/search-result-item'
import type { SearchResult, SearchScreenState } from '@/domain/entities/search'

interface SearchResultsProps {
  screenState: SearchScreenState
  results: SearchResult[]
  variant: 'restaurant' | 'wine'
  onSelect: (result: SearchResult) => void
  onRegister: () => void
}

export function SearchResults({
  screenState,
  results,
  variant,
  onSelect,
  onRegister,
}: SearchResultsProps) {
  if (screenState === 'searching') {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="w-6 h-6 border-2 border-[var(--text-hint)] border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-[13px] text-[var(--text-hint)]">검색 중...</p>
      </div>
    )
  }

  if (screenState === 'empty') {
    const label = variant === 'restaurant' ? '식당' : '와인'
    return (
      <div className="flex flex-col items-center py-12">
        <Search size={32} className="text-[var(--text-hint)] mb-3" />
        <p className="text-[14px] text-[var(--text-sub)]">
          검색 결과가 없습니다
        </p>
        <button
          type="button"
          onClick={onRegister}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[var(--border-bold)] text-[13px] text-[var(--text-sub)]"
        >
          <Plus size={16} />
          목록에 없나요? 직접 등록하기
        </button>
      </div>
    )
  }

  if (screenState !== 'results' || results.length === 0) {
    return null
  }

  return (
    <div>
      <ul className="divide-y divide-[var(--border)]">
        {results.map((result) => (
          <li key={result.id}>
            <SearchResultItem result={result} onSelect={onSelect} />
          </li>
        ))}
      </ul>

      {/* 하단 직접 등록 */}
      <div className="border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onRegister}
          className="w-full flex items-center gap-2 px-4 py-3.5 text-[13px] text-[var(--text-sub)]"
        >
          <Plus size={16} />
          목록에 없나요? 직접 등록하기
        </button>
      </div>
    </div>
  )
}
```

---

## 목업 매핑

> **SearchContainer**: `screenState === 'idle'`일 때 `RecentSearches` 컴포넌트를 NearbyList/힌트 위에 렌더링함 (최근 검색어가 있을 경우). `addRecentSearch`는 사용자가 결과 항목을 선택할 때 결과 이름이 아닌 **검색 쿼리 문자열**을 전달받아 저장.

| 프로토타입 Screen ID | 구현 컴포넌트 | 상태 |
|---------------------|-------------|------|
| `screen-add-restaurant-search` (검색 전) | `SearchBar` + `RecentSearches` + `NearbyList` | `screenState = 'idle'` |
| `screen-add-restaurant-search` (검색 중) | `SearchBar` + `SearchResults` | `screenState = 'results'` |
| `screen-add-wine-search` (검색 전) | `SearchBar` + 힌트 텍스트 | `screenState = 'idle'` |
| `screen-add-wine-search` (검색 중) | `SearchBar` + `SearchResults` | `screenState = 'results'` |

---

## 데이터 흐름

```
┌─ 사용자: 텍스트 입력
│
├─ setQuery(text)
│  ├─ text.length === 0 → screenState='idle' (RecentSearches + 근처 목록 or 힌트 표시)
│  ├─ text.length < 2 → screenState='idle' (검색 없이 대기)
│  └─ text.length >= 2 → screenState='typing' → debounce(300ms)
│
├─ debounce 만료 → executeSearch(query)
│  ├─ screenState='searching'
│  ├─ GET /api/restaurants/search?q={query} (or /api/wines/search)
│  │   └─ 서버: Nyam DB 검색 + 외부 API 폴백 (03_restaurant_search.md)
│  ├─ 결과 0개 → screenState='empty'
│  └─ 결과 N개 → screenState='results'
│
├─ 사용자: 결과 항목 선택
│  ├─ hasRecord=true → 토스트 "기록 있음" → 상세 페이지 이동
│  └─ hasRecord=false → 07_full_flow.md 연결
│     ├─ 검색/목록 경로 → status='checked' → 성공 화면
│     └─ (카메라 경로에서 왔으면 → 기록 화면)
│
└─ 사용자: "직접 등록하기" → 06_register.md
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
