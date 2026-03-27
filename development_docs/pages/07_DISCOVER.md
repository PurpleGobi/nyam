# DISCOVER — 탐색 화면

> depends_on: DATA_MODEL, RECOMMENDATION, DESIGN_SYSTEM
> route: /discover (홈 내부 서브 스크린)
> prototype: `prototype/01_home.html` (screen-discover)

---

## 1. 화면 역할

- **홈과의 차이**: 홈은 **내 기록 + 개인 추천**, 탐색은 **새로운 곳 발견** (지역 기반 브라우징)
- 사용자가 아직 가보지 않은 식당을 지역 기준으로 탐색
- 홈 프로토타입의 서브 스크린으로 구현 (별도 페이지 아님)
- 진입: 홈에서 추천 카드 또는 별도 탐색 진입점 → `screen-discover` 슬라이드 전환 (00_IA.md 참조)

> RECOMMENDATION.md 참조: Discover는 추천이 아닌 **지역 기반 탐색**. 추천은 홈 식당 탭 `추천` 필터칩에서 노출.

---

## 2. 화면 구성

```
┌──────────────────────────────┐
│ 9:41                    📶🔋 │  상태바
├──────────────────────────────┤  discover-header (sticky)
│ 탐색 🔍                      │  타이틀
│ [🔍 식당, 동네, 장르 검색    ] │  검색바
│ [광화문] [을지로] [종로] →     │  지역 칩 (가로 스크롤)
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ [블루리본]    ← 뱃지 좌상단│ │  사진 영역 (h-140)
│ │    🍜 대표 사진            │ │
│ ├──────────────────────────┤ │
│ │ 미진                  88  │ │  식당명 + Nyam 점수
│ │ 한식 · 광화문 · 냉면 전문   │ │  메타
│ │ [N 4.4] [K 4.1] [G 4.3]  │ │  외부 평점 (pill)
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ [미슐랭 ★]    ← 뱃지 좌상단│ │
│ │    🍣 대표 사진            │ │
│ ├──────────────────────────┤ │
│ │ 스시코우지            92  │ │
│ │ 일식 · 광화문 · 오마카세   │ │
│ │ [N 4.6] [K 4.4] [G 4.5]  │ │
│ └──────────────────────────┘ │
│                              │
│ ...                          │  세로 스크롤 리스트
│                              │
├──────────────────────────────┤
│       [← 홈으로]             │  하단 고정 버튼
└──────────────────────────────┘
```

---

## 3. 헤더 (sticky)

```css
.discover-header {
  padding: 12px 16px 0;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border);
}
```

| 요소 | 스펙 |
|------|------|
| 타이틀 | `discover-title`, 20px weight 800, `var(--text)`, margin-bottom 10px |
| 검색바 | `search-bar`, flex, gap 8px |
| 검색바 배경 | `var(--bg-card)`, radius 12px, padding `10px 14px`, `1px solid var(--border)`, margin-bottom 10px |
| 검색 아이콘 | 돋보기 SVG 16×16, stroke `#9CA3AF`, stroke-width 2 |
| 검색 placeholder | "식당, 동네, 장르 검색", 14px `var(--text-hint)` |

> 앱 공통 헤더(nyam 로고, bubbles, 알림, 아바타)는 없음 — discover는 자체 헤더만 사용.

---

## 4. 지역 칩

```
[광화문] [을지로] [종로] [강남] [성수] [홍대] [이태원] [연남]
```

```css
.area-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none;          /* Firefox */
}
.area-chips::-webkit-scrollbar { display: none; }

.area-chip {
  padding: 7px 14px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.area-chip.active {
  background: var(--accent-food);
  border-color: var(--accent-food);
  color: #fff;
}
.area-chip:active { transform: scale(0.95); }
```

| 속성 | 값 |
|------|-----|
| 선택 방식 | 단일 선택 |
| 기본 선택 | 첫 번째 칩 (사용자 온보딩 동네 기반) |
| 탭 동작 | 즉시 목록 갱신 + 스크롤 위치 초기화 |

> "전체" 칩 없음 — 항상 특정 지역 선택 상태.

---

## 5. Discover 카드 (세로 리스트)

### 리스트 레이아웃

```css
.discover-list {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

### 카드 구조

```
┌──────────────────────────────┐
│ [뱃지]          ← 좌상단 오버레이│  사진 영역 (h-140, cover)
│                              │
├──────────────────────────────┤
│ 식당명                   점수 │  헤더 행 (space-between)
│ 장르 · 지역 · 특징            │  메타 정보
│ [N 4.4] [K 4.1] [G 4.3]     │  외부 평점 (pill 스타일)
└──────────────────────────────┘
```

### 카드 스타일

```css
.discover-card {
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s;
}
.discover-card:active { transform: scale(0.98); }
```

### 사진 영역

```css
.discover-card-photo {
  height: 140px;
  background: center/cover no-repeat;   /* 대표 사진 */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;                      /* 이모지 자리 표시 (실 서비스: 사진) */
  position: relative;
}
```

### 뱃지 (좌상단 오버레이)

```css
.discover-card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}
.discover-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 100px;
  backdrop-filter: blur(8px);
}
.db-michelin { background: rgba(239,68,68,0.9); color: #fff; }
.db-blue     { background: rgba(59,130,246,0.9); color: #fff; }
```

| 뱃지 | 표시 텍스트 | 클래스 |
|------|-----------|--------|
| 미슐랭 | 미슐랭 ★ / ★★ / ★★★ | `db-michelin` |
| 블루리본 | 블루리본 | `db-blue` |
| 없음 | 뱃지 영역 비노출 | — |

### 카드 바디

```css
.discover-card-body { padding: 12px 14px; }

.discover-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}
.discover-card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.discover-card-score {
  font-size: 16px;
  font-weight: 800;
  color: var(--accent-food);
}

.discover-card-meta {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 10px;
}
```

### 외부 평점 (pill 스타일)

```css
.external-scores {
  display: flex;
  gap: 8px;
}
.ext-score {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 6px;
}
```

| 약어 | 플랫폼 |
|------|--------|
| N | 네이버 |
| K | 카카오 |
| G | 구글 |

### 카드 탭 동작

카드 전체 → `/restaurants/[id]` (식당 상세 페이지, `02_detail_restaurant.html`)

---

## 6. 하단 네비게이션

```html
<div style="padding:8px 16px 20px; background:var(--bg); border-top:1px solid var(--border);">
  <button style="
    width:100%; padding:12px; border-radius:12px;
    border:1.5px solid var(--border);
    background:var(--bg-card);
    font-size:14px; font-weight:600; color:var(--text);
    display:flex; align-items:center; justify-content:center; gap:6px;
  ">← 홈으로</button>
</div>
```

| 요소 | 스펙 |
|------|------|
| 컨테이너 | padding `8px 16px 20px`, `var(--bg)`, `border-top: 1px solid var(--border)` |
| 버튼 | "← 홈으로", width 100%, padding 12px, radius 12px |
| 버튼 스타일 | `var(--bg-card)` 배경, `1.5px solid var(--border)`, 14px weight 600, `var(--text)` |
| 동작 | 탭 → `screen-home`으로 슬라이드 전환 |

---

## 7. 데이터 소스

### 목록 정렬 기준 (복합 점수)

```
score = (외부 평점 평균 정규화) * 0.4
      + (Nyam 사용자 평균 만족도 / 100) * 0.3
      + (Nyam 기록 수 로그) * 0.2
      + (권위 뱃지 보유 여부) * 0.1
```

- 선택된 지역의 식당을 복합 점수 기준 내림차순 정렬
- Nyam 기록이 없는 식당도 외부 평점 기준으로 노출
- 무한 스크롤 (20개씩 페이지네이션)

> RECOMMENDATION.md §2-5 권위 추천과 무관 — 권위 추천은 홈 `추천` 필터칩에서 노출.

---

## 8. API 구조

```
GET /api/discover/list
  ?area=광화문
  &sort=score
  &page=1
  &limit=20
  → 지역 기반 식당 목록 (복합 점수 정렬, 페이지네이션)
```

### 캐싱 전략

| 대상 | TTL | 무효화 조건 |
|------|-----|-----------|
| 지역별 목록 | 1시간 | 해당 지역 새 기록 등록 시 |

---

## 9. 빈 상태

```
┌──────────────────────────────┐
│                              │
│         🔍                   │
│   이 지역에 등록된             │
│   식당이 아직 없어요           │
│                              │
│   첫 번째로 등록해 보세요!      │
│                              │
│   [+ 식당 등록하기]            │  → FAB (+) 동일 플로우
│                              │
└──────────────────────────────┘
```

---

## 10. 인터랙션

### 스크롤 동작
- 헤더 (타이틀 + 검색바 + 지역 칩): sticky 상단 고정
- `scroll-content` (flex:1) 영역만 스크롤

### 지역 칩 변경
- 칩 탭 시 `.active` 클래스 전환 → 즉시 목록 갱신
- 스크롤 위치 초기화

### 화면 전환

| 전환 | 애니메이션 | 트리거 |
|------|----------|--------|
| 홈 → 탐색 | `screen-home` slide-out (좌), `screen-discover` slide-in (우→좌) | 탐색 진입점 탭 |
| 탐색 → 홈 | `screen-discover` slideOutRight, `screen-home` slideInLeft | "← 홈으로" 버튼 |
| 탐색 → 식당 상세 | 외부 페이지 이동 | 카드 탭 (`02_detail_restaurant.html`) |

### 전환 타이밍
- 앞으로: `0.35s cubic-bezier(0.4, 0, 0.2, 1)`
- 뒤로: `0.3s forwards`
- 전환 후 이전 화면 → `.hidden` 처리 (350ms 후)

---

## 11. 프로토타입 예시 데이터

| # | 식당명 | 장르 · 지역 · 특징 | 점수 | 뱃지 | N | K | G |
|---|--------|------------------|------|------|---|---|---|
| 1 | 미진 | 한식 · 광화문 · 냉면 전문 | 88 | 블루리본 | 4.4 | 4.1 | 4.3 |
| 2 | 스시코우지 | 일식 · 광화문 · 오마카세 | 92 | 미슐랭 ★ | 4.6 | 4.4 | 4.5 |
| 3 | 토속촌 | 한식 · 광화문 · 삼계탕 | 85 | — | 4.2 | 4.0 | 4.3 |
| 4 | 도쿄등심 | 일식 · 광화문 · 규카츠 코스 | 85 | 블루리본 | 4.2 | 3.9 | 4.1 |
| 5 | 광화문국밥 | 한식 · 광화문 · 설렁탕·국밥 | 91 | — | 4.5 | 4.2 | 4.4 |

---

## 12. Phase 구분

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| 지역 칩 필터 (식당) | O | O |
| 검색바 | placeholder만 | 실제 검색 연동 (01_SEARCH_REGISTER.md 공유) |
| 식당 카드 리스트 | O | O |
| 와인 탭 | X | 검토 |
| 취향 유사 추천 (CF) | X | 검토 (RECOMMENDATION.md Phase 2 참조) |

---

## 13. 구현 순서

```
1. domain/entities/discover.ts       → Discover 카드 타입, 필터 타입
2. domain/repositories/discover.ts   → 인터페이스 정의
3. infrastructure/repositories/      → Supabase 쿼리 구현 (복합 점수 정렬)
4. application/hooks/use-discover.ts → 지역 필터 상태 + 데이터 fetch + 무한 스크롤
5. presentation/components/discover/ → DiscoverCard, AreaChips, SearchBar UI
6. presentation/containers/          → DiscoverContainer
7. app/(main)/discover/page.tsx      → Container 렌더링 (또는 홈 서브 뷰)
```

### 타입 정의 (참고)

```typescript
interface DiscoverCard {
  id: string;                          // restaurants.id
  name: string;
  genre: string;
  area: string;
  specialty?: string;                  // 메타 세 번째 항목
  nyam_score: number | null;           // 0~100, null이면 미표시
  naver_rating: number | null;
  kakao_rating: number | null;
  google_rating: number | null;
  michelin_stars: number | null;       // 1~3 또는 null
  has_blue_ribbon: boolean;
  photo_url: string | null;
  composite_score: number;             // 정렬용 (§7 복합 점수)
}

interface DiscoverFilter {
  area: string;                        // 현재 선택된 지역
}
```
