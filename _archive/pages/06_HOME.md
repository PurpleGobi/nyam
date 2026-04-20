# HOME — 홈 화면

> depends_on: DATA_MODEL, RATING_ENGINE, RECOMMENDATION, XP_SYSTEM, DESIGN_SYSTEM
> route: /
> prototype: `prototype/01_home.html` (screen-home)

---

## 1. 화면 구성

```
┌──────────────────────────────┐
│ nyam  bubbles 🔔 [레벨바] [J]│  ← 앱 헤더 (sticky, glassmorphism) + XP 레벨바
├──────────────────────────────┤
│ 점심 메뉴 고민 중이세요?       │  ← AI 인사 (5초 후 소멸)
│ ● nyam AI · 나의 기록 기반    │
├──────────────────────────────┤
│ [식당] [와인]     [뷰] [🗺] [↕] [🔍]│ ← 탭 + 뷰사이클 + 지도 + 소팅 + 검색
├──────────────────────────────┤
│ [+ 조건] [상태:방문 ✕] ...  │  ← 조건 필터 칩 바 + 인라인 페이저
├──────────────────────────────┤
│                              │
│  ┌─ 식당 탭 ──────────────┐  │
│  │ [플레이스 카드 리스트]    │  ← card / list / calendar 뷰
│  │ (통계 패널: 토글 가능)    │  ← 지도/장르/점수분포/월별소비/상황
│  └─────────────────────────┘  │
│                              │
│  ┌─ 와인 탭 ──────────────┐  │
│  │ [와인 카드 리스트]        │  ← card / list / calendar 뷰
│  │ (통계 패널: 토글 가능)    │  ← 산지지도/품종차트/점수분포/월별소비/와인타입
│  └─────────────────────────┘  │
│                              │
│         [+ FAB]              │  ← 플로팅 액션 버튼 (accent 색상)
└──────────────────────────────┘
```

---

## 2. 공통 요소

### 2-1. 앱 헤더 (sticky, glassmorphism)

```
┌──────────────────────────────┐
│ nyam  bubbles 🔔 [레벨바] [J]│
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 컨테이너 | `.top-fixed` — fixed position, z-index **90** |
| 배경 | `rgba(248,246,243,0.78)`, `backdrop-filter: blur(48px) saturate(1.6)` |
| 패딩 | `5px 16px` (md: 32px, lg: 48px) |
| 그림자 | `0 1px 8px rgba(0,0,0,0.06)`, border-bottom `1px solid rgba(0,0,0,0.04)` |
| 브랜드 로고 | `.header-brand` — `var(--font-logo)` 26px 700, gradient text `linear-gradient(135deg, #FF6038, #8B7396)` |
| bubbles 텍스트 | `.header-bubbles` — `var(--font-logo)` 15px 700, `var(--brand)` 색상, `/bubbles` 진입점 |
| 알림 벨 | `NotificationBell` — 탭 → `NotificationDropdown` 팝업 토글, 미읽음 시 뱃지 dot |
| XP 레벨바 | `HeaderLevelBar` — XP 시스템 레벨 진행 상황 표시, 벨 아이콘과 아바타 사이에 위치 (levelInfo가 있을 때만 표시) |
| 아바타 | `.header-avatar` — 34×34 원형, `--accent-food` 배경, 흰색 텍스트 14px 700 |
| 아바타 드롭다운 | `.avatar-menu` — min-width 120px, `--bg-elevated` 배경, `--r-md` radius, 항목: 프로필(`User` lucide), 설정(`Settings` lucide) |
| 우측 요소 순서 | `.header-right` gap 6px — bubbles → 벨 → 레벨바 → 아바타 |
| 하단 여백 | `.header-spacer` height 46px (fixed 헤더 아래 콘텐츠 밀어냄) |

### 2-2. AI 인사

```
┌──────────────────────────────┐
│ 점심 메뉴 고민 중이세요?       │
│ 이번 주 광화문 쪽을 자주       │
│ 가셨네요 — 오늘은 새로운 데    │
│ 어때요?                      │
│ ● nyam AI · 나의 기록 기반    │
└──────────────────────────────┘
```

| 속성 | 값 |
|------|-----|
| 위치 | 헤더 아래, 탭 바 위 |
| 컴포넌트 | `AiGreeting` |
| 배경 | `var(--bg)` |
| 패딩 | `14px 20px 12px` |
| 텍스트 | 15px weight 500, line-height 1.55 |
| 소멸 | **5초 후 자동** (opacity + max-height fade out, transition 0.6s cubic-bezier) |
| 재등장 | 세션 내 1회만 |
| 탭 동작 | `greeting.restaurantId` 있으면 해당 식당 상세(`/restaurants/${id}`)로 이동, 없으면 무반응. DOM에 `data-restaurant-id` 속성으로도 표시 |
| 서브텍스트 | `● nyam AI · 나의 기록 기반`, 11px `--text-hint` |
| AI dot | 5×5px, `--positive` #7EAE8B, aiPulse 2s ease infinite |

#### 시간대별 멘트 풀

| 시간대 | 예시 | 연결 식당 |
|--------|------|-----------|
| 아침 (6~11시) | "어제 스시코우지는 어떠셨어요?" | 스시코우지 |
| 점심 (11~15시) | "이번 주 광화문 쪽을 자주 가셨네요" | 없음 또는 추천 식당 |
| 저녁 (15~21시) | "데이트라면 스시코우지 다시 가셔도" | 스시코우지 |
| 밤 (21~6시) | "이번 주 기록 3건 — 꾸준히 잘 하고 계세요" | 없음 |

- 사용자 기록 기반 멘트 생성 (식당명, 점수, 방문 빈도, 지역 패턴 반영)

### 2-3. 넛지 스트립

> **⚠️ 미구현**: 현재 코드에서 넛지 스트립은 홈 컨테이너에 포함되어 있지 않음. 추후 구현 예정.

### 2-4. 콘텐츠 탭

```
[식당]  [와인]        [뷰] [🗺] [↕] [🔍]
  ↑ active            ↑    ↑    ↑    ↑
  accent 밑줄       사이클 지도 소팅 검색→/discover
```

| 요소 | 스펙 |
|------|------|
| 위치 | sticky top:46px, z-index 80 |
| 배경 | `var(--bg)` |
| 컴포넌트 | `StickyTabs` 기반, food/wine variant 전환 |
| 탭 | `.filter-tab` — `식당` / `와인` 2개, 16px weight 500, `--text-hint` 비활성 색상 |
| 활성 표시 | `.filter-tab.active` — 하단 accent border-bottom 3px (식당: `--accent-food`, 와인: `--accent-wine`), weight 700 |
| 뷰 사이클 버튼 | `view-cycle-btn`, 탭하면 card → list → calendar 순환. 아이콘: `LayoutGrid` → `List` → `CalendarDays`. map 뷰일 때는 card(LayoutGrid) 아이콘 표시 |
| 지도 버튼 | `Map` lucide, **식당 탭에서만 표시** (와인 탭에서는 숨김). 탭 → 지도 뷰 토글 (활성 시 `active map` 클래스) |
| 소팅 버튼 | `ArrowUpDown` lucide 20×20, 탭 → 소팅 드롭다운 메뉴 토글 |
| 검색 버튼 | `Search` lucide 20×20, 탭 → **`/discover` 페이지로 이동** (인라인 검색 아님) |
| 배치 순서 | 좌 → 우: [식당] [와인] — spacer — [뷰 사이클] [지도(식당만)] [소팅] [검색] |
| 탭 전환 시 | 보기 모드 유지, 필터/소팅은 탭 × 뷰모드별 독립 |
| 참고 | 검색 버튼은 `/discover`로 이동하므로 홈 내 인라인 검색은 없음. `HomeTabs`에 인라인 검색 UI(`isSearchOpen`)가 구현되어 있으나, 홈 컨테이너에서는 사용하지 않음 |

### 2-4-1. 보기 사이클 (card / list / calendar / map)

식당·와인 탭 공통으로 적용되는 보기 형식 순환 전환.

| 속성 | 값 |
|------|-----|
| 위치 | 콘텐츠 탭 바 우측, 지도 버튼 왼쪽 |
| 컴포넌트 | `view-cycle-btn` — 아이콘 버튼 1개, 탭하면 순환 |
| 기본값 | `card` (기존 카드 뷰). 사용자 설정(`prefViewMode`)이 있으면 해당 값 사용 |
| 상태 공유 | 식당↔와인 탭 전환해도 보기 모드 유지 (sessionStorage 저장). 사용자 설정(`prefHomeTab`)으로 초기 탭도 지정 가능 |
| 순환 순서 | card (`LayoutGrid`) → list (`List`) → calendar (`CalendarDays`) → card ... |
| 지도 전환 | 지도 버튼은 별도 토글 — map ↔ card 전환 (사이클에 포함 안 됨) |

#### card 보기 (기본)

기존 카드 뷰 그대로 (3-3. 플레이스 카드 / 4-3. 와인 카드 참조). 페이지당 5개.

#### list 보기

컴팩트 리스트 형태로 이름 + 기본 정보 + 점수만 표시. 한눈에 많은 항목 비교 가능.

```
┌──────────────────────────────┐
│ 1  [썸네일] 스시코우지   [⊞] 92 │
│            일식 · 3/15 · 3회   │
│───────────────────────────────│
│ 2  [썸네일] 미진          [⊞] 88 │
│            한식 · 3/12         │
│───────────────────────────────│
│ 3  [썸네일] 을지로 골뱅이  [⊞] 85 │
│            한식 · 3/10         │
│───────────────────────────────│
│ ... (페이지당 10개)              │
└──────────────────────────────┘

⊞ = MiniQuadrant (48×48)
메타 = targetMeta(장르) · visitDate · visitCount회
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `CompactListItem` |
| 데이터 | 페이지당 10개 (인라인 페이저로 페이지네이션) |
| 순위 표시 | `.compact-rank` 14px weight 700, width 20px. 1~3위: accent 색상 (`.top`), 4위~: `--text-hint` |
| 썸네일 | `.compact-thumb` 48×48, border-radius 12px |
| 이름 | `.compact-name` 15px weight 700, `--text`, truncate |
| 메타 | `.compact-meta` 12px, `--text-hint`, truncate + 방문 횟수 뱃지 (`visitCount > 1`) + 버블 멤버 수 |
| 우측 | `MiniQuadrant` 48×48 + `.compact-score` 20px weight 800 (accent 색상) |
| 미평가 | `.compact-score.unrated` — `—` 표시, 15px weight 600, `--text-hint` |
| 와인 | `Wine` lucide 아이콘, 어두운 gradient 배경 placeholder |
| 버블 모드 | `bubbleDots` prop 시 `BubbleQuadrant` 사용, `memberCount` + `latestReviewAt` 표시 |

#### calendar 보기

월간 캘린더 그리드. 기록이 있는 날은 사진 썸네일이 배경으로 표시되고, 점수·카운트가 오버레이된다.

```
┌──────────────────────────────┐
│ ◀ 2026년 3월 ▶              │
│ 일  월  화  수  목  금  토    │
│              1               │
│  2  [📷88] 4  5  6 [📷92 ②] 8│  ← 📷 = 사진 배경 + 점수 + 카운트
│  9  10  11  12  13  14  15  │
│ 16  17  18 [📷]  20  21  22 │
│ 23 [24] 25  26  27  28  29  │  ← [today]
│ 30  31                      │
├──────────────────────────────┤
│ 3월 19일 (수) · 2곳 방문     │
│ [점심] 스시코우지  92         │
│ [저녁] 도쿄등심    90         │
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `CalendarView` (lazy-loaded via `dynamic()`) |
| props | `year`, `month`, `records: CalendarDayData[]`, `onMonthChange`, `onDaySelect`, `selectedDate`, `accentType` |
| 그리드 | 7열 그리드 (일~토), gap 3px |
| 셀 | aspect-ratio 1 (정사각), radius 8px |
| 사진 있는 날 | 기록 사진이 셀 배경으로 채워짐, 어둡게 오버레이 |
| 점수 표시 | 셀 우하단, 12px 700, 흰색 텍스트 |
| 카운트 | 같은 날 복수 기록 시 pill 뱃지 (우상단, recordCount > 1) |
| 오늘 | accent 색상 outline (식당: `--accent-food`, 와인: `--accent-wine`) |
| 선택된 날 | accent 하이라이트 배경 |
| 날짜 탭 | 하단에 `CalendarDayDetail` — 해당일 기록 리스트 (mealTime 라벨 + 이름 + 점수) |
| 월 네비 | `◀ 2026년 3월 ▶`, chevron-left/right 아이콘 |
| 조건 필터 바 | calendar 모드에서는 조건 필터 바 + 소팅 드롭다운 숨김 |
| 데이터 | `useCalendarRecords` hook — CalendarDayData (date, photoUrl, topScore, recordCount) |

### 2-4-2. 필터/소팅 시스템

**4가지 보기 모드(card/list/calendar/map) 모두 동일한 필터/소팅 엔진을 사용하되, 탭 × 모드별 설정값은 독립 저장된다.**

```
모드 전환해도 각 모드의 필터/소팅 상태가 보존됨:
  card 모드: 필터 없음, 최신순
  list 모드: 장르=일식 AND 점수=90+, 점수순
  calendar 모드: 필터 적용 (캘린더 모드에서는 조건 필터 바 숨김)
  map 모드: 필터 없음, 최신순
  → 모드 전환 시 각각의 설정 복원
```

#### 상태 관리

```typescript
// 뷰 모드별 독립 상태
interface ViewModeState {
  filters: FilterRule[];     // 필터 규칙
  sort: SortOption;          // 정렬 옵션
  conjunction: 'and' | 'or'; // 접속사
}

// 탭 × 뷰모드 = 8개 독립 상태
state: {
  restaurant_card: ViewModeState;
  restaurant_list: ViewModeState;
  restaurant_calendar: ViewModeState;
  restaurant_map: ViewModeState;
  wine_card: ViewModeState;
  wine_list: ViewModeState;
  wine_calendar: ViewModeState;
  wine_map: ViewModeState;
}
```

#### 조건 필터 칩 바 (ConditionFilterBar)

탭 바 아래에 상시 표시되는 조건 칩 기반 필터 시스템. 캘린더 모드에서는 숨김.

```
[+ 조건] [상태:방문 ✕] [음식종류:일식 ✕] [+ Advanced Filter]   [◀ 1/3 ▶]
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `ConditionFilterBar` |
| `+` 버튼 | 속성 선택 팝오버 열림 → 속성 선택 → 값 선택 팝오버 → 칩 추가 |
| 조건 칩 | `FilterChipGroup` — pill 형태, 속성명:값 표시, ✕ 버튼으로 삭제, 클릭으로 값 수정 |
| 캐스케이딩 셀렉트 | 위치(district)/생활권(area) 등 다단계 선택 지원 (국가→도시→구/동) |
| 고급 필터 | `+ Advanced Filter` 버튼 → `AdvancedFilterSheet` 바텀시트 열림 |
| 팝오버 | React Portal 기반, 버튼 아래 위치, 외부 클릭 시 닫힘 |
| 인라인 페이저 | 우측 정렬, `◀ 1/3 ▶` 형태, 카드/리스트/맵 뷰의 페이지네이션 |
| 칩 없음 상태 | `+` 버튼만 표시 = 전체보기 상태 |
| 탭 전환 시 | 칩 초기화 (탭별 독립) |

#### 고급 필터 (AdvancedFilterSheet)

`+ Advanced Filter` 버튼 → 바텀시트로 노션 스타일 멀티 룰 필터:

```
┌──────────────────────────────┐
│ 고급 필터                      │
│ Where [속성▾] is [값▾]     ✕ │
│ And   [속성▾] is [값▾]     ✕ │
│ + 필터 추가                   │
│            [적용] (N개 조건)   │
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `AdvancedFilterSheet` → 내부에 `FilterSystem` 사용 |
| 접속사 | AND / OR 전체 전환 토글 |
| 적용 버튼 | 규칙 0개이면 비활성, N개 조건 표시 |
| 결과 | `AdvancedFilterChip`으로 변환되어 조건 칩 바에 `N개 조건` 칩으로 표시 |
| 닫기 | Escape / 외부 클릭 |

#### 소팅 (↕ 버튼 → 드롭다운)

`ArrowUpDown` 아이콘 탭 → 드롭다운 메뉴:

| 옵션 | 설명 |
|------|------|
| 최신순 | 기록 날짜 내림차순 (기본) |
| 점수 높은순 | 만족도 내림차순 |
| 점수 낮은순 | 만족도 오름차순 |
| 이름순 | 가나다/ABC 오름차순 |
| 방문 많은순 | 방문 횟수 내림차순 |

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `SortDropdown`, `ds-sort-dropdown` 클래스 |
| 스타일 | 탭 바 아래 relative 위치, mx-4 |
| 항목 | `nyam-dropdown-item`, 선택된 항목에 `Check` 아이콘 표시 |
| 활성 항목 | accent 색상 (식당: `--accent-food`, 와인: `--accent-wine`) |
| 선택 시 | 드롭다운 자동 닫힘 |
| 캘린더 모드 | 소팅 드롭다운 숨김 |

> 필터/소팅은 card·list·calendar·map 보기 모두에서 동작하며, 탭 × 뷰 모드별 독립 상태로 저장됨.

### 2-4-3. 조건 필터 칩을 통한 상태 필터링

기존 서브 네비(방문/찜/추천/팔로잉, 시음/찜/셀러)는 **조건 필터 칩 바의 `상태` 속성 필터**로 대체되었다.

```
[+ 조건] → 상태 선택 → 방문/찜/팔로잉 (식당), 시음/찜/셀러 (와인)
```

| 동작 | 설명 |
|------|------|
| 상태 필터 추가 | `+` 버튼 → `상태` 속성 선택 → `방문`/`찜`/`팔로잉` 값 선택 |
| 칩 표시 | `상태:방문` 형태의 칩으로 표시, ✕로 해제 |
| 복합 필터 | 다른 속성과 자유롭게 조합 가능 (예: 상태:방문 + 음식종류:일식) |
| 인라인 페이저 | `InlinePager` — 우측 정렬, `◀ 1/3 ▶` 형태 |

> 저장 필터칩 프리셋 기능(`saved-filter-chips.tsx`, `filter-chip-save-modal.tsx`)은 컴포넌트가 구현되어 있으나 현재 홈 컨테이너에서는 사용되지 않음.

### 2-5. FAB (+) — 추가 버튼

```
                                     [+]
```

| 속성 | 값 |
|------|-----|
| 위치 | `.fab-add` — fixed, bottom 10px, right 16px, z-index 85 |
| 크기 | **56×56** 원형 |
| 컴포넌트 | `FabAdd` — variant prop에 따라 배경색 변경 |
| variant=food | `--accent-food` 배경, 흰색 아이콘 |
| variant=wine | `--accent-wine` 배경, 흰색 아이콘 |
| variant=default | `rgba(248,246,243,0.88)` 배경, `backdrop-filter: blur(12px)`, `--text` 아이콘 |
| 아이콘 | `Plus` lucide 26×26 |
| 탭 동작 | `/add?type=${activeTab}` 페이지로 이동 (현재 탭에 따라 식당/와인 기록 플로우 진입) |

#### FAB 동작 (탭별 분기)

| 현재 탭 | 동작 | 다음 화면 |
|---------|------|-----------|
| 식당 | 식당 방문 기록 추가 | **카메라 촬영** (음식/식당 사진 인식) + 앨범에서 추가 / 목록에서 추가 (폴백) |
| 와인 | 와인 시음 기록 추가 | **카메라 촬영** (라벨 인식) + 앨범에서 추가 / 이름으로 검색 (폴백) |

- 식당/와인 특정 완료 → 저장 (Phase 1 끝)
- 이미 기록한 항목 → 토스트 알림 + 상세페이지 이동
- 풍성화(점수, 한줄평 등)는 상세페이지에서 진행 (05_RECORD_FLOW.md §8 풍성화)

---

## 3. 식당 탭

### 3-1. 식당 필터 속성

| 속성 (key) | 타입 | 값 옵션 |
|------------|------|---------|
| 상태 (status) | select | 방문 / 찜 / 팔로잉 |
| 상황 (scene) | select | 혼밥 / 데이트 / 친구 / 가족 / 회식 / 술자리 |
| 음식종류 (genre) | select | 한식 / 일식 / 중식 / 태국 / 베트남 / 인도 / 이탈리안 / 프렌치 / 스페인 / 지중해 / 미국 / 멕시칸 / 카페 / 바/주점 / 베이커리 / 기타 |
| 위치 (district) | cascading-select | 국가 → 도시 → 구 (한국→서울→강남구/중구/..., 일본→도쿄→시부야구/...) |
| 생활권 (area) | cascading-select | 국가 → 도시 → 생활권 (한국→서울→강남/역삼/청담/이태원/홍대/광화문/성수/한남/...) |
| 점수 (satisfaction) | select | 90+ / 80~89 / 70~79 / ~69 |
| 시기 (visit_date) | select | 최근 1주 / 1개월 / 3개월 / 6개월 / 1년+ |
| 동반자 (companion_count) | select | 혼자 / 2인 / 3~4인 / 5인+ |
| 명성 (prestige) | select | 미슐랭 / 블루리본 / TV출연 / 수상없음 |
| 대표메뉴 (menu_type) | select | 코스 / 단품 / 오마카세 / 뷔페 / 세트 |
| 가격대 (price_range) | select | 저가 / 중간 / 고가 |

> 조건 필터 칩 바의 `+` 버튼에서 `상태` 속성을 선택하면 방문/찜/팔로잉 필터를 적용할 수 있음

### 3-2. 팔로잉 피드 모드

팔로잉 모드는 별도의 `FollowingFeed` 컴포넌트로 렌더링되며, lazy-loaded.

> **⚠️ 부분 구현**: `FollowingFeed` 컴포넌트와 `useFollowingFeed` hook, `handleFollowingSelect` 핸들러가 구현되어 있으나, 현재 UI에서 팔로잉 모드를 활성화하는 토글 버튼이 홈 화면에 연결되어 있지 않음. `isFollowingMode` 상태가 항상 `false`로 유지됨.

```
[전체] [버블] [맞팔]   ← 소스 필터 칩
──────────────────
팔로잉 피드 카드 리스트
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `FollowingFeed` (dynamic import, lazy-loaded) |
| 소스 필터 | `전체` / `버블` / `맞팔` — `FollowingFeedCard` 표시 |
| 활성화 | `isFollowingMode` 상태 토글 (현재 UI에 토글 버튼 미연결) |
| 빈 상태 | 버블 링크로 안내 |
| 데이터 | `useFollowingFeed` hook — userId, targetType 기반 |
| 통계 패널 | 팔로잉 모드에서는 통계 패널 + 일반 콘텐츠 숨김 |

### 3-3. 플레이스 카드 (RecordCard)

```
┌──────────────────────────────┐
│ ┌───────────┐                │
│ │사진 (46%) │ 미진            │
│ │           │ 한식 · 광화문 · 3/15│
│ │[블루리본]  │  방문 3회        │
│ │           │ [●사분면]  88   │
│ └───────────┘ 🏷나 88 · 3/15  │
│               [버블스티커] [공유]│
│               ♡ 24  💬 8      │
└──────────────────────────────┘
```

#### 카드 구성 요소

| 영역 | 요소 | 스펙 |
|------|------|------|
| 컨테이너 | `RecordCard` | flex, rounded-2xl, border 1px `--border`, `--bg-card` 배경, min-height 190px, 전체 버튼 (클릭→상세) |
| 좌측 | 사진 컬럼 | w-[46%], Next.js Image 또는 gradient placeholder (`UtensilsCrossed`/`Wine` 아이콘) |
| 좌측 | 뱃지 | `PlaceBadge` — position absolute, flex column gap 4px |
| 우측 | info 컬럼 | flex: 1, padding 14px, flex column |
| 우측 | 식당명 | 16px weight 700, 1줄 truncate |
| 우측 | 메타 | 12px `--text-sub`, `장르 · 지역 · 날짜` + 방문 횟수 뱃지 (visitCount > 1일 때) |
| 우측 | 점수 행 | flex gap 10px — `MiniQuadrant` 44×44 + 만족도 점수 32px weight 800 |
| 우측 | 소스 태그 | `SourceTag` 컴포넌트, flex column gap 4px. 미평가 시 "평가하기 →" 링크 |
| 우측 | 버블 스티커 | `sharedBubbles` — 버블 아이콘 + 이름, 공유 버튼 (`Share2` lucide) |
| 우측 | 인게이지먼트 | `Heart` + `MessageCircle` 아이콘 + 카운트 |
| 카드 간격 | gap-3 (12px) |
| 인터랙션 | active → `transform: scale(0.985)` |
| 페이지네이션 | 카드 뷰: 페이지당 5개 |

#### 소스 태그 시스템

카드에 표시되는 정보 출처 태그. `SourceTag` 컴포넌트로 렌더링.

| 소스 태그 | 색상 | 표시 내용 |
|-----------|------|-----------|
| `me` (나) | `--accent-food-light` 배경, `--accent-food` 텍스트 | 내 점수 · 날짜 |
| `bubble` (버블) | `rgba(122,155,174,0.15)` 배경, `--accent-social` 텍스트 | 버블 멤버 정보 |
| `web` (웹) | `--bg-page` 배경, `--text-hint` 텍스트 | 외부 점수 정보 |
| `ai` (AI) | `rgba(126,174,139,0.15)` 배경, `--positive` 텍스트 | AI 추천 사유 |
| `cellar` (셀러) | `--accent-wine-light` 배경, `--accent-wine` 텍스트 | 구매가 · 구매일 |

**현재 구현된 소스:**
- 홈 카드 피드에서는 `나` 소스만 기본 표시 (`나 · 점수 · 날짜`)
- 미평가 카드: 점수 `—` 표시 + "평가하기 →" 링크 (ArrowRight 아이콘)

#### 뱃지 종류

| 뱃지 | 스타일 | 예시 |
|------|--------|------|
| 미슐랭 | 10px 700, `rgba(220,50,50,0.9)` 배경, 흰색, radius 6px, blur(8px) | 미슐랭 ★ |
| 블루리본 | `rgba(59,130,246,0.9)` 배경, 흰색 | 블루리본 |
| TV 출연 | `rgba(0,0,0,0.75)` 배경, 흰색 | TV 출연, 흑백요리사 |

### 3-4. 미평가 카드

```
┌──────────────────────────────┐
│ ┌───────────┐                │
│ │(gradient  │ 토속촌          │
│ │ placeholder│ 한식 · 광화문   │
│ │ 46%)      │                │
│ └───────────┘ [평가하기 →]    │
└──────────────────────────────┘
```

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `RecordCard` (satisfaction=null) |
| 사진 | `linear-gradient(135deg, var(--bg-elevated), var(--bg))` + `UtensilsCrossed` 아이콘 28px `--text-hint` |
| 사분면 | 없음 (점수 행 숨김) |
| 평가 CTA | "평가하기 →" (`ArrowRight` lucide 14px) — 13px font-semibold, `--text-hint` 색상 |

### 3-5. 지도 뷰 (식당 탭 전용)

콘텐츠 탭 바의 지도 버튼 탭 → 지도 뷰 전환. `MapView` 컴포넌트 (dynamic import, lazy-loaded).

```
┌──────────────────────────────┐
│     광화문                    │
│   [92]  [88]     성수         │
│           을지로   [85]       │
│         [85]                  │
│     ◉ 현재 위치               │
│                   강남        │
│                 [90]          │
├──────────────────────────────┤
│ 지도에 표시된 5곳              │
│ 1 스시코우지  일식·광화문·0.3km 92│
│ 2 도쿄등심    일식·강남·2.1km  90│
│ 3 미진       한식·광화문·0.5km 88│
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `MapView` (lazy-loaded via `dynamic()`) |
| 지도 SDK | 카카오맵 SDK (lazy-loaded) |
| 핀 마커 | 방울(teardrop) 형태 (border-radius 50% 50% 50% 0), `--accent-food` 배경, 45° 회전 |
| 핀 텍스트 | 점수 숫자, -45° 역회전 |
| 선택 동작 | 첫 클릭 → 빨간 하이라이트 + 식당명 표시, 두 번째 클릭 → 상세 페이지 이동 |
| 자동 센터링 | 레코드 bounds 기준 자동 센터링 |
| 폴백 UI | SDK 로드 실패 시 대체 UI 표시 |
| 하단 리스트 | 지도 아래 식당 목록 (ranked) |
| 데이터 | `GroupedTarget` → `MapRecord` 변환 (restaurantId, name, genre, area, lat, lng, score) |
| 페이지네이션 | 페이지당 10개 |

### 3-6. 식당 통계 패널

`StatsToggle` 버튼으로 토글 가능한 확장 패널. 캘린더/지도/팔로잉 모드에서는 숨김.

```
[가본 식당 지도] → [장르 차트] → [점수 분포] → [월별 소비] → [상황 차트]
```

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `StatsToggle` (`BarChart2` lucide 아이콘) + 차트 컴포넌트들 (lazy-loaded) |
| 표시 조건 | `canShowStats` — 식당 기록 5개 이상일 때만 토글 표시 |
| 토글 | `isStatsOpen` 상태로 on/off |
| 차트 간격 | gap-5 (20px) |

#### 3-6-1. 가본 식당 지도 (세계지도)

| 요소 | 스펙 |
|------|------|
| 배경 | `--bg-card` 배경, radius 14px, border 1px `--border` |
| 대륙 | SVG 실루엣, `--bg-page` fill |
| 도시 마커 | 원형, `--accent-food` 색상, 크기=방문 수 비례 (r=3~8) |
| 대형 마커 | 원 내부 흰색 숫자 (서울: 8곳) |
| 범례 | 3단계 크기 (1~2곳/3~5곳/6곳+) |
| 컴포넌트 | `WorldMapChart` (lazy-loaded) |
| props | `cities: CityStats[]`, `totalCountries`, `totalPlaces` |
| 라벨 | "N개국 N곳" |

#### 3-6-2. 장르 차트

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `GenreChart` (lazy-loaded) |
| props | `genres: GenreStats[]` (name, count) |
| 차트 | 수평 바 차트 |
| 바 색상 | `--accent-food`, opacity 비례 |
| 카운트 | `--accent-food` 색상, weight 800 |
| 표시 조건 | `genreStats.length > 0` |

#### 3-6-3. 점수 분포

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `ScoreDistribution` (lazy-loaded) |
| props | `buckets: ScoreBucket[]`, `accentColor: "var(--accent-food)"` |
| 차트 | 6등분 수직 바 (와인 탭과 동일 구조) |
| 구간 | ~49, 50s, 60s, 70s, 80s, 90s |
| 바 색상 | `--accent-food`, opacity 비례 |
| 0건 구간 | min-height 2px |
| 숫자 | 바 내부 흰색 (큰 바), 바 상단 외부 (짧은 바) |

#### 3-6-4. 월별 소비

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `MonthlyChart` (lazy-loaded) |
| props | `months: MonthlyStats[]`, `totalAmount`, `accentColor: "var(--accent-food)"`, `unit: "곳"` |
| 범위 | 최근 6개월 |
| 바 | `--accent-food` 색상, opacity 비례 높이 |
| 금액 | 각 월 하단 뱃지 (8px, `--bg-page` 배경) |
| 당월 | `--accent-food-light` 배경, `--accent-food` 색상, weight 600 |
| 총액 | 섹션 라벨 옆 `총 N만` |

#### 3-6-5. 상황 차트

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `SceneChart` (lazy-loaded) |
| props | `scenes: SceneStats[]` (scene, label, count, color) |
| 표시 조건 | `sceneStats.length > 0` |
| 내용 | 상황 태그별 기록 수 시각화 (혼밥/데이트/친구/가족/회식/술자리) |

---

## 4. 와인 탭

### 4-0. 와인 필터 속성 (12종)

| 속성 (key) | 타입 | 값 옵션 |
|------------|------|---------|
| 상태 (status) | select | 시음 / 찜 / 셀러 |
| 스타일 (wine_type) | select | Red / White / Rosé / Sparkling / Orange / Dessert / Fortified |
| 품종 (variety) | select | WSET L2+L3 전체 커버리지 55종 (White 33종 + Red 32종, body_order 순) |
| 산지 (country) | select | 15개국: France / Italy / Spain / Portugal / Germany / Austria / Hungary / Greece / USA / Chile / Argentina / Australia / NZ / South Africa / Canada |
| 빈티지 (vintage) | select | 2024 / 2023 / 2022 / 2021 / 2020 / 2019 / 2018 이전 |
| 점수 (satisfaction) | select | 90+ / 80~89 / 70~79 / ~69 |
| 시음시기 (visit_date) | select | 최근 1주 / 1개월 / 3개월 / 6개월 / 1년+ |
| 페어링 (pairing_categories) | select | 적색육 / 백색육 / 어패류 / 치즈 / 채소 / 디저트 |
| 가격 (purchase_price) | range | 범위 입력 |
| 산미 (acidity_level) | select | 낮음 / 중간 / 높음 |
| 당도 (sweetness_level) | select | 드라이 / 오프드라이 / 스위트 |
| 복합도 (complexity) | select | 단순 (0~33) / 중간 (34~66) / 복합 (67~100) |

> 조건 필터 칩 바의 `+` 버튼에서 `상태` 속성을 선택하면 시음/찜/셀러 필터를 적용할 수 있음

### 4-1. 와인 상태 필터

조건 필터 칩 바에서 `상태` 속성으로 필터링:

| 상태 값 | 설명 | 대응 와인 목록 분류 |
|---------|------|---------------------|
| tasted (시음) | 마신 와인 (시음 기록) | 마신 와인 |
| wishlist (찜) | 관심 와인 | 관심 와인 |
| cellar (셀러) | 보유 와인 (셀러/구매) | 보유 와인 |

### 4-1-1. 셀러 상태 카드

셀러(보유 와인) 카드는 상태 필터에서 `cellar` 선택 시 표시되며, 일반 와인 카드와 다른 고유 요소를 가진다.

```
┌──────────────────────────────┐
│ ┌───────────┐                │
│ │ 🍷        │ Opus One 2020  │
│ │           │ 레드·나파밸리    │
│ │           │          94    │
│ └───────────┘ 🏷셀러 구매 85만 │
│               · 2024.01       │
│               보관 중 · 마실   │
│               적기: 2025~2035 │
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 카드 | `WineCard` (일반 와인 카드와 동일 컨테이너, `isCellar = myRecord.listStatus === 'cellar'` 분기) |
| 소스 태그 | `SourceTag type="cellar"` — `셀러` 텍스트, `--accent-wine-light` 배경, `--accent-wine` 색상 |
| 가격 표시 | `purchasePrice`가 있으면 "N원" 포맷, 없으면 "보관 중" |
| 날짜 | `visitDate`가 있으면 " · 날짜" 추가 |
| 텍스트 스타일 | 11px, `--text-sub`, truncate |

> **⚠️ 부분 구현**: 셀러 카드의 "보관 상태/마실 적기/지금 마시기 좋아요" 등 상세 기능은 현재 미구현. `SourceTag` + `purchasePrice` + `visitDate` 표시만 구현됨.

### 4-2. 카메라 3모드

FAB → 와인 기록 선택 시 카메라 화면으로 진입. 3가지 촬영 모드 제공.

| 모드 | 아이콘 | 설명 | 결과 |
|------|--------|------|------|
| 개별 | 와인병 | 1병 라벨 촬영 | 해당 와인 상세 정보 |
| 진열장 | 4분할 그리드 | 여러 병 촬영 | 가격 포함 리스트 |
| 영수증 | 문서 | 영수증 촬영 | 구매 와인/가격 정리 → 보유 와인 등록 |

- `--accent-wine` 색상 아이콘
- 구분선으로 분리

### 4-3. 와인 카드 (WineCard)

```
┌──────────────────────────────┐
│ ┌───────────┐                │
│ │(어두운    │ Penfolds Grange │
│ │ 배경 46%) │ 레드·쉬라즈·호주 │
│ │ 🍷       │ [●사분면]  96   │
│ └───────────┘ 👤박 96 · 👤김 88│
│               🏷셀러 구매 85만 │
│               3/18            │
└──────────────────────────────┘
```

#### 와인 카드 구성

| 영역 | 요소 | 스펙 |
|------|------|------|
| 컨테이너 | `WineCard` | flex, rounded-2xl, border 1px `--border`, `--bg-card` 배경, min-height 170px |
| 좌측 | 사진 컬럼 | w-[46%], Next.js Image 또는 gradient placeholder + `Wine` lucide 아이콘 |
| 우측 | info 컬럼 | flex: 1, padding 14px, flex column |
| 우측 | 와인명 | 16px weight 700, 1줄 truncate |
| 우측 | 메타 | `타입 · 품종 · 산지` 조합, 12px `--text-sub` |
| 우측 | 사분면 미니 | `MiniQuadrant` 44×44 + dot, `--accent-wine` 색상 |
| 우측 | 총점 | 32px weight 800, `--accent-wine` 색상 |
| 우측 | 셀러 표시 | `isCellar` 일 때 `SourceTag` type='cellar' + 구매 가격 + visitDate (§4-1-1 참조) |
| 우측 | 버블 행 | `WineBubbleMember[]` — 아바타(이니셜, 18×18) + 점수, 최대 2명 (점수순) + `+N`. margin-top auto |
| 인터랙션 | active → `transform: scale(0.985)` |

- 와인 사분면: X축 산미(Acidity), Y축 바디(Body), dot=만족도 (RATING_ENGINE.md §와인 참조)
- 총점 색상: `var(--accent-wine)` (#8B7396)
- 와인 사진 배경: 실제 사진 또는 gradient placeholder + `Wine` 아이콘

### 4-4. 와인 통계 패널

`StatsToggle` 버튼으로 토글 가능한 확장 패널. 캘린더/지도/팔로잉 모드에서는 숨김.

```
[산지 지도] → [품종 차트 + 점수 분포] → [월별 소비 + 와인 타입]
```

| 속성 | 값 |
|------|-----|
| 표시 조건 | 와인 기록 5개 이상 (`canShowStats`) |
| 토글 | `StatsToggle` (`BarChart2` 아이콘) on/off |
| 프로그레시브 디스클로저 | `PdLockOverlay`로 섹션별 잠금 (§6 참조) |
| PD 그룹 1 (5개+) | 산지 지도 (`WineRegionMap`) |
| PD 그룹 2 (10개+) | 품종 차트 (`VarietalChart`) + 점수 분포 (`ScoreDistribution`) |
| PD 그룹 3 (20개+) | 월별 소비 (`MonthlyChart`) + 와인 타입 (`WineTypeChart`) |

### 4-4-1. 산지 지도 (드릴다운)

3단계 계층 구조: **세계 → 국가 → 산지**

#### Level 0: 세계지도

```
┌──────────────────────────────┐
│  ← 뒤로(숨김)  산지   탭하여 확대 │
│ ┌────────────────────────────┐│
│ │      🌍 세계지도            ││
│ │                            ││
│ │  🇺🇸(1)        🇫🇷(4)      ││
│ │                            ││
│ │          🇨🇱(3)    🇦🇺(2)  ││
│ │                     🇳🇿(2) ││
│ │                            ││
│ │  ● 레드  ● 화이트  ● 로제   ││
│ │  ● 스파클링                 ││
│ └────────────────────────────┘│
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 배경 | `#1a1520` (어두운 보라) |
| 대륙 | 실루엣 path, `#2a2030` 채움 |
| 하이라이트 국가 | `--accent-wine` 반투명 fill, 와인 수 마커 (원형, 크기 비례) |
| 미탐험 국가 | 점선 원 + 국기 이모지 (이탈리아, 스페인, 아르헨티나, 남아공) |
| 와인 점 | 마커 주변 작은 원 2.5r (색상별: 레드 `#722F37`, 화이트 `#D4C98A`, 로제 `#E8A0B0`, 스파클링 `#C8D8A0`) |
| 범례 | 하단 4종 (레드/화이트/로제/스파클링) |
| 인터랙션 | 국가 마커 탭 → Level 1 드릴다운 |
| 컴포넌트 | `WineRegionMap` (lazy-loaded) |
| props | `data: CountryStats[]` (name, lat, lng, visitCount, explored, dots) |
| PD | `PdLockOverlay minRecords={5}` |

#### Level 1: 국가 (예: 프랑스)

```
┌──────────────────────────────┐
│  [← 뒤로]  산지              │
│ ┌────────────────────────────┐│
│ │  🇫🇷 프랑스 — 4병          ││
│ │                            ││
│ │    Champagne (●●)          ││
│ │              Alsace        ││
│ │    Loire                   ││
│ │         Burgundy (●)       ││
│ │                 Rhône      ││
│ │  Bordeaux ──→              ││
│ │  (탭하여 확대)              ││
│ │         Languedoc          ││
│ │              Provence (●)  ││
│ │                            ││
│ │  ● 마신 와인  --- 미탐험    ││
│ │  █ 확대 가능               ││
│ └────────────────────────────┘│
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 타이틀 | `🇫🇷 프랑스 — N병` |
| 탐험 산지 | 색상 fill + 와인 dot (샹파뉴: 스파클링 2, 부르고뉴: 레드 1, 프로방스: 로제 1) |
| 미탐험 산지 | 점선 border (론, 루아르, 알자스, 랑그독) |
| 확대 가능 산지 | `--accent-wine` 강조 border + "탭하여 확대 →" (보르도) |
| 뒤로 버튼 | 좌상단, `[← 뒤로]` → Level 0 복귀, radius 8px, 1px `--border` 테두리 |

#### Level 2: 산지 (예: 보르도)

```
┌──────────────────────────────┐
│  [← 뒤로]  산지              │
│ ┌────────────────────────────┐│
│ │  Bordeaux 보르도            ││
│ │  아직 마신 와인이 없어요     ││
│ │                            ││
│ │     Médoc                  ││
│ │     (Pauillac·St-Julien    ││
│ │      Margaux·St-Estèphe)   ││
│ │                            ││
│ │        Entre-Deux-Mers     ││
│ │    Graves                  ││
│ │    (Pessac-Léognan)        ││
│ │      St-Émilion            ││
│ │      (Pomerol)             ││
│ │    Sauternes               ││
│ │                            ││
│ │  ┌─ 보르도 와인 기록하기 → ─┐││
│ │  └──────────────────────────┘│
│ │  지역을 탭하면 해당 산지     ││
│ │  와인을 볼 수 있어요         ││
│ └────────────────────────────┘│
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 타이틀 | `Bordeaux 보르도` |
| 서브타이틀 | "아직 마신 와인이 없어요" (와인 0병일 때) |
| 세부 산지 | 메독, 생테밀리옹, 그라브, 소테른, 앙트르두메르 |
| 지롱드 강 | 반투명 파란 선 |
| CTA | 점선 박스 `보르도 와인 기록하기 →` (탭 → 와인 검색/등록) |
| 힌트 | "지역을 탭하면 해당 산지 와인을 볼 수 있어요" |

### 4-4-2. 품종 차트

```
┌──────────────────────────────┐
│ 품종           [마신 품종만 ●] │
├──────────────────────────────┤
│ 소비뇽 블랑  ███████        2 │
│ 피노 누아    ██████████     3 │
│ 샤르도네     ████           1 │
│ 메를로       ████           1 │
│ 쉬라즈       ███████        2 │
│ 카베르네 S.  █████████████  4 │
└──────────────────────────────┘
```

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `VarietalChart` (lazy-loaded) |
| props | `varieties: VarietalStats[]` (20종 표준, body_order 순) |
| PD | `PdLockOverlay minRecords={10}` (점수 분포와 함께 그룹) |
| 정렬 기준 | 껍질 얇음 → 두꺼움 순 (화이트+레드 통합) |
| 바 색상 | `linear-gradient(90deg, rgba(139,115,150,0.5), var(--accent-wine))` |

#### 전체 품종 목록 (얇음→두꺼움, 20종 표준)

| 순서 | 품종 | 순서 | 품종 |
|------|------|------|------|
| 1 | 뮈스카 | 11 | 산지오베제 |
| 2 | 리슬링 | 12 | 비오니에 |
| 3 | 소비뇽 블랑 | 13 | 템프라니요 |
| 4 | 피노 그리 | 14 | 쉬라즈 |
| 5 | 피노 누아 | 15 | 네비올로 |
| 6 | 가메 | 16 | 말벡 |
| 7 | 바르베라 | 17 | 카베르네 소비뇽 |
| 8 | 샤르도네 | 18 | 무르베드르 |
| 9 | 그르나슈 | 19 | 타나 |
| 10 | 메를로 | 20 | 프티 베르도 |

### 4-4-3. 점수 분포

6등분 막대 차트, 병수 기준. `PdLockOverlay minRecords={10}` (품종 차트와 함께 그룹).

```
              ┌─┐
         ┌─┐  │5│ ┌─┐
         │ │  │ │ │6│
    ─ ─  │ │  │ │ │ │
   ~49 50s 60s 70s 80s 90s
```

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `ScoreDistribution` (lazy-loaded) |
| props | `buckets: ScoreBucket[]`, `accentColor: "var(--accent-wine)"` |
| 구간 | ~49, 50s, 60s, 70s, 80s, 90s |
| 높이 | 병수 비례 (max 기준 100%) |
| 0병 구간 | 최소 높이 2px |
| 1병 이상 | `--accent-wine` 색상 |
| 숫자 | 짧은 바: 상단 외부, 긴 바: 내부 흰색 |

### 4-4-4. 월별 소비

6개월 막대 차트, 병수 기준 + 금액 스티커.

```
                   ┌─┐
              ┌─┐  │ │
              │3│  │4│
   ┌─┐  ┌─┐  │ │  │ │
   1  2  1  │ │  1  │ │
  10월 11월 12월 1월 2월 3월
  8만 22만 12만 32만 14만 36만

              총 124만
```

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `MonthlyChart` (lazy-loaded) |
| props | `months: MonthlyStats[]`, `totalAmount`, `accentColor: "var(--accent-wine)"`, `unit: "병"` |
| PD | `PdLockOverlay minRecords={20}` (와인 타입과 함께 그룹) |
| 범위 | 최근 6개월 |
| 막대 | 병수 비례 높이, `--accent-wine` 색상, opacity 비례 |
| 금액 | 각 월 하단 작은 뱃지, 8px |
| 당월 | `--accent-wine-light` 배경, `--accent-wine` 색상, weight 600 |
| 총액 | 섹션 타이틀 옆 `총 N만` |

### 4-4-5. 와인 타입 차트

| 속성 | 값 |
|------|-----|
| 컴포넌트 | `WineTypeChart` (lazy-loaded) |
| props | `types: WineTypeStats[]` |
| PD | `PdLockOverlay minRecords={20}` (월별 소비와 함께 그룹) |
| 내용 | 와인 타입별(Red/White/Rosé/Sparkling/...) 기록 수 시각화 |

---

## 5. 와인 소셜 (버블 연동)

와인 카드에 버블 멤버 정보를 조용히 표시하는 구조.

### 5-1. 와인 카드 내 버블 행

```
👤박 👤김   박소연 96 · 김영수 88
```

| 요소 | 스펙 |
|------|------|
| 구현 | `WineCard` 내부 inline (Tailwind CSS, 별도 클래스 없음) |
| 아바타 | 18×18 이니셜 원형, `avatarColor` 배경, 흰 텍스트 8px bold |
| 텍스트 | 멤버 점수 (11px, `--text-sub`) |
| 최대 표시 | 2명 (점수 높은 순으로 정렬), 3명 이상이면 `+N` 표시 (11px bold, `--text-hint`) |
| 우선순위 | `satisfaction` 내림차순 정렬 |
| 위치 | 사분면+총점 아래, `margin-top: auto` |
| 표시 조건 | `bubbleMembers` prop이 있고 length > 0일 때만 |
| 데이터 타입 | `WineBubbleMember { nickname, avatarColor, satisfaction }` |

### 5-2. 동작 원칙

- 내가 와인 등록 시 → 버블 내 같은 와인 등록자가 있으면 나에게 1회 알림
- 상대방 → 자기 와인 목록에서 카운트 +1 (별도 알림 없음)
- 카드 내 버블 행 탭 → 버블 멤버들의 점수/시음기/가격 확인
- 익명 옵션 가능

---

## 6. 상태별 홈 화면 (프로그레시브 디스클로저)

기록 수에 따라 홈 콘텐츠가 점진적으로 풍부해짐. 잠금된 섹션은 lock overlay로 표시.

### 프로그레시브 디스클로저 잠금 UI

```
┌──────────────────────────────┐
│  (children 블러 처리)          │
│  ┌────────────────────────┐  │
│  │        🔒              │  │  ← 오버레이
│  │  기록 3개 더 남으면 열려요 │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

| 요소 | 스펙 |
|------|------|
| 컴포넌트 | `PdLockOverlay` |
| props | `minRecords: number`, `currentCount: number`, `children` |
| 잠금 시 | children을 `filter: blur(6px)`로 흐리게 표시 + 오버레이 위에 잠금 표시 |
| 오버레이 배경 | `rgba(248,246,243,0.85)`, `backdrop-filter: blur(6px)` |
| 아이콘 | `Lock` lucide 20px, `--text-hint` 색상 |
| 텍스트 | 12px weight 600, `--text-hint`, **"기록 {remaining}개 더 남으면 열려요"** (remaining = minRecords - currentCount) |
| 해제 조건 | `currentCount >= minRecords` 시 오버레이 완전 제거, children만 렌더링 |

### 상태별 콘텐츠 표

| 상태 | 식당 탭 | 와인 탭 |
|------|---------|---------|
| 기록 0개 (온보딩 직후) | 빈 상태 (`UtensilsCrossed` 아이콘) + "첫 식당을 기록해보세요" + "+버튼을 눌러 시작하세요" | 빈 상태 (`Wine` 아이콘) + "첫 와인을 기록해보세요" + "+버튼을 눌러 시작하세요" |
| 기록 1~4개 | 플레이스 카드 | 와인 카드 |
| 기록 5개+ | 통계 패널 `StatsToggle` 표시 (패널 전체 on/off) | 산지 지도 잠금 해제 (`minRecords={5}`) |
| 기록 10개+ | 전체 통계 활성 | 품종 차트 + 점수 분포 잠금 해제 (`minRecords={10}`) |
| 기록 20개+ | 전체 기능 활성 | 월별 소비 + 와인 타입 잠금 해제 (`minRecords={20}`) |

> 식당 통계 패널은 `canShowStats` (5개+) 조건으로 `StatsToggle` 자체가 표시/숨김되며, 섹션별 PD 잠금 없음. 와인 통계 패널만 `PdLockOverlay`로 섹션 그룹별 개별 잠금/해제.
