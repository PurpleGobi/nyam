# DISCOVER — 탐색 화면

> depends_on: DATA_MODEL, RECOMMENDATION, DESIGN_SYSTEM, HOME
> route: /discover (홈 내부 서브 스크린)
> prototype: `prototype/01_home.html` (screen-discover)

---

## 1. 화면 역할

- **홈과의 차이**: 홈은 **내 기록 + 개인 추천**, 탐색은 **새로운 곳 발견** (지역 기반 브라우징)
- 사용자가 아직 가보지 않은 식당을 지역 기준으로 탐색
- 홈 프로토타입의 서브 스크린으로 구현 (별도 페이지 아님)
- 진입: 홈 하단 탭 "탐색" → `screen-discover` 슬라이드 전환

---

## 2. 화면 구성

```
┌──────────────────────────────┐
│ 9:41                    📶🔋 │  ← 상태바
├──────────────────────────────┤
│ 탐색 🔍                      │  ← 타이틀 (20px, 800)
│                              │
│ 🔍 식당, 동네, 장르 검색       │  ← 검색바 (placeholder)
│                              │
│ [광화문] [을지로] [종로] →     │  ← 지역 칩 (가로 스크롤)
├──────────────────────────────┤
│                              │
│ ┌──────────────────────────┐ │
│ │ [🍜 사진]                 │ │  Discover 카드
│ │  블루리본                  │ │  뱃지 (있을 때만)
│ ├──────────────────────────┤ │
│ │ 미진                  88  │ │  식당명 + Nyam 점수
│ │ 한식 · 광화문 · 냉면 전문   │ │  메타 정보
│ │ N 4.4  K 4.1  G 4.3      │ │  외부 평점 (N/K/G)
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ [🍣 사진]                 │ │
│ │  미슐랭 ★                 │ │
│ ├──────────────────────────┤ │
│ │ 스시코우지            92  │ │
│ │ 일식 · 광화문 · 오마카세   │ │
│ │ N 4.6  K 4.4  G 4.5      │ │
│ └──────────────────────────┘ │
│                              │
│ ...                          │  ← 세로 스크롤 리스트
│                              │
├──────────────────────────────┤
│ [← 홈으로]                   │  ← 하단 고정 버튼
└──────────────────────────────┘
```

---

## 3. 헤더 (sticky)

| 요소 | 스펙 |
|------|------|
| 컨테이너 | `discover-header`, sticky top, z-index 10, `border-bottom: 1px solid --border` |
| 패딩 | `12px 16px 0` |
| 배경 | `var(--bg)` |
| 타이틀 | `discover-title`, 20px weight 800, `var(--text)`, margin-bottom 10px |
| 검색바 | `search-bar`, `var(--bg-card)` 배경, radius 12px, padding `10px 14px`, `1px solid --border` |
| 검색 아이콘 | 돋보기 SVG 16×16, stroke `#9CA3AF` |
| 검색 placeholder | "식당, 동네, 장르 검색", 14px `var(--text-hint)` |

---

## 4. 지역 칩

```
[광화문] [을지로] [종로] [강남] [성수] [홍대] [이태원] [연남]
```

| 속성 | 스펙 |
|------|------|
| 컨테이너 | `area-chips`, flex, gap 8px, 가로 스크롤, scrollbar 숨김 |
| 칩 | `area-chip`, pill `rounded-full`, padding `7px 14px`, min-height 34px |
| 비활성 | `var(--bg)` 배경, `1.5px solid --border`, 13px weight 600 `var(--text-sub)` |
| 활성 | `var(--primary)` 배경, `var(--primary)` border, 흰색 텍스트 |
| 인터랙션 | 단일 선택, 탭 시 즉시 목록 갱신, active → `scale(0.95)` |
| 첫 번째 칩 | 사용자의 온보딩 동네 중 첫 번째 (기본 선택) |

> 홈 필터와 달리 "전체" 칩 없음 — 항상 특정 지역 선택 상태

---

## 5. Discover 카드 (세로 리스트)

### 카드 구조

```
┌──────────────────────────────┐
│ [사진 영역 h-180, rounded-t] │  대표 사진 (cover)
│  └ 뱃지 (좌하단, 있을 때)     │  블루리본 / 미슐랭
├──────────────────────────────┤
│ 식당명                 점수   │  이름 + Nyam 점수
│ 장르 · 지역 · 특징           │  메타 정보
│ N 4.4  K 4.1  G 4.3         │  외부 평점 (3플랫폼)
└──────────────────────────────┘
```

### 카드 스타일

| 요소 | 스펙 |
|------|------|
| 컨테이너 | `discover-card`, `var(--bg-card)` 배경, radius 16px, `1px solid --border`, overflow hidden |
| 리스트 | `discover-list`, padding `12px 16px`, flex column, gap 12px |
| 사진 영역 | `discover-card-photo`, height 180px, background cover center, 자리 표시: 이모지 (실제: 사진) |
| 뱃지 컨테이너 | `discover-card-badges`, 사진 좌하단 absolute, flex gap 4px |
| 뱃지 | `discover-badge`, pill 형태, 10px weight 700, 흰색 텍스트, blur(8px) 배경 |
| 뱃지 — 블루리본 | `db-blue`, 블루 계열 배경 |
| 뱃지 — 미슐랭 | `db-michelin`, 레드 계열 배경 |
| 바디 | `discover-card-body`, padding `12px 14px` |
| 헤더 행 | `discover-card-header`, flex space-between |
| 식당명 | `discover-card-name`, 16px weight 700 `var(--text)` |
| 점수 | `discover-card-score`, 16px weight 800, `var(--primary)` |
| 메타 | `discover-card-meta`, 13px `var(--text-sub)`, margin-top 2px |
| 외부 평점 | `external-scores`, `ext-score` 개별 표시, 12px `var(--text-hint)` |
| 탭 동작 | 카드 전체 → `/restaurants/[id]` (식당 상세), active → `scale(0.98)` |

### 뱃지 표시 규칙

| 뱃지 | 표시 |
|------|------|
| 미슐랭 1~3 | 미슐랭 ★ / ★★ / ★★★ |
| 블루리본 | 블루리본 |
| 없음 | 뱃지 영역 비노출 |

### 외부 평점 표시

| 약어 | 플랫폼 |
|------|--------|
| N | 네이버 |
| K | 카카오 |
| G | 구글 |

---

## 6. 하단 네비게이션

| 요소 | 스펙 |
|------|------|
| 컨테이너 | padding `8px 16px 20px`, `var(--bg)` 배경, `border-top: 1px solid --border` |
| 버튼 | "← 홈으로", width 100%, padding 12px, radius 12px, `1.5px solid --border` |
| 버튼 스타일 | `var(--bg-card)` 배경, 14px weight 600, `var(--text)`, flex center gap 6px |
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
- 지역별 목록: 1시간 TTL
- 지역 변경 시 해당 지역 캐시 무효화

---

## 9. 빈 상태

### 9-1. 검색 결과 없음

```
┌──────────────────────────────┐
│                              │
│         🔍                   │
│   이 지역에 등록된             │
│   식당이 아직 없어요           │
│                              │
│   첫 번째로 등록해 보세요!      │
│                              │
│   [+ 식당 등록하기]            │
│                              │
└──────────────────────────────┘
```

---

## 10. 인터랙션

### 스크롤 동작
- 헤더 (타이틀 + 검색바 + 지역 칩): sticky 상단 고정
- 카드 리스트만 스크롤

### 지역 칩 변경
- 칩 탭 시 즉시 목록 갱신
- 목록 갱신 중 이전 데이터 유지 + 스켈레톤 오버레이
- 스크롤 위치 초기화

### 화면 전환
- 홈 → 탐색: 좌→우 슬라이드 (`screen-home` → `screen-discover`)
- 탐색 → 홈: "← 홈으로" 버튼, 우→좌 슬라이드
- 카드 탭 → `02_detail_restaurant.html` (식당 상세 페이지)

---

## 11. Phase 구분

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| 지역 칩 필터 | O | O |
| 검색바 | O (placeholder) | 실제 검색 연동 |
| 식당 카드 리스트 | O | O |
| 와인 탭 | X | 검토 |
| 취향 유사 추천 | X | CF 기반 추가 가능 |

---

## 12. 구현 순서

```
1. domain/entities/discover.ts       → Discover 카드 타입, 필터 타입
2. domain/repositories/discover.ts   → 인터페이스 정의
3. infrastructure/repositories/      → Supabase 쿼리 구현
4. application/hooks/use-discover.ts → 지역 필터 상태 + 데이터 fetch
5. presentation/components/discover/ → 카드, 칩, 검색바 UI
6. presentation/containers/          → DiscoverContainer
7. app/(main)/discover/page.tsx      → Container 렌더링 (또는 홈 서브 뷰)
```
