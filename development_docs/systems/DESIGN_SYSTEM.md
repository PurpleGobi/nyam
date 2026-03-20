# DESIGN_SYSTEM — 디자인 시스템

> affects: 모든 페이지

---

## 1. 컬러 토큰

### 식당 (Coral Orange)
```css
--restaurant-primary: #FF6038;
--restaurant-primary-light: #FFF5F2;
--restaurant-tag-bg: #FFEEE8;
```

### 와인 (Plum Purple)
```css
--wine-primary: #6B4C8A;
--wine-primary-light: #F8F5FA;
--wine-tag-bg: #EDE6F5;
--wine-accent: #8B5CF6;
```

> `--wine-accent` (#8B5CF6): 와인 만족도 게이지 그라데이션, 와인 관련 강조 텍스트에 사용

> `--primary`는 사용하지 않음. 항상 `--restaurant-primary` 또는 `--wine-primary`를 명시적으로 사용.

### 와인 타입 칩
| 타입 | 배경 | 텍스트 |
|------|------|--------|
| 레드 | `bg-red-50` | `text-red-700` |
| 화이트 | `bg-amber-50` | `text-amber-700` |
| 로제 | `bg-pink-50` | `text-pink-700` |
| 오렌지 | `bg-amber-100` | `text-amber-800` |
| 스파클링 | `bg-sky-50` | `text-sky-700` |
| 주정강화 | `bg-orange-50` | `text-orange-700` |
| 디저트 | `bg-yellow-50` | `text-yellow-700` |

### 만족도 색상 매핑
| 범위 | 색상 | Hex |
|------|------|-----|
| 1~30 | 레드 | `#ef4444` |
| 31~50 | 앰버 | `#f59e0b` |
| 51~70 | 옐로우 | `#fbbf24` |
| 71~85 | 그린 | `#22c55e` |
| 86~100 | 블루+글로우 | `#3b82f6` |

### 상황 태그 색상

**식당** (`scene` 값):
| 태그 | 값 | 색상 | 용도 |
|------|-----|------|------|
| 혼밥 | `solo` | `#3b82f6` | 사분면 점 테두리 |
| 데이트 | `romantic` | `#ec4899` | |
| 친구 | `friends` | `#22c55e` | |
| 가족 | `family` | `#f59e0b` | |
| 회식/접대 | `business` | `#8b5cf6` | |
| 술자리 | `drinks` | `#ef4444` | |

**와인** (`scene` 값):
| 태그 | 값 | 색상 | 용도 |
|------|-----|------|------|
| 혼술 | `solo` | `#3b82f6` | 사분면 점 테두리 |
| 데이트 | `romantic` | `#ec4899` | |
| 모임 | `gathering` | `#22c55e` | |
| 페어링 | `pairing` | `#f97316` (오렌지) | |
| 선물 | `gift` | `#a855f7` (라이트퍼플) | |
| 시음회 | `tasting` | `#06b6d4` (시안) | |

---

## 2. 타이포그래피

| 용도 | 크기 | Weight | 클래스 |
|------|------|--------|--------|
| Display | 2rem | bold | 점수 큰 숫자 |
| H1 | 1.953rem | bold | 페이지 제목 |
| H2 | 1.563rem | semibold | 섹션 제목, 식당명 |
| Body | 1rem | normal | 본문 |
| Small | 0.875rem | normal | 서브텍스트, 메타 |
| Caption | 0.75rem | normal | 날짜, 보조 정보 |

---

## 3. 만족도 ↔ 점 크기

| 만족도 | 점 지름(px) |
|--------|-----------|
| 1~20 | 12~16 |
| 21~40 | 17~22 |
| 41~60 | 23~30 |
| 61~80 | 31~40 |
| 81~100 | 41~54 |

---

## 4. 레벨 뱃지 색상

| 레벨 | 색상 |
|------|------|
| Lv.1 | — |
| Lv.2~3 | green |
| Lv.4~5 | blue |
| Lv.6~7 | purple |
| Lv.8~9 | orange |
| Lv.10 | gold |

---

## 5. 공통 컴포넌트 패턴

### 액션 바
```
[Primary CTA (flex-1)] [Ghost 아이콘] [Ghost 아이콘]
```
- 기록 남기기: Primary 버튼
- 찜: Heart 토글
- 공유: Share2 아이콘

### 빈 상태
- 아이콘 + 안내 문구 + CTA 버튼
- `bg-neutral-50 rounded-xl p-6 text-center`

### 카드
- `bg-background rounded-xl border shadow-sm`
- 패딩: `p-4`

### 접이식 (Collapsible)
- 헤더 탭 → 확장 (ChevronDown → ChevronUp)
- 애니메이션: 200ms ease-in-out

### 스크롤 시 헤더 전환
```
스크롤 < 히어로 높이: 투명 헤더 (아이콘만)
스크롤 ≥ 히어로 높이: 고정 헤더 (bg-background/95 backdrop-blur) + 제목
```

### 하단 고정 CTA
- 스크롤이 액션 바를 지나면 "기록 남기기" 버튼 하단 고정
- 하단 내비 위에 floating

### 온보딩 네비게이션 (공통)

모든 온보딩 Step에 일관 적용되는 하단 고정 네비게이션.

| 요소 | 스타일 |
|------|--------|
| **이전 (← 이전)** | 좌하단 고정 pill, `padding:14px 24px`, `border-radius:50px`, `background:#f3f4f6`, `border:1px solid var(--border)`, `font-size:15px`, `font-weight:600`, `color:var(--text)` |
| **다음 ([다음 →])** | 우하단 floating pill, `padding:14px 24px`, `border-radius:50px`, `font-size:15px`, `font-weight:700`, `box-shadow:0 4px 20px rgba(...)`, `color:white` |
| **다음 색상** | 식당 Step: `bg:--restaurant-primary` / 와인 Step: `bg:--wine-primary` |
| **스크롤 콘텐츠** | 양쪽 버튼 모두 `position:absolute; bottom:24px` (스크롤 따라다님) |
| **비스크롤** | 동일 위치 (하단 고정) |
| **첫 화면 (동네 선택)** | 이전 버튼 있음 (로그인으로 돌아감). 로그인에는 없음 |

### 온보딩 헤더

- 타이틀: `font-size:22px`, `font-weight:700`, 상단 고정
- 서브텍스트: `font-size:14px`, `color:text-sub`
- 필터 탭: 타이틀 아래 sticky (스크롤 시 상단에 고정)
- 콘텐츠: 필터 탭 아래에서 스크롤

```
[큰 타이틀 — 22px, weight 700, 2줄]     ← 스크롤 시 올라감
[서브텍스트 — 14px, color: text-sub]
────────────────────────────────────
[필터 탭 — sticky, 스크롤 시 상단 고정]  ← 밑줄 탭 스타일
────────────────────────────────────
[카드 리스트 — 스크롤 영역]
```

- 타이틀+서브텍스트는 **스크롤 시 올라가고** 필터 탭만 상단에 sticky로 남음
- step dots/진행 표시 없음 (불필요한 공간 차지)

### 필터 탭 (카테고리 전환)
- 스타일: 밑줄 탭 (pill 아님)
- 비활성: `font-weight:500`, `color:text-sub`, 밑줄 없음
- 활성: `font-weight:700`, `color:text` (식당 컨텍스트) 또는 `color:wine-primary` (와인 컨텍스트), 하단 2px 밑줄
- 전환 애니메이션: 밑줄 슬라이드 200ms ease
- 사용처: 온보딩 식당 동네 필터, 상세 페이지 탭, 버블 탭

```css
.ob-filter-tabs { display:flex; border-bottom:1.5px solid var(--border); }
.ob-filter-tab {
  padding:10px 16px; font-size:14px; font-weight:500; color:var(--text-hint);
  border:none; background:none; position:relative;
}
.ob-filter-tab.active { color:var(--primary); font-weight:700; }
.ob-filter-tab.active::after {
  /* 하단 밑줄 인디케이터 */
  content:''; position:absolute; bottom:-1.5px; left:8px; right:8px;
  height:2.5px; border-radius:2px; background:var(--primary);
}
.ob-filter-tab.wine-tab.active { color:var(--wine); }
.ob-filter-tab.wine-tab.active::after { background:var(--wine); }
```

| 적용 위치 | 탭 항목 | active 색상 |
|-----------|---------|-------------|
| 식당 온보딩 | 전체 / 사용자 선택 동네들 | `--primary` (coral) |
| 와인 온보딩 | 해당 없음 (사진 인식/검색 기반, 탭 필터 미사용) | `--wine` (purple) |
| 버블 상세 | 피드 / 식당 / 와인 / 통계 | `--primary` |
| 프로필 | 기록 / 위시리스트 | `--primary` |

---

## 6. 다크모드

- 모든 `bg-white` → `bg-background` 토큰 사용
- 모든 `text-black` → `text-foreground` 토큰 사용
- 디자인 토큰으로 자동 전환
