# 04: 필터 + 소팅 + 홈 검색

> Notion 스타일 필터 패널, 소팅 드롭다운, 검색 드롭다운, 필터칩 저장 기능

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4-2 필터/소팅 시스템, §2-4 검색 드롭다운, §3-1 식당 필터 속성, §4-0 와인 필터 속성 |
| `systems/DATA_MODEL.md` | §5-1 saved_filters 테이블 (rules JSONB 스키마) |
| `prototype/01_home.html` | `.filter-drawer`, `.notion-filter-panel`, `.sort-dropdown`, `.search-dropdown` |

---

## 선행 조건

- S5-02: HomeState (ViewModeState.filters, ViewModeState.sort, ViewModeState.conjunction)
- S5-02: SavedFilter 엔티티, SavedFilterRepository

---

## 구현 범위

### 파일 목록

```
src/domain/entities/filter-config.ts                         ← 필터 속성/연산자/값 정의
src/domain/services/filter-query-builder.ts                  ← FilterRule[] → Supabase 쿼리 변환
src/presentation/components/home/notion-filter-panel.tsx     ← Notion 스타일 필터 패널
src/presentation/components/home/filter-rule-row.tsx         ← 필터 행 (접속사+속성+연산자+값)
src/presentation/components/home/sort-dropdown.tsx           ← 소팅 드롭다운
src/presentation/components/home/search-dropdown.tsx         ← 검색 드롭다운
src/presentation/components/home/filter-chip-save-modal.tsx  ← 필터칩 저장 모달
src/presentation/components/ui/nyam-select.tsx               ← 공통 선택 드롭다운
```

### 스코프 외

- 필터 규칙의 그룹 중첩 (AND-of-ORs) — Phase 2
- 위치 기반 필터 (GPS 반경) — Phase 2
- 풀텍스트 검색 (검색은 클라이언트 이름 매칭만)

---

## 상세 구현 지침

### 1. FilterConfig 정의

```typescript
// src/domain/entities/filter-config.ts

interface FilterAttribute {
  key: string;
  label: string;
  type: 'select' | 'multi-select' | 'range' | 'text';
  options?: { value: string; label: string }[];
}

// 식당 필터 속성 (11종)
const RESTAURANT_FILTER_ATTRIBUTES: FilterAttribute[] = [
  {
    key: 'status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'visited', label: '방문' },
      { value: 'wishlist', label: '찜' },
      { value: 'recommended', label: '추천' },
    ],
  },
  {
    key: 'scene',
    label: '상황',
    type: 'select',
    options: [
      { value: 'solo', label: '혼밥' },
      { value: 'romantic', label: '데이트' },
      { value: 'friends', label: '친구' },
      { value: 'family', label: '가족' },
      { value: 'business', label: '회식' },
      { value: 'drinks', label: '술자리' },
    ],
  },
  {
    key: 'genre',
    label: '음식종류',
    type: 'select',
    options: [
      { value: '한식', label: '한식' },
      { value: '일식', label: '일식' },
      { value: '중식', label: '중식' },
      { value: '태국', label: '태국' },
      { value: '베트남', label: '베트남' },
      { value: '인도', label: '인도' },
      { value: '이탈리안', label: '이탈리안' },
      { value: '프렌치', label: '프렌치' },
      { value: '스페인', label: '스페인' },
      { value: '지중해', label: '지중해' },
      { value: '미국', label: '미국' },
      { value: '멕시칸', label: '멕시칸' },
      { value: '카페', label: '카페' },
      { value: '바/주점', label: '바/주점' },
      { value: '베이커리', label: '베이커리' },
      { value: '기타', label: '기타' },
    ],
  },
  {
    key: 'area',
    label: '위치',
    type: 'select',
    options: [
      { value: '강남', label: '강남' },
      { value: '을지로', label: '을지로' },
      { value: '청담', label: '청담' },
      { value: '이태원', label: '이태원' },
      { value: '홍대', label: '홍대' },
      { value: '광화문', label: '광화문' },
      { value: '성수', label: '성수' },
      { value: '한남', label: '한남' },
    ],
  },
  {
    key: 'satisfaction',
    label: '점수',
    type: 'select',
    options: [
      { value: '90', label: '90+' },
      { value: '80', label: '80~89' },
      { value: '70', label: '70~79' },
      { value: '69', label: '~69' },
    ],
  },
  {
    key: 'visit_date',
    label: '시기',
    type: 'select',
    options: [
      { value: '1w', label: '최근 1주' },
      { value: '1m', label: '1개월' },
      { value: '3m', label: '3개월' },
      { value: '6m', label: '6개월' },
      { value: '1y', label: '1년+' },
    ],
  },
  {
    key: 'companion_count',
    label: '동반자',
    type: 'select',
    options: [
      { value: '1', label: '혼자' },
      { value: '2', label: '2인' },
      { value: '3-4', label: '3~4인' },
      { value: '5+', label: '5인+' },
    ],
  },
  {
    key: 'prestige',
    label: '명성',
    type: 'select',
    options: [
      { value: 'michelin_1', label: '미슐랭' },
      { value: 'blue_ribbon', label: '블루리본' },
      { value: 'tv', label: 'TV출연' },
      { value: 'none', label: '수상없음' },
    ],
  },
  {
    key: 'menu_type',
    label: '대표메뉴',
    type: 'select',
    options: [
      { value: 'course', label: '코스' },
      { value: 'single', label: '단품' },
      { value: 'omakase', label: '오마카세' },
      { value: 'buffet', label: '뷔페' },
      { value: 'set', label: '세트' },
    ],
  },
  {
    key: 'price_range',
    label: '가격대',
    type: 'select',
    options: [
      { value: '1', label: '~2만' },
      { value: '2', label: '2~5만' },
      { value: '3', label: '5~10만' },
      { value: '4', label: '10만+' },
    ],
  },
  {
    key: 'source',
    label: '소스',
    type: 'select',
    options: [
      { value: 'mine', label: '내 기록' },
      { value: 'bubble', label: '버블' },
      { value: 'mutual', label: '맞팔' },
      { value: 'all', label: '전체' },
    ],
  },
];

// 와인 필터 속성 (12종)
const WINE_FILTER_ATTRIBUTES: FilterAttribute[] = [
  {
    key: 'wine_status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'tasted', label: '시음' },
      { value: 'wishlist', label: '찜' },
      { value: 'cellar', label: '셀러' },
    ],
  },
  {
    key: 'wine_type',
    label: '스타일',
    type: 'select',
    options: [
      { value: 'red', label: 'Red' },
      { value: 'white', label: 'White' },
      { value: 'rose', label: 'Rosé' },
      { value: 'sparkling', label: 'Sparkling' },
      { value: 'orange', label: 'Orange' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'fortified', label: 'Fortified' },
    ],
  },
  {
    key: 'variety',
    label: '품종',
    type: 'select',
    options: [
      // WSET L2+L3 완전 커버리지 (55종, body_order 순)
      // ── White (33종) ──
      { value: 'Muscat', label: '뮈스카' },
      { value: 'Glera', label: '글레라' },
      { value: 'Cortese', label: '코르테제' },
      { value: 'Melon de Bourgogne', label: '멜롱 드 부르고뉴' },
      { value: 'Trebbiano', label: '트레비아노' },
      { value: 'Albarino', label: '알바리뇨' },
      { value: 'Riesling', label: '리슬링' },
      { value: 'Pinot Grigio', label: '피노 그리' },
      { value: 'Sauvignon Blanc', label: '소비뇽 블랑' },
      { value: 'Gruner Veltliner', label: '그뤼너 벨트리너' },
      { value: 'Garganega', label: '가르가네가' },
      { value: 'Verdicchio', label: '베르디키오' },
      { value: 'Vermentino', label: '베르멘티노' },
      { value: 'Assyrtiko', label: '아시르티코' },
      { value: 'Arneis', label: '아르네이스' },
      { value: 'Friulano', label: '프리울라노' },
      { value: 'Furmint', label: '푸르민트' },
      { value: 'Falanghina', label: '팔랑기나' },
      { value: 'Fiano', label: '피아노' },
      { value: 'Greco', label: '그레코' },
      { value: 'Chenin Blanc', label: '슈냉 블랑' },
      { value: 'Semillon', label: '세미용' },
      { value: 'Gewurztraminer', label: '게뷔르츠트라미너' },
      { value: 'Marsanne', label: '마르산느' },
      { value: 'Roussanne', label: '루산느' },
      { value: 'Viognier', label: '비오니에' },
      { value: 'Chardonnay', label: '샤르도네' },
      { value: 'Torrontes', label: '토론테스' },
      { value: 'Grillo', label: '그릴로' },
      { value: 'Carricante', label: '카리칸테' },
      { value: 'Pecorino', label: '페코리노' },
      { value: 'Vernaccia', label: '베르나차' },
      { value: 'Catarratto', label: '카타라토' },
      // ── Red (32종) ──
      { value: 'Schiava', label: '스키아바' },
      { value: 'Frappato', label: '프라파토' },
      { value: 'Gamay', label: '가메' },
      { value: 'Dolcetto', label: '돌체토' },
      { value: 'Cinsault', label: '생소' },
      { value: 'Pinot Noir', label: '피노 누아' },
      { value: 'Corvina', label: '코르비나' },
      { value: 'Nerello Mascalese', label: '네렐로 마스칼레제' },
      { value: 'Lambrusco', label: '람브루스코' },
      { value: 'Barbera', label: '바르베라' },
      { value: 'Cabernet Franc', label: '카베르네 프랑' },
      { value: 'Grenache', label: '그르나슈' },
      { value: 'Carignan', label: '카리냥' },
      { value: 'Sangiovese', label: '산지오베제' },
      { value: 'Tempranillo', label: '템프라니요' },
      { value: 'Merlot', label: '메를로' },
      { value: 'Montepulciano', label: '몬테풀치아노' },
      { value: 'Nero d\'Avola', label: '네로 다볼라' },
      { value: 'Carmenere', label: '카르메네르' },
      { value: 'Pinotage', label: '피노타주' },
      { value: 'Zinfandel', label: '진판델' },
      { value: 'Negroamaro', label: '네그로아마로' },
      { value: 'Syrah', label: '쉬라즈' },
      { value: 'Nebbiolo', label: '네비올로' },
      { value: 'Malbec', label: '말벡' },
      { value: 'Cabernet Sauvignon', label: '카베르네 소비뇽' },
      { value: 'Mourvedre', label: '무르베드르' },
      { value: 'Aglianico', label: '알리아니코' },
      { value: 'Sagrantino', label: '사그란티노' },
      { value: 'Touriga Nacional', label: '투리가 나시오날' },
      { value: 'Tannat', label: '타나' },
      { value: 'Petit Verdot', label: '프티 베르도' },
    ],
  },
  {
    key: 'country',
    label: '산지',
    type: 'select',
    options: [
      // WSET L2+L3 전체 커버리지 (15개국)
      { value: 'France', label: 'France' },
      { value: 'Italy', label: 'Italy' },
      { value: 'Spain', label: 'Spain' },
      { value: 'Portugal', label: 'Portugal' },
      { value: 'Germany', label: 'Germany' },
      { value: 'Austria', label: 'Austria' },
      { value: 'Hungary', label: 'Hungary' },
      { value: 'Greece', label: 'Greece' },
      { value: 'USA', label: 'USA' },
      { value: 'Chile', label: 'Chile' },
      { value: 'Argentina', label: 'Argentina' },
      { value: 'Australia', label: 'Australia' },
      { value: 'New Zealand', label: 'NZ' },
      { value: 'South Africa', label: 'South Africa' },
      { value: 'Canada', label: 'Canada' },
    ],
  },
  {
    key: 'vintage',
    label: '빈티지',
    type: 'select',
    options: [
      { value: '2024', label: '2024' },
      { value: '2023', label: '2023' },
      { value: '2022', label: '2022' },
      { value: '2021', label: '2021' },
      { value: '2020', label: '2020' },
      { value: '2019', label: '2019' },
      { value: 'before_2018', label: '2018 이전' },
    ],
  },
  {
    key: 'satisfaction',
    label: '점수',
    type: 'select',
    options: [
      { value: '90', label: '90+' },
      { value: '80', label: '80~89' },
      { value: '70', label: '70~79' },
      { value: '69', label: '~69' },
    ],
  },
  {
    key: 'visit_date',
    label: '시음시기',
    type: 'select',
    options: [
      { value: '1w', label: '최근 1주' },
      { value: '1m', label: '1개월' },
      { value: '3m', label: '3개월' },
      { value: '6m', label: '6개월' },
      { value: '1y', label: '1년+' },
    ],
  },
  {
    key: 'pairing_categories',
    label: '페어링',
    type: 'select',
    options: [
      { value: 'red_meat', label: '적색육' },
      { value: 'white_meat', label: '백색육' },
      { value: 'seafood', label: '어패류' },
      { value: 'cheese', label: '치즈' },
      { value: 'vegetable', label: '채소' },
      { value: 'dessert', label: '디저트' },
    ],
  },
  {
    key: 'purchase_price',
    label: '가격대',
    type: 'select',
    options: [
      { value: '30000', label: '~3만' },
      { value: '70000', label: '3~7만' },
      { value: '150000', label: '7~15만' },
      { value: '150001', label: '15만+' },
    ],
  },
  {
    key: 'acidity_level',
    label: '산미',
    type: 'select',
    options: [
      { value: '1', label: '낮음' },
      { value: '2', label: '중간' },
      { value: '3', label: '높음' },
    ],
  },
  {
    key: 'sweetness_level',
    label: '당도',
    type: 'select',
    options: [
      { value: '1', label: '드라이' },
      { value: '2', label: '오프드라이' },
      { value: '3', label: '스위트' },
    ],
  },
  {
    key: 'complexity',
    label: '복합도',
    type: 'select',
    options: [
      { value: 'simple', label: '단순 (0~33)' },
      { value: 'medium', label: '중간 (34~66)' },
      { value: 'complex', label: '복합 (67~100)' },
    ],
  },
];

const FILTER_OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
] as const;
```

### 2. FilterQueryBuilder 서비스

```typescript
// src/domain/services/filter-query-builder.ts

class FilterQueryBuilder {
  /**
   * FilterRule[]를 Supabase PostgREST 필터로 변환
   * conjunction='and' → .and() 체이닝
   * conjunction='or' → .or() 체이닝
   */
  static buildQuery(
    query: SupabaseQuery,
    rules: FilterRule[],
    conjunction: 'and' | 'or'
  ): SupabaseQuery;

  /**
   * 개별 rule을 Supabase 필터 조건으로 변환
   * prestige → michelin_stars / has_blue_ribbon / media_appearances 복합 쿼리
   * satisfaction '90' → satisfaction >= 90
   * visit_date '3m' → visit_date >= NOW() - INTERVAL '3 months'
   * companion_count '3-4' → companion_count >= 3 AND companion_count <= 4
   */
  static applyRule(query: SupabaseQuery, rule: FilterRule): SupabaseQuery;
}
```

prestige 필터 매핑:

| value | SQL 조건 |
|-------|---------|
| `michelin_1` | `restaurants.michelin_stars IS NOT NULL` |
| `blue_ribbon` | `restaurants.has_blue_ribbon = true` |
| `tv` | `restaurants.media_appearances IS NOT NULL AND jsonb_array_length(restaurants.media_appearances) > 0` |
| `none` | `restaurants.michelin_stars IS NULL AND restaurants.has_blue_ribbon = false` |

### 3. NotionFilterPanel 컴포넌트

```typescript
interface NotionFilterPanelProps {
  rules: FilterRule[];
  conjunction: 'and' | 'or';
  attributes: FilterAttribute[];
  onRulesChange: (rules: FilterRule[]) => void;
  onConjunctionChange: (conj: 'and' | 'or') => void;
  onSaveAsChip: () => void;
}
```

**레이아웃**:

```
┌──────────────────────────────┐
│ Where [속성▾] is [값▾]     ✕ │
│ And   [속성▾] is [값▾]     ✕ │
│ + 필터 추가                   │
│──────────────────────────────│
│ [필터칩으로 저장]              │
└──────────────────────────────┘
```

**CSS**:

```css
.notion-filter-panel {
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}

.filter-rule-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.filter-conjunction {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-hint);
  min-width: 40px;
  cursor: pointer;
  /* 탭 시 and ↔ or 전체 전환 */
}

.filter-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-sub);
  cursor: pointer;
  padding: 6px 0;
}

.filter-delete-btn {
  font-size: 14px;
  color: var(--text-hint);
  cursor: pointer;
  padding: 4px;
}
.filter-delete-btn:hover {
  color: var(--negative);
}
```

### 4. FilterRuleRow 컴포넌트

```typescript
interface FilterRuleRowProps {
  index: number;
  rule: FilterRule;
  conjunction: 'and' | 'or';
  attributes: FilterAttribute[];
  onUpdate: (rule: FilterRule) => void;
  onDelete: () => void;
  onConjunctionToggle: () => void;
}
```

- 첫 행: "Where" 텍스트 (고정)
- 후속 행: "And" / "Or" 토글 (탭 시 전체 전환)
- 속성 드롭다운: `nyam-select`, 13px weight 500, radius 10px, 1px `--border`
- 연산자 드롭다운: 동일 스타일
- 값 드롭다운: 속성에 따라 동적 옵션 변경

### 5. SortDropdown 컴포넌트

```typescript
interface SortDropdownProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  accentType: 'restaurant' | 'wine';
}
```

**소팅 옵션**:

| 값 | 라벨 |
|----|------|
| `latest` | 최신순 |
| `score_high` | 점수 높은순 |
| `score_low` | 점수 낮은순 |
| `name` | 이름순 |
| `visit_count` | 방문 많은순 |

```css
.sort-dropdown {
  position: absolute;
  right: 16px;
  top: calc(100% + 4px);
  min-width: 140px;
  background: var(--bg-elevated);
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  z-index: 80;
  padding: 4px;
  border: 1px solid var(--border);
}

.sort-item {
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
}
.sort-item:hover { background: var(--bg); }
.sort-item.active {
  color: var(--accent-food); /* 와인: --accent-wine */
  font-weight: 600;
}
```

선택 시 드롭다운 자동 닫힘.

### 6. SearchDropdown 컴포넌트

```typescript
interface SearchDropdownProps {
  query: string;
  onQueryChange: (q: string) => void;
  onClear: () => void;
  placeholder: string; // "식당·와인 이름으로 검색"
}
```

```css
.search-dropdown {
  padding: 8px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
}

.search-input-wrap textarea {
  flex: 1;
  border: none;
  background: none;
  font-size: 14px;
  color: var(--text);
  resize: none;
  /* rows=1, auto-expand */
}

.search-clear-btn {
  /* x lucide 14x14, 입력 있을 때만 표시 */
  display: none;
  cursor: pointer;
}
.search-input-wrap.has-value .search-clear-btn {
  display: flex;
}
```

- 아이콘: `search` lucide 16x16, stroke `--text-hint`
- 플레이스홀더: "식당·와인 이름으로 검색"
- clear: `x` lucide 14x14
- 실시간 클라이언트 필터링 (records + restaurant/wine name LIKE)

### 7. FilterChipSaveModal 컴포넌트

```typescript
interface FilterChipSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}
```

```css
.chip-save-modal {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.chip-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
}
.chip-name-input::placeholder { color: var(--text-hint); }
```

- 플레이스홀더: "필터칩 이름 입력..."
- 저장 시 saved_filters INSERT → 칩 행에 추가
- 이름 최대 20자

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `.notion-filter-panel` | `NotionFilterPanel` |
| `prototype/01_home.html` `.filter-rule-row` | `FilterRuleRow` |
| `prototype/01_home.html` `.sort-dropdown` | `SortDropdown` |
| `prototype/01_home.html` `.search-dropdown` | `SearchDropdown` |
| `prototype/01_home.html` `.filter-chip-bar` | `FilterChipSaveModal` |

---

## 데이터 흐름

```
[필터 버튼 탭] → NotionFilterPanel 열림 (소팅/검색 닫힘)
             → FilterRuleRow × N
             → onRulesChange(rules[]) → useHomeState().updateViewModeState({ filters })
             → useHomeRecords() 재조회 (FilterQueryBuilder가 Supabase 쿼리 생성)

[소팅 버튼 탭] → SortDropdown 열림 (필터/검색 닫힘)
             → onSortChange('score_high') → useHomeState().updateViewModeState({ sort })

[검색 버튼 탭] → SearchDropdown 열림 (필터/소팅 닫힘)
             → onQueryChange(query) → 클라이언트 name LIKE 필터링

[필터칩 저장] → FilterChipSaveModal → name 입력 → saved_filters INSERT
           → 칩 행 갱신 (useSavedFilters refetch)
```

---

## 검증 체크리스트

```
□ 필터 패널: Where/And/Or 접속사, 클릭 시 전체 전환
□ 필터 패널: 속성 드롭다운 식당 11종, 와인 12종 모두 표시
□ 필터 패널: 연산자 6종 (is/is_not/contains/not_contains/gte/lt)
□ 필터 패널: + 필터 추가, ✕ 삭제 정상
□ 필터 패널: prestige 복합 쿼리 정상 (michelin/blue_ribbon/tv/none)
□ 소팅 드롭다운: 5개 옵션, 활성 항목 accent 색상
□ 소팅 드롭다운: 선택 시 자동 닫힘
□ 검색 드롭다운: textarea auto-expand, clear 버튼
□ 상호 배타: 필터 열면 소팅/검색 닫힘 (역방향도)
□ 필터칩 저장: 이름 입력 → saved_filters INSERT → 칩 행 갱신
□ 뷰 모드별 독립 상태: card에서 필터 적용 → list 전환 → 별도 상태
□ FilterQueryBuilder: 모든 속성 타입에 대해 정확한 SQL 조건 생성
□ 360px: 필터 패널 스크롤 가능, 드롭다운 잘림 없음
□ R1~R5 위반 없음 (FilterQueryBuilder는 domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
