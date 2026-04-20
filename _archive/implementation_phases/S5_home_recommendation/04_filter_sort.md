# 04: 필터 + 소팅 + 홈 검색

> 조건 칩 기반 필터 시스템, Advanced Filter 바텀시트, 소팅 드롭다운, 인라인 검색

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4-2 필터/소팅 시스템, §3-1 식당 필터 속성, §4-0 와인 필터 속성 |
| `prototype/01_home.html` | `.filter-drawer`, `.sort-dropdown` |

---

## 구현 완료 파일 목록

```
src/domain/entities/filter-config.ts                         ← 필터 속성/연산자/값 정의 (cascading-select 포함)
src/domain/entities/condition-chip.ts                        ← ConditionChip, AdvancedFilterChip 타입 + 변환
src/domain/entities/saved-filter.ts                          ← FilterRule, FilterOperator, SortOption 타입
src/domain/services/filter-matcher.ts                        ← matchesAllRules() 클라이언트 필터 매칭
src/presentation/components/home/condition-filter-bar.tsx    ← 조건 칩 바 + 속성/값 선택 팝오버
src/presentation/components/home/advanced-filter-sheet.tsx   ← Advanced Filter 바텀시트
src/presentation/components/home/notion-filter-panel.tsx     ← Notion 스타일 필터 패널 (레거시)
src/presentation/components/home/filter-rule-row.tsx         ← 필터 행 (NotionFilterPanel 내부)
src/presentation/components/home/sort-dropdown.tsx           ← 소팅 드롭다운
src/presentation/components/home/search-dropdown.tsx         ← 검색 드롭다운 (레거시)
src/presentation/components/home/filter-chip-save-modal.tsx  ← 필터칩 저장 모달 (레거시)
src/presentation/components/home/saved-filter-chips.tsx      ← 저장 필터칩 (레거시, ConditionFilterBar로 대체)
src/application/hooks/use-saved-filters.ts                   ← 저장 필터 CRUD (레거시)
```

**주요 변경 사항**: 기존 Notion 스타일 필터 패널 + saved_filters 기반 시스템 → 조건 칩(ConditionFilterBar) + Advanced Filter 바텀시트 시스템으로 전면 리팩토링.

---

## 상세 구현 현황

### 1. FilterConfig 정의

```typescript
// src/domain/entities/filter-config.ts

type FilterAttributeType = 'select' | 'multi-select' | 'range' | 'text' | 'cascading-select'

interface FilterAttribute {
  key: string
  label: string
  type: FilterAttributeType
  options?: FilterAttributeOption[]
  cascadingOptions?: CascadingOption[]    // cascading-select 전용: 계층 트리
  cascadingLabels?: string[]             // cascading-select 전용: 레벨별 라벨
  cascadingFieldKeys?: string[]          // cascading-select 전용: 레벨별 DB 필드 키
}
```

- 식당/와인 필터 속성은 `RESTAURANT_FILTER_ATTRIBUTES`, `WINE_FILTER_ATTRIBUTES`로 정의
- 위치 필터: `cascading-select` 타입 (국가 → 도시 → 구/동 3단계 계층)
- FilterOperator: `'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'is_null' | 'is_not_null'`

### 2. ConditionFilterBar 컴포넌트 (핵심 필터 UI)

```typescript
interface ConditionFilterBarProps {
  chips: FilterChipItem[]
  onChipsChange: (chips: FilterChipItem[]) => void
  attributes: FilterAttribute[]
  accentType: 'food' | 'wine' | 'social'
  onAdvancedOpen: () => void
  recordPage?: number
  recordTotalPages?: number
  onRecordPagePrev?: () => void
  onRecordPageNext?: () => void
}
```

**UI 구조**:
```
┌──────────────────────────────────────────────────┐
│ [상태:방문 ✕] [장르:일식 ✕] [+ 필터 추가]  ◀ 1/3 ▶ │
└──────────────────────────────────────────────────┘
```

**핵심 동작**:
- `+ 필터 추가` → Portal 팝오버 → 속성 선택 → 값 선택 → 칩 생성
- cascading-select: 레벨 0 선택 → 하위 레벨 "전체" 자동 생성 → 개별 편집 가능
- 칩 클릭 → 값 변경 팝오버 (같은 속성 옵션 목록)
- 칩 ✕ 클릭 → 제거 (cascading: 레벨 0 삭제 시 전체 그룹 제거)
- `+ Advanced Filter` → `onAdvancedOpen()` 콜백
- 우측: InlinePager (레코드 페이지네이션)

### 3. AdvancedFilterSheet 컴포넌트

- 바텀 시트 UI
- 복잡한 다중 규칙 필터 설정
- 적용 시 `AdvancedFilterChip` 생성 → chips 배열에 추가/교체

### 4. SortDropdown 컴포넌트

```typescript
interface SortDropdownProps<T extends string = SortOption> {
  currentSort: T
  onSortChange: (sort: T) => void
  accentType: 'food' | 'wine' | 'social'
  labels?: Record<T, string>
}
```

- 기본 옵션: 최신순 / 점수 높은순 / 점수 낮은순 / 이름순 / 방문 많은순
- 활성 항목: accent 색상 + Check 아이콘
- 선택 시 자동 닫힘
- generic 타입 지원 (`labels` prop으로 커스텀 옵션)

### 5. filter-matcher.ts (클라이언트 필터 엔진)

```typescript
// src/domain/services/filter-matcher.ts
function matchesAllRules(
  record: Record<string, unknown>,
  rules: FilterRule[],
  conjunction: 'and' | 'or'
): boolean
```

- 서버 쿼리 대신 클라이언트에서 필터링 수행
- `useRecordsWithTarget`로 전체 레코드 로드 → `matchesAllRules`로 필터링

### 6. HomeContainer에서의 필터 흐름

```typescript
// home-container.tsx 내부
const [conditionChips, setConditionChips] = useState<FilterChipItem[]>([])

// 칩 변경 → filterRules 동기화
const handleChipsChange = (chips: FilterChipItem[]) => {
  setConditionChips(chips)
  const rules = chipsToFilterRules(chips)  // ConditionChip → FilterRule[] 변환
  setFilterRules(rules)
}

// 필터 적용
const filteredRecords = applyFilterRules(records, filterRules, conjunction)
const searched = searchRecords(filteredRecords, searchQuery)
```

---

## 데이터 흐름

```
[+ 필터 추가 탭] → 속성 팝오버 → 값 팝오버 → ConditionChip 생성
                → onChipsChange(nextChips)
                → chipsToFilterRules() → filterRules[]
                → applyFilterRules(records, rules, conjunction) → 필터된 레코드

[소팅 버튼 탭] → SortDropdown 열림 (검색 닫힘, 상호 배타)
             → onSortChange('score_high') → sortGroupedTargets()

[검색 버튼 탭] → HomeTabs 내 인라인 검색 입력 (Search → /discover 이동)
             → 또는 검색 모드에서 이름 매칭 필터링

[Advanced Filter] → AdvancedFilterSheet → AdvancedFilterChip 생성
                  → chips 배열에 추가 → filterRules에 rules 병합

[탭 전환] → conditionChips 초기화 (빈 배열 = 전체보기)
```

---

## 검증 체크리스트

```
□ ConditionFilterBar: 속성:값 칩 + ✕ 삭제 정상
□ ConditionFilterBar: + 필터 추가 → 속성 팝오버 → 값 팝오버
□ ConditionFilterBar: cascading-select 3단계 (국가→도시→구/동)
□ ConditionFilterBar: cascading "전체" 플레이스홀더, 상위 미선택 시 안내
□ ConditionFilterBar: 칩 클릭 → 값 변경 팝오버 (Check 표시)
□ ConditionFilterBar: + Advanced Filter → 바텀시트
□ AdvancedFilterSheet: 복합 규칙 설정 → AdvancedFilterChip 생성
□ SortDropdown: 5개 옵션, 활성 항목 accent + Check
□ SortDropdown: 선택 시 자동 닫힘
□ 소팅/검색 상호 배타
□ 필터 적용 시 레코드 목록 즉시 갱신
□ 뷰 모드별 독립 상태: card에서 필터 → list 전환 → 별도 상태
□ 탭 전환 시 칩 초기화
□ InlinePager: 레코드 페이지네이션 (카드 5개, 리스트 10개)
□ 360px: 칩 가로 스크롤, 팝오버 잘림 없음
□ R1~R5 위반 없음 (filter-matcher → domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
