# 02: 홈 레이아웃 — 탭 구조 + 조건 칩 필터

> 홈 화면의 식당/와인 탭 전환, 조건 칩 기반 필터 시스템, 인라인 페이저, 탭별 독립 상태 관리

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4 콘텐츠 탭 |
| `systems/DESIGN_SYSTEM.md` | §1 컬러 토큰 (accent-food, accent-wine) |
| `prototype/01_home.html` | `.content-tabs` |

---

## 구현 완료 파일 목록

```
src/domain/entities/home-state.ts                  ← 홈 상태 타입 정의 (탭, 뷰모드, 필터)
src/domain/entities/saved-filter.ts                ← FilterRule, SortOption, SavedFilter 타입
src/domain/entities/condition-chip.ts              ← ConditionChip, AdvancedFilterChip 타입 + 변환 함수
src/domain/entities/filter-config.ts               ← 필터 속성/연산자/값 정의 (cascading-select 포함)
src/domain/entities/grouped-target.ts              ← GroupedTarget 타입 (레코드 → 타겟 그룹화 결과)
src/domain/services/record-grouper.ts              ← groupRecordsByTarget() 서비스
src/domain/services/filter-matcher.ts              ← matchesAllRules() — 클라이언트 필터 매칭
src/application/hooks/use-home-state.ts            ← 탭/뷰/필터 통합 상태 관리
src/application/hooks/use-settings.ts              ← 사용자 설정 (prefHomeTab, prefViewMode)
src/presentation/components/home/home-tabs.tsx     ← 식당/와인 탭 + 우측 아이콘 버튼들
src/presentation/components/home/condition-filter-bar.tsx ← 조건 칩 행 + 속성/값 팝오버
src/presentation/components/home/inline-pager.tsx  ← 인라인 페이저 (레코드 페이지네이션)
src/presentation/containers/home-container.tsx     ← 홈 전체 컨테이너
src/app/(main)/page.tsx                            ← 홈 라우트
src/app/(main)/layout.tsx                          ← 메인 레이아웃 (AuthGuard)
```

---

## 상세 구현 현황

### 1. HomeState 타입 (domain)

```typescript
// src/domain/entities/home-state.ts

type HomeTab = 'restaurant' | 'wine'
type ViewMode = 'card' | 'list' | 'calendar' | 'map'

interface ViewModeState {
  filters: FilterRule[]
  sort: SortOption
  conjunction: 'and' | 'or'
}

// 탭 × 뷰모드 = 8개 독립 상태
type ViewModeStateKey =
  | 'restaurant_card' | 'restaurant_list' | 'restaurant_calendar' | 'restaurant_map'
  | 'wine_card' | 'wine_list' | 'wine_calendar' | 'wine_map'

const VIEW_MODE_CYCLE: ViewMode[] = ['card', 'list', 'calendar']
// map은 별도 토글 (cycleViewMode에 포함되지 않음)
```

### 2. FilterRule / SortOption (domain)

```typescript
// src/domain/entities/saved-filter.ts

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null'

interface FilterRule {
  conjunction?: 'and' | 'or'
  attribute: string
  operator: FilterOperator
  value: string | number | boolean | null
}

type SortOption = 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
```

### 3. ConditionChip 시스템 (domain)

```typescript
// src/domain/entities/condition-chip.ts

interface ConditionChip {
  id: string
  attribute: string        // 'status', 'genre', 'scene', ...
  operator: FilterOperator
  value: string | number | boolean | null
  displayLabel: string     // 화면 표시용
  filterKey?: string       // cascading 칩에서 실제 필터 DB 필드
}

interface AdvancedFilterChip {
  id: string
  attribute: '__advanced__'
  rules: FilterRule[]
  conjunction: 'and' | 'or'
  displayLabel: string     // "Advanced Filter"
}

type FilterChipItem = ConditionChip | AdvancedFilterChip

// cascading-select 헬퍼: cascadingKey(), isCascadingKey(), getCascadingBaseKey(), getCascadingLevel()
// chipsToFilterRules(): FilterChipItem[] → FilterRule[] 변환
```

### 4. HomeTabs 컴포넌트

```typescript
interface HomeTabsProps {
  activeTab: HomeTab
  viewMode: ViewMode
  onTabChange: (tab: HomeTab) => void
  onViewCycle: () => void
  onMapToggle: () => void
  onSortToggle: () => void
  isSortOpen: boolean
  onSearchToggle: () => void
  isSearchOpen: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onSearchClear: () => void
}
```

- `StickyTabs` UI 컴포넌트 사용 (공통 탭 UI)
- 우측 슬롯: 검색 모드 시 inline 검색 입력란 / 기본 모드 시 아이콘 버튼들
- 아이콘 버튼: 뷰 사이클 (LayoutGrid/List/CalendarDays), 지도 (Map, 식당 전용), 소팅 (ArrowUpDown), 검색 (Search → `/discover` 이동)
- 검색 모드: Search 아이콘 + input + X(clear) + "닫기" 버튼

### 5. InlinePager 컴포넌트

```typescript
interface InlinePagerProps {
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}
```

- 레코드 페이지네이션용 (카드 5개, 리스트/지도 10개 단위)
- `◀ 1/3 ▶` 표시
- ConditionFilterBar 우측에 배치

### 6. useHomeState 훅

```typescript
function useHomeState(options?: { initialTab?: HomeTab; initialViewMode?: ViewMode }): {
  activeTab: HomeTab; setActiveTab: (tab: HomeTab) => void
  viewMode: ViewMode; cycleViewMode: () => void
  toggleMap: () => void
  isSortOpen: boolean; toggleSort: () => void
  isSearchOpen: boolean; toggleSearch: () => void
  filterRules: FilterRule[]; setFilterRules: (rules: FilterRule[]) => void
  conjunction: 'and' | 'or'; setConjunction: (conj: 'and' | 'or') => void
  currentSort: SortOption; setCurrentSort: (sort: SortOption) => void
  searchQuery: string; setSearchQuery: (q: string) => void
  getCurrentViewModeState: () => ViewModeState
}
```

- sessionStorage로 탭/뷰모드 상태 유지 (`nyam_home_tab`, `nyam_home_view`)
- `useSettings` 훅에서 사용자 설정(prefHomeTab, prefViewMode) 반영
- 뷰 모드 전환 시 기존 뷰의 필터/소팅 상태 보존 (8개 독립 상태)
- map 뷰는 별도 토글 (cycleViewMode는 card→list→calendar 순환)
- 소팅/검색 상호 배타 규칙

### 7. HomeContainer 핵심 로직

- `useRecordsWithTarget` → 식당/와인 레코드 전체 조회
- `applyFilterRules` + `searchRecords` → 클라이언트 필터링
- `groupRecordsByTarget` → 동일 타겟 그룹화 (중복 마커 제거, 방문 횟수 집계)
- `sortGroupedTargets` / `sortRecords` → 소팅 (latest/score_high/score_low/name/visit_count)
- 페이지네이션: 카드 5개, 리스트/지도 10개 단위
- 팔로잉 모드: `useFollowingFeed` 훅, `isFollowingMode` 토글

---

## 데이터 흐름

```
[useSettings] → prefHomeTab / prefViewMode → useHomeState(initialTab, initialViewMode)

[useRecordsWithTarget(userId, 'restaurant')] → restaurantRecords[]
[useRecordsWithTarget(userId, 'wine')] → wineRecords[]
                                        → activeTab으로 선택

[conditionChips] → chipsToFilterRules() → filterRules[]
                → applyFilterRules(records, rules, conjunction)
                → searchRecords(filtered, searchQuery)
                → groupRecordsByTarget()
                → sortGroupedTargets(grouped, currentSort)
                → 페이지네이션 → displayGrouped[]
                → RecordCard / WineCard / CompactListItem 렌더

[탭 전환] → setActiveTab → 칩 초기화, 뷰 모드 유지
[뷰 전환] → cycleViewMode → 현재 상태 보존, 다음 뷰 상태 복원
```

---

## 검증 체크리스트

```
□ 식당/와인 탭 전환 시 accent 밑줄 색상 변경 (food/wine)
□ 탭 전환 시 뷰 모드 유지, 조건 칩 초기화
□ 뷰 모드별 독립 필터/소팅 상태 보존 (8개 ViewModeState)
□ sessionStorage로 탭/뷰모드 유지
□ 뷰 사이클: card → list → calendar → card 순환 (map 별도)
□ 지도 버튼: 식당 탭에서만 표시
□ 소팅/검색 상호 배타
□ 조건 칩 기반 필터링 정상 (속성:값 칩 + Advanced Filter)
□ 인라인 페이저: 레코드 페이지네이션 정상
□ sticky: HomeTabs top:46px z-index:80
□ 빈 상태: "첫 식당/와인을 기록해보세요" + CTA
□ 360px: 탭 바 줄바꿈 없음
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
