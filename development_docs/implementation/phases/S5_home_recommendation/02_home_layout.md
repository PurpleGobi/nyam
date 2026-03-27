# 02: 홈 레이아웃 — 탭 구조 + 저장 필터칩

> 홈 화면의 식당/와인 탭 전환, 저장 필터칩 행 (서브 네비 대체), 인라인 페이저, 탭별 독립 상태 관리

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4 콘텐츠 탭, §2-4-3 저장 필터칩 행, §3-2 식당 저장 필터칩, §4-1 와인 저장 필터칩 |
| `systems/DATA_MODEL.md` | §5-1 saved_filters 테이블 |
| `systems/DESIGN_SYSTEM.md` | §1 컬러 토큰 (accent-food, accent-wine) |
| `prototype/01_home.html` | `.content-tabs`, `.saved-chips-row`, `.inline-pager` |

---

## 선행 조건

- S1: 디자인 토큰, 인증
- S5-01: AppHeader (앱 헤더)

---

## 구현 범위

### 파일 목록

```
src/domain/entities/saved-filter.ts               ← SavedFilter 엔티티
src/domain/entities/home-state.ts                  ← 홈 상태 타입 정의 (탭, 뷰모드, 필터)
src/domain/repositories/saved-filter-repository.ts ← SavedFilterRepository 인터페이스
src/infrastructure/repositories/supabase-saved-filter-repository.ts ← Supabase 구현
src/application/hooks/use-home-state.ts            ← 탭/뷰/필터 통합 상태 관리
src/application/hooks/use-saved-filters.ts         ← 저장 필터 CRUD
src/presentation/components/home/home-tabs.tsx     ← 식당/와인 탭 + 우측 아이콘 버튼들
src/presentation/components/home/saved-filter-chips.tsx ← 저장 필터칩 행
src/presentation/components/home/inline-pager.tsx  ← 인라인 페이저 (◀ 1/3 ▶)
src/presentation/containers/home-container.tsx     ← 홈 전체 컨테이너
src/app/(main)/page.tsx                            ← 홈 라우트
```

### 스코프 외

- 뷰 모드별 카드/리스트/캘린더/지도 렌더링 (03_view_modes.md)
- 필터/소팅/검색 패널 (04_filter_sort.md)
- 통계 패널 (05_stats_panel.md)
- AI 인사/넛지 (06_nudge.md)

---

## 상세 구현 지침

### 1. SavedFilter 엔티티

```typescript
// src/domain/entities/saved-filter.ts

interface FilterRule {
  conjunction?: 'and' | 'or';      // 첫 행은 없음 (Where), 후속 행부터 필수
  attr: string;                    // 필터 속성명
  op: 'is' | 'is_not' | 'contains' | 'not_contains' | 'gte' | 'lt';
  value: string;                   // 필터 값
}

interface SavedFilter {
  id: string;
  userId: string;
  name: string;                    // 필터칩 표시 이름 (max 20자)
  targetType: 'restaurant' | 'wine';
  contextId: string | null;        // 버블 컨텍스트 시 bubble_id, 홈은 null
  rules: FilterRule[];
  sortBy: SortOption | null;       // 저장된 정렬 옵션
  orderIndex: number;              // 칩 표시 순서
  createdAt: string;
}

type SortOption = 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count';
```

### 2. HomeState 타입

```typescript
// src/domain/entities/home-state.ts

type HomeTab = 'restaurant' | 'wine';
type ViewMode = 'card' | 'list' | 'calendar';

interface ViewModeState {
  filters: FilterRule[];
  sort: SortOption;
  conjunction: 'and' | 'or';
}

// 탭 × 뷰모드 = 6개 독립 상태
interface HomeState {
  activeTab: HomeTab;
  viewMode: ViewMode;
  isMapOpen: boolean;               // 식당 탭 전용
  activeChipId: string | null;      // 현재 선택된 필터칩 ID
  viewModeStates: {
    restaurant_card: ViewModeState;
    restaurant_list: ViewModeState;
    restaurant_calendar: ViewModeState;
    wine_card: ViewModeState;
    wine_list: ViewModeState;
    wine_calendar: ViewModeState;
  };
}
```

### 3. SavedFilterRepository 인터페이스

```typescript
// src/domain/repositories/saved-filter-repository.ts

interface SavedFilterRepository {
  findByUserAndType(userId: string, targetType: 'restaurant' | 'wine'): Promise<SavedFilter[]>;
  create(filter: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<SavedFilter>;
  update(id: string, data: Partial<Pick<SavedFilter, 'name' | 'rules' | 'sortBy' | 'orderIndex'>>): Promise<void>;
  delete(id: string): Promise<void>;
  reorder(ids: string[]): Promise<void>;   // orderIndex 일괄 업데이트
}
```

### 4. HomeTabs 컴포넌트

```typescript
interface HomeTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  viewMode: ViewMode;
  onViewCycle: () => void;
  isMapOpen: boolean;
  onMapToggle: () => void;
  onFilterToggle: () => void;
  onSortToggle: () => void;
  onSearchToggle: () => void;
  isFilterOpen: boolean;
  isSortOpen: boolean;
  isSearchOpen: boolean;
}
```

**레이아웃**:

```
좌: [식당] [와인] — flex-grow spacer — 우: [뷰사이클] [지도] [필터] [소팅] [검색]
```

**CSS**:

```css
.content-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  border-bottom: 1.5px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 0;
}

.tab-btn {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-hint);
  padding: 12px 14px;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
}
.tab-btn.active {
  font-weight: 700;
  color: var(--text);
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 2.5px;
  border-radius: 2px;
  /* 식당: --accent-food #C17B5E, 와인: --accent-wine #8B7396 */
}
.tab-btn.active.restaurant::after { background: var(--accent-food); }
.tab-btn.active.wine::after { background: var(--accent-wine); }
```

**우측 아이콘 버튼들** (각 18x18, 테두리 없는 아이콘 버튼):

| 버튼 | lucide 아이콘 | 조건 |
|------|-------------|------|
| 뷰 사이클 | `layout-grid` / `list` / `calendar` | 항상 표시 |
| 지도 | `map` | 식당 탭에서만 표시. 활성 시 `--accent-social` 색상 |
| 필터 | `sliders-horizontal` | 항상 표시. 활성 시 accent 색상 |
| 소팅 | `arrow-up-down` | 항상 표시. 활성 시 accent 색상 |
| 검색 | `search` | 항상 표시. 활성 시 accent 색상 |

**상호 배타 규칙**: 필터/소팅/검색 중 하나를 열면 나머지 자동 닫힘.

### 5. SavedFilterChips 컴포넌트

```typescript
interface SavedFilterChipsProps {
  chips: SavedFilter[];
  activeChipId: string | null;
  onChipSelect: (id: string) => void;
  counts: Record<string, number>;    // chipId → 카운트
  accentClass: 'restaurant' | 'wine';
}
```

**기본 프리셋 칩 (시드 데이터)**:

| 탭 | 칩 이름 | 규칙 |
|----|---------|------|
| 식당 | 방문 | `[{attr:'status', op:'is', value:'visited'}]` |
| 식당 | 찜 | `[{attr:'status', op:'is', value:'wishlist'}]` |
| 식당 | 추천 | `[{attr:'status', op:'is', value:'recommended'}]` |
| 식당 | 팔로잉 | `[{attr:'status', op:'is', value:'following'}]` |
| 와인 | 시음 | `[{attr:'wine_status', op:'is', value:'tasted'}]` |
| 와인 | 찜 | `[{attr:'wine_status', op:'is', value:'wishlist'}]` |
| 와인 | 셀러 | `[{attr:'wine_status', op:'is', value:'cellar'}]` |

**칩 CSS**:

```css
.saved-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 8px 16px;
}
.saved-chips-row::-webkit-scrollbar { display: none; }

.saved-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 26px;
  cursor: pointer;
  transition: all 0.15s;
}
/* 식당 active */
.saved-chip.active.restaurant {
  background: var(--accent-food);
  border-color: var(--accent-food);
  color: #fff;
}
/* 와인 active */
.saved-chip.active.wine {
  background: var(--accent-wine);
  border-color: var(--accent-wine);
  color: #fff;
}

.chip-count {
  opacity: 0.6;
  font-weight: 500;
}
```

### 6. InlinePager 컴포넌트

```typescript
interface InlinePagerProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}
```

```css
.inline-pager {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.pager-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.pager-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.pager-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-hint);
  min-width: 30px;
  text-align: center;
}
```

- `◀` / `▶` 아이콘: `chevron-left` / `chevron-right` lucide 12x12
- 총 페이지 = 칩 개수 / 페이지당 표시 수 (가로 스크롤이 필요할 때만 표시)

### 7. useHomeState 훅

```typescript
// src/application/hooks/use-home-state.ts

function useHomeState(): {
  state: HomeState;
  setActiveTab: (tab: HomeTab) => void;
  cycleViewMode: () => void;          // card → list → calendar → card
  toggleMap: () => void;
  setActiveChip: (chipId: string | null) => void;
  getCurrentViewModeState: () => ViewModeState;
  updateViewModeState: (partial: Partial<ViewModeState>) => void;
}
```

- 뷰 모드 전환 시 기존 뷰의 필터/소팅 상태 보존
- 탭 전환 시 뷰 모드 유지
- `pref_home_tab` / `pref_view_mode` 사용자 설정 반영 (users 테이블)

### 8. useSavedFilters 훅

```typescript
// src/application/hooks/use-saved-filters.ts

function useSavedFilters(targetType: 'restaurant' | 'wine'): {
  filters: SavedFilter[];
  counts: Record<string, number>;
  isLoading: boolean;
  createFilter: (data: { name: string; rules: FilterRule[]; sortBy?: SortOption }) => Promise<void>;
  deleteFilter: (id: string) => Promise<void>;
  reorderFilters: (ids: string[]) => Promise<void>;
}
```

- `counts`는 각 필터칩의 결과 수를 집계 (Supabase RPC로 카운트 쿼리)
- 기본 프리셋 칩은 사용자 최초 진입 시 자동 생성 (saved_filters INSERT)

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `.content-tabs` | `HomeTabs` |
| `prototype/01_home.html` `.saved-chips-row` | `SavedFilterChips` |
| `prototype/01_home.html` `.inline-pager` | `InlinePager` |
| `prototype/01_home.html` `.view-cycle-btn` | `HomeTabs` 내 뷰사이클 버튼 |
| `prototype/01_home.html` `#mapBtn` | `HomeTabs` 내 지도 버튼 |

---

## 데이터 흐름

```
[users.pref_home_tab / pref_view_mode] → useHomeState() → { activeTab, viewMode }
                                                        → HomeTabs(activeTab, viewMode)
                                                        → SavedFilterChips(activeChipId)

[saved_filters 테이블] → useSavedFilters(targetType) → { filters, counts }
                                                      → SavedFilterChips(chips, counts)

[칩 탭] → setActiveChip(id) → rules 적용 → 레코드 필터링 (03_view_modes에서 소비)
[탭 전환] → setActiveTab('wine') → viewMode 유지, 필터/소팅 독립 로드
[뷰 전환] → cycleViewMode() → 현재 상태 보존, 다음 뷰 상태 복원
```

---

## 검증 체크리스트

```
□ 식당/와인 탭 전환 시 accent 밑줄 색상 변경 (food: #C17B5E, wine: #8B7396)
□ 탭 전환 시 뷰 모드 유지 (card에서 list로 전환 후 탭 변경 → list 유지)
□ 뷰 모드별 독립 필터/소팅 상태 보존
□ 저장 필터칩 정상 표시: pill 형태, 11px 600, 카운트 표시
□ 활성 칩: 식당 --accent-food 배경 + 흰색, 와인 --accent-wine 배경 + 흰색
□ 인라인 페이저: ◀ 1/3 ▶, disabled 시 opacity 0.2
□ 뷰 사이클: card → list → calendar → card 순환
□ 지도 버튼: 식당 탭에서만 표시, 와인 탭에서 숨김
□ 상호 배타: 필터 열면 소팅/검색 닫힘
□ sticky: 콘텐츠 탭 top:0 z-index:10
□ 기본 프리셋 칩 자동 생성 (방문/찜/추천/팔로잉, 시음/찜/셀러)
□ 360px: 칩 가로 스크롤 정상, 탭 바 줄바꿈 없음
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
