# PROFILE — 프로필

> depends_on: DATA_MODEL, XP_SYSTEM, DESIGN_SYSTEM, BUBBLE
> route: /profile, /profile/wrapped
> prototype: `prototype/03_profile.html` (screen-profile, screen-wrapped)

---

## 1. 프로필 화면 — 전체 구조

프로필 = **미식 정체성 + 경험치/레벨 + 세부 통계**. 3개 영역으로 구성된 싱글 스크롤 페이지.

```
┌──────────────────────────────────────┐
│ [nyam 로고]   [bubbles] [🔔] [아바타] │  메인 헤더 (공통)
├──────────────────────────────────────┤
│ [아바타+Lv.7]   │ ┌─ 미식 정체성 카드 ─┐ │  ← §2. 2컬럼 헤더
│ 김맛잘알         │ │ "을지로 골목을…"    │ │
│ @matjal_kim      │ │ [태그] [태그]       │ │
│                  │ │ ✨ 127개 기반 [공유] │ │
│                  │ └──────────────────┘ │
├──────────────────────────────────────┤
│ ── 활동 요약 ──                       │  ← §3
│ ┌─ 총 레벨 카드 ─────────────────┐   │
│ │ 🏆 총 레벨 Lv.7               │   │
│ │ 1,780 XP · 다음 레벨까지 120   │   │
│ │ [======= 진행바 74% ====    ]  │   │
│ └────────────────────────────────┘   │
│ [식당방문 19곳] [와인시음 12병]       │  ← 2x2 그리드
│ [평균만족도 88점] [이번달 XP +85]     │
│                                       │
│ ── 활동 기록 ──                       │  ← 히트맵
│ [총 기록 31] [연속 34일] [4개월]      │
│ [■■□■■■□■■□□□■ ...]  히트맵          │
│                                       │
│ ── 최근 XP ──                          │  ← 최근 XP 5개
│ ✨ 풀 기록        3일 전       +21    │
│ ❤️ 버블 공유       5일 전       +15    │
│ 🏆 마일스톤       1주 전       +25    │
│ 🎁 첫 기록 보너스  2주 전       +30    │
├──────────────────────────────────────┤
│ ─── [식당] [와인] ─── ← sticky 탭    │  ← §4~§10 세부 통계
│                                       │
│ (식당 탭 or 와인 탭 콘텐츠)           │
│ 요약 카드 → 경험치&레벨 → 지도 →     │
│ 장르/품종 → 점수 분포 → 월별 소비 →  │
│ 상황별/타입별                         │
└──────────────────────────────────────┘
```

---

## 2. 프로필 헤더 (2컬럼)

2컬럼 레이아웃: 좌측에 아바타+이름, 우측에 미식 정체성 카드.

### 좌측 컬럼

| 요소 | 설명 |
|------|------|
| 아바타 | 64px 원형, `avatarColor` 배경 (기본값: accent-food), 이미지 있으면 표시 / 없으면 닉네임 첫 글자 이니셜 (24px 800 흰색) |
| 레벨 뱃지 | 아바타 우하단 absolute 위치, `Lv.N` 표시 (레벨 색상 배경, 흰색 텍스트, 10px bold) |
| 닉네임 | 15px bold, 중앙 정렬 |
| 핸들 | `@handle_name`, 11px hint 색상 (핸들 없으면 비표시) |

### 우측 컬럼 — 미식 정체성 카드 (ProfileHeader 인라인)

- `ProfileHeader` 내부에 인라인으로 포함 (별도 컴포넌트 아님)
- 배경: `linear-gradient(135deg, #FEFCFA, #F5EDE8)`, rounded-xl, px-3.5 py-3
- `tasteSummary` 텍스트: 최대 3줄 clamp (`line-clamp-3`), 13px, **키워드 하이라이트 없음** (plain text)
- 기록이 없으면 "기록을 쌓으면 미식 정체성이 생성됩니다" (13px hint)
- 태그 목록: pill 형태, `rgba(193,123,94,0.1)` 배경, accent-food 글씨, 10px 600
- 하단: 기록 개수 표시 (`✨ N개 기록 기반`, 10px hint) + **공유 버튼** 텍스트 ("공유", accent-food, 10px 600) → `/profile/wrapped`로 이동

### 하단 — 바이오

- 프로필에 bio가 설정되어 있으면 헤더 아래에 표시 (14px, text-sub 색상, line-height 1.5)

### 별도 컴포넌트: TasteIdentityCard

- 독립된 `TasteIdentityCard` 컴포넌트도 존재 (프로필 외 다른 곳에서 재사용)
- 강조 키워드: `tasteTags` 배열 내 키워드를 accent-food 색상 bold로 하이라이트
- 텍스트 이탤릭 스타일, 14px
- 기록 수: Sparkles 아이콘 + "N개 기록 기반" (11px)
- 공유 버튼: Share2 아이콘 + "공유" (12px, accent-food)

---

## 3. 활동 요약 섹션

프로필 헤더 아래, 세부 통계 탭 위에 위치하는 통합 활동 개요.

### 3-1. 총 레벨 카드

```
┌─ 그라디언트 배경 (bg-card → accent-food-light) ─┐
│ [🏆 40px원형]  Lv.7 타이틀명                    │
│                1,780 XP · 다음 레벨까지 120 XP   │
│ [══════════════ 진행바 74% ═══════      ]       │
└──────────────────────────────────────────────────┘
```

- 컨테이너: mx-4, rounded-2xl, border
- 배경: `linear-gradient(135deg, var(--bg-card), var(--accent-food-light))`
- 아이콘: Award (lucide), 40px 원형, **레벨 색상** 배경, 흰색 아이콘
- 레벨명: `Lv.{level} {title}` (18px 800)
- 서브: `{totalXp} XP · 다음 레벨까지 {remaining} XP` (12px hint)
- 진행 바: 6px, 레벨 색상 (`levelColor`)

### 3-2. 개요 그리드 (2×2)

`OverviewGrid` 컴포넌트. `mx-4 grid grid-cols-2 gap-3`.

| 카드 | 라벨 | 값 형식 | 아이콘 | 색상 | 트렌드 |
|------|------|---------|--------|------|--------|
| 식당 방문 | "식당 방문" | `N곳` | Utensils | accent-food | `+N 이번 달` (restaurantThisMonth) |
| 와인 시음 | "와인 시음" | `N병` | Wine | accent-wine | `+N 이번 달` (wineThisMonth) |
| 평균 만족도 | "평균 만족도" | `N점` / `-` | Star | `#C9A96E` | — |
| 이번 달 XP | "이번 달 XP" | `+N` | TrendingUp | `#E8637A` | — |

- 각 카드: `card` 클래스, rounded-2xl, 좌측 아이콘 + 우측 텍스트 레이아웃
- 아이콘: 36px (h-9 w-9) rounded-xl, `${color}15` 배경 (hex alpha 약 8%)
- 값: 16px 800, 라벨: 11px hint
- 트렌드: `+N 이번 달` (positive 색상, 10px), 값 > 0일 때만 표시

### 3-3. 활동 기록 (히트맵)

GitHub 스타일 활동 히트맵. 컴포넌트: `ActivityHeatmap`. card 스타일 컨테이너, mx-4.

| 요소 | 설명 |
|------|------|
| 제목 | "활동 기록" (14px bold) |
| 상단 통계 3개 | 총 기록 (20px 800) · Flame 아이콘 + 연속일 (20px 800, caution 색상) · N개월 (20px 800) |
| 요일 라벨 | 좌측 16px 너비: 월/수/금 표시 (9px hint) |
| 히트맵 그리드 | CSS grid 13열 × 7행, gap 3px, 셀 aspect-ratio: 1, border-radius 3px |
| 셀 강도 | intensity 0: bg-elevated, 1~4: accent-social 25%/50%/75%/100% (`color-mix`) |
| 하단 월 라벨 | 최근 3개월 위치에 표시 (9px hint, 열 위치 계산) |
| 범례 | 우하단 정렬: "Less" [□□□□□] "More" (10px 정사각, 5단계) |

### 3-4. 최근 XP

- 최근 XP 획득 내역 최대 5개 (DB: `xp_histories`, `limit(5)`)
- card 스타일 컨테이너, mx-4, 제목 "최근 XP" (14px bold)
- 각 항목 구성: `[아이콘 32px] 사유 라벨 · 상대 시간 | +XP`
  - 아이콘: 32px 정사각 rounded-lg, 15% 투명도 배경
  - 사유 라벨: `XpReason` 기반 한국어 변환 (13px)
  - 시간: `formatTimeAgo()` (11px, hint 색상)
  - XP: accent-food, 13px bold

| XpReason 그룹 | Lucide 아이콘 | 배경/색상 | 포함 사유 |
|---------------|--------------|-----------|-----------|
| 기록 | Sparkles | accent-food 15% / accent-food | `record_full`, `record_photo`, `record_score` |
| 소셜 | Heart | accent-social 15% / accent-social | `social_share`, `social_like`, `social_follow`, `social_mutual` |
| 마일스톤 | Trophy | #C9A96E 15% / #C9A96E | `milestone` |
| 보너스 | Gift | positive 15% / positive | `bonus_onboard`, `bonus_first_record`, `bonus_first_bubble`, `bonus_first_share` |
| 기타 | CircleDot | bg-elevated / text-sub | `record_name`, `detail_axis`, `category`, `revisit` |

---

## 4. 세부 통계 — 식당/와인 탭

프로필 하단에 **sticky 탭**으로 식당/와인 통계 전환.

- `StickyTabs` 공통 UI 컴포넌트 사용 (`components/ui/sticky-tabs`)
- 탭 정의: `{ key: 'restaurant', label: '식당', variant: 'food' }`, `{ key: 'wine', label: '와인', variant: 'wine' }`
- `StatTabContainer`가 탭 상태 관리 + `useRestaurantStats`/`useWineStats` SWR 호출
- 빈 상태: "N 기록이 없습니다 / 첫 기록을 남겨보세요" (empty-state card)

---

## 5. 식당 통계 패널

### 5-1. 요약 카드 (3열)

`StatSummaryCards` 컴포넌트. `grid grid-cols-3 gap-2`. 각 카드: `card` rounded-xl, 중앙 정렬.

| 카드 | 라벨 | 값 | 색상 | 트렌드 |
|------|------|-----|------|--------|
| 총 방문 | "총 방문" | 카운트 (18px 800) | accent-food | `+N 이번 달` (positive, 10px) |
| 평균 점수 | "평균 점수" | 소수점 1자리 | accent-food | `+N` or `-N` or `-` |
| 방문 지역 | "방문 지역" | 카운트 | accent-food | `+N 신규` |

- 라벨: 11px hint, 값 아래 / 트렌드: 값 아래, positive 색상

### 5-2. 경험치 & 레벨 (식당)

- 섹션 타이틀: "경험치 & 레벨" (15px bold)
- **미니탭** (rounded-full pill 버튼)으로 세부 축 전환:
  - **지역 탭**: 을지로, 광화문, 강남, 성수… (active: accent-food 배경 흰색 텍스트)
  - **장르 탭**: 일식, 한식, 이탈리안, 프렌치…
- DB: `user_experiences` — `axis_type='area'`/`'genre'`, 각 축별 XP/레벨
- 미니탭 + 레벨 리스트는 `ProfileContainer`에서 `levelSlot` prop으로 `StatTabContainer`에 전달

#### 레벨 리스트 아이템 구성

```
[Lv뱃지] 축 이름              N,NNN XP
         [═══ 진행바 ══                ]
```

- Lv 뱃지: 26px 정사각 rounded, 레벨 색상 배경, 레벨 숫자 흰색 (10px 700)
- 축 이름: 13px 600, truncate
- XP 수치: 우측 정렬, 11px hint 색상 (e.g., `1,780 XP`)
- 진행바: 4px (`h-1`), 해당 레벨 색상
- 리스트 영역: `max-height: 340px`, 초과 시 내부 스크롤 (`overflowY: auto`)
- hover: `bg-elevated` 배경
- **탭 시**: `onItemPress(exp)` → 레벨 상세 바텀시트 오픈 (§8 참조)
- 빈 상태: "아직 식당/와인 경험이 없어요" (13px hint, py-10)
- 정렬: totalXp 내림차순

#### 레벨 색상 체계

| 레벨 | 색상 | CSS 값 |
|------|------|--------|
| 1~3 | green | `#7EAE8B` |
| 4~5 | blue | `#7A9BAE` |
| 6~7 | purple | `#8B7396` |
| 8~9 | primary (orange) | `#C17B5E` |
| 10 | gold | `#C9A96E` |

### 5-3. 가본 식당 지도

간이 SVG 세계 지도에 방문 식당을 도트로 표시. 컴포넌트: `RestaurantMap`.

| 요소 | 설명 |
|------|------|
| 지도 컨테이너 | 다크 배경 (`#1a1520`), rounded-xl, aspect-ratio 2:1, border |
| 대륙 윤곽 | SVG ellipse로 6대륙 간이 표현 (border 색상, opacity 0.15) |
| 도시 마커 | 원형, accent-food 색상, 방문 수에 비례 (1~2: r=5, 3~5: r=7, 6+: r=10) |
| 큰 마커 (6곳+) | 내부에 숫자 표시 (흰색, 8px bold) |
| opacity | 1~2곳: 0.4, 3~5곳: 0.7, 6곳+: 1.0 |
| 범례 | 지도 하단 — `● 1~2곳` `● 3~5곳` `● 6곳+` (accent-food, opacity 차등) |
| 빈 상태 | "아직 방문 기록이 없어요" (empty-state card) |
| 좌표 변환 | `x = (lng + 180) / 360 * 360`, `y = (90 - lat) / 180 * 180` |
| 데이터 소스 | `ProfileRepository.getRestaurantMapMarkers()` — country, city, lat, lng, count |

### 5-4. 장르 수평 바 차트

`HorizontalBarChart` 컴포넌트 (accent-food 색상).

- value 기준 내림차순 정렬, **최대 8개** (`maxItems=8`)
- 각 행: `순위번호(11px) | 라벨(w-16, 12px) | [══ 바(h-5) ══] | 숫자(w-6, 11px)`
- 바 너비: `value / maxValue * 100%`
- opacity 차등: `max(0.3, 1 - index * 0.1)` (1위=1.0, 2위=0.9, ...)
- 빈 상태: "데이터가 없습니다" (12px, 중앙)

### 5-5. 점수 분포

`VerticalBarChart` 컴포넌트 (accent-food 색상). `ScoreDistribution[]` → `{ label: range, value: count }` 변환 (highlight 미사용).

- 6구간: ~49, 50s, 60s, 70s, 80s, 90s
- 바 최대 높이: 120px, 최소 4px
- 바 **상단**에 카운트 숫자 (11px, hint 색상 — 바 밖에 표시)
- 모든 바: 너비 24px, opacity 0.6 (highlight 없음)
- 바 하단: 구간 라벨 (11px hint)

### 5-6. 월별 소비

- `VerticalBarChart` 사용, 최근 6개월, accent-food 색상
- 바 높이 = **금액(amount)** 기준
- `valueLabel="만"` → 바 상단에 "N만" 표시, `totalLabel="총 N만"` → 우상단 서브텍스트
- 최고 금액 월: `highlight=true` 자동 감지 (너비 32px, opacity 1.0)
- 데이터 소스: `profileRepo.getRestaurantMonthlySpending(id, 6)` → `MonthlySpending[]`

### 5-7. 상황별 방문

- `HorizontalBarChart` 사용 (accent-food 색상 base — 현재 구현에서는 `colorBase` 단일 색상 사용, `item.color`는 전달되지만 미적용)
- 데이터: `SceneVisit[]` — `scene`, `label`, `count`, `color` 필드 (서버에서 라벨+색상 제공)
- 각 상황별 DB 값 → 한국어 라벨 + 고유 색상 (데이터에 포함):

| DB `scene` 값 | 라벨 | 색상 |
|---------------|------|------|
| `solo` | 혼밥 | `#7A9BAE` |
| `romantic` | 데이트 | `#B8879B` |
| `friends` | 친구 | `#7EAE8B` |
| `family` | 가족 | `#C9A96E` |
| `business` | 회식 | `#8B7396` |
| `drinks` | 술자리 | `#B87272` |

---

## 6. 와인 통계 패널

### 6-1. 요약 카드 (3열)

| 카드 | 값 | 색상 |
|------|-----|------|
| 총 시음 | 카운트 | accent-wine |
| 평균 점수 | 소수점 1자리 | accent-wine |
| 셀러 보유 | 카운트 | accent-wine |

> **참고**: 현재 와인 요약 카드에는 trend가 전달되지 않음 (식당은 trend 있음)

### 6-2. 경험치 & 레벨 (와인)

- 섹션 타이틀: "경험치 & 레벨"
- **미니탭**으로 세부 축 전환:
  - **산지 탭**: 보르도, 부르고뉴, 나파 밸리, 론 밸리…
  - **품종 탭**: 카베르네 소비뇽, 피노 누아, 샤르도네…
- DB: `user_experiences` — `axis_type='wine_region'`/`'wine_variety'`, 각 축별 XP/레벨
- 미니탭 active 색상: accent-wine 배경 흰색 텍스트 (`accentColor="var(--accent-wine)"` prop)
- 리스트 아이템 구성: 식당과 동일 `LevelList` 컴포넌트 사용 (category='wine' 전달)

### 6-3. 산지 지도 — 간이 국가별 리스트

> ⚠️ **현재 구현**: `WineRegionMapSimple` — 국가별 바 리스트 + 타입 도트.
> S10에서 3단계 드릴다운 SVG 지도로 고도화 예정.

```
┌─────────────────────────────────────────┐
│ 🌐 N개 국가                              │
│ ┌────────────────────────────────────┐  │
│ │ 프랑스   [████████     ] ●●● 12   │  │
│ │ 이탈리아 [██████       ] ●●   8   │  │
│ │ 칠레     [███          ] ●    4   │  │
│ │ 호주     [██           ] ●    3   │  │
│ └────────────────────────────────────┘  │
│        ● 레드  ● 화이트  ● 로제  ● 스파클링 │
└─────────────────────────────────────────┘
```

| 요소 | 설명 |
|------|------|
| 헤더 | Globe 아이콘 (accent-wine) + "N개 국가" (12px, text-sub) |
| 국가 행 | 국가명 (13px, 600, w-16 truncate) + 수평 바 (accent-wine, opacity 비례) + 타입 도트 + 수량 (12px bold, accent-wine) |
| 바 너비 | `max(8%, totalWines/maxCount * 100%)`, opacity: `0.3 + ratio * 0.7` |
| 타입 도트 | 8px (h-2 w-2) 원형, count > 0인 타입만 표시: 레드(`#722F37`), 화이트(`#D4C98A`), 로제(`#E8A0B0`), 스파클링(`#C8D8A0`) |
| 범례 | 하단 중앙 — 타입별 한국어 라벨 + 색상 도트 (10px, hint 색상) |
| 빈 상태 | Globe 아이콘 + "아직 와인 기록이 없어요" (empty-state card) |
| 정렬 | totalWines 내림차순 |
| 데이터 | `WineRegionMapData[]` — country, countryCode, totalWines, typeBreakdown, regions |

### 6-4. 품종 수평 바 차트

- `HorizontalBarChart` 컴포넌트 사용 (accent-wine 색상)
- **토글 스위치** (`VarietyToggle`): 우측 상단 정렬
  - `showAll` 상태로 전체/마신 품종만 전환
  - `StatTabContainer`에서 `showAllVarieties` 상태 관리

### 6-5. 점수 분포

- 식당과 동일 `VerticalBarChart` 패턴, accent-wine 색상 적용
- 6구간: ~49, 50s, 60s, 70s, 80s, 90s

### 6-6. 월별 소비

- **식당 차트와 다른 패턴**: 바 높이 = **병 수** 기준 (식당은 금액 기준)
- `VerticalBarChart` 사용, `valueLabel="병"`, `totalLabel="총 N병"`
- 데이터: `MonthlySpending`의 `count` 필드 사용 (없으면 `amount` 폴백)
- 최고 수량 월: highlight 처리
- accent-wine 색상

### 6-7. 타입별 분포

- `HorizontalBarChart` (accent-wine 색상 base)
- 데이터: `WineTypeDistribution[]` — `type`, `label`, `count`, `color`
- `item.color`는 데이터에 포함되지만 현재 `HorizontalBarChart`는 `colorBase` 단일 색상으로 렌더링

---

## 7. Wrapped 공유 화면

Spotify Wrapped 스타일의 출판 가능한 카드. 게이지 두 개로 노출 정보를 실시간 조절.

- 라우트: `/profile/wrapped`
- 상단: `AppHeader` (공통 헤더) + `FabBack` (뒤로가기 FAB)

```
┌──────────────────────────────────────┐
│ [AppHeader]                           │
│ [FabBack ←]                           │
│                                       │
│ [전체] [식당] [와인]   ← 카테고리 필터 │
│                                       │
│ 🛡 개인정보  [최소] [보통] [공개]      │
│                                       │
│ 📊 디테일    [심플] [보통] [상세]      │
│                                       │
│ ┌─── 미리보기 카드 ──────────────┐    │
│ │  (카테고리별 다른 카드)        │    │
│ └───────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 카테고리별 카드 디자인

| 카테고리 | 그라디언트 (135deg, 0% → 50% → 100%) | 데이터 범위 |
|----------|--------------------------------------|------------|
| **전체** (`all`) | `#3D3833 → #5A4E44 → #C17B5E` | 식당+와인 통합 |
| **식당** (`restaurant`) | `#3D3833 → #5A4E44 → #FF6038` | 식당 전용 태그/레벨/최애 |
| **와인** (`wine`) | `#2A2438 → #4A3D5E → #8B7396` | 와인 전용 태그/레벨/최애 |

### 카드 구성 요소

`WrappedCard` 컴포넌트. 카테고리별 그라디언트 배경 위에 조건부 섹션 렌더링.

1. **헤더**: 제목 텍스트 — `gaugePrivacy ≥ 1` ? "나의 기록 요약" : "미식 탐험가의 기록" (16px, 800, 흰색)
2. **레벨**: Award 아이콘 (rgba 흰색 15% 배경, 40px) + `Lv.N 타이틀` + axisLabel
3. **숫자 통계**: `data.stats[]` 배열의 label + value 쌍 (70% 흰색 라벨, 흰색 bold 값)
4. **태그**: pill 형태 (12px, rgba 흰색 15% 배경, 흰색)
5. **Top Picks**: "Top Picks" 제목 + 순위 뱃지(rgba 흰색 20% 원형) + 이름 + 메타 + 점수
6. **활동 버블**: "활동 버블" 제목 + 버블 칩 리스트 (rgba 흰색 10% pill)

### 게이지별 요소 노출 로직

| 요소 | 개인정보 (`gaugePrivacy`) 조건 | 디테일 (`gaugeDetail`) 조건 | 추가 조건 |
|------|-------------------------------|---------------------------|-----------|
| 헤더 제목 | ≥ 1: "나의 기록 요약" / 0: "미식 탐험가의 기록" | — | — |
| 숫자 통계 | ≥ 1 | — | — |
| 태그 | 항상 | — | — |
| 레벨 | — | ≥ 1 | `visibilityPublic.level === true` |
| Top Picks | — | = 2 (상세) | — |
| 버블 | = 2 (공개) | — | `visibilityPublic.bubbles === true` |

> **참고**: 문서 §7 원본의 "아바타/닉네임" 게이지 조건은 현재 구현에서 제거됨. 아바타/닉네임 대신 헤더 제목 텍스트가 변경되는 방식으로 단순화.

### 카테고리 필터

- pill 버튼 3개: 전체/식당/와인 (13px, rounded-full)
- active: accent-food 배경 흰색 / inactive: bg-card + border + text-sub
- 카테고리 변경 시 `useWrapped(category)` SWR 재요청

### 게이지 슬라이더 (`GaugeSlider`)

- Props: `icon?` (LucideIcon), `label`, `options` (3개 string[]), `value` (0|1|2), `onChange`
- 세그먼트 컨트롤 스타일: `rounded-lg` 컨테이너 (`bg-page`), 각 버튼 `rounded-md` (`flex-1`)
- active: accent-food 배경 흰색 텍스트 (600) / inactive: bg-page + text-sub (400)
- 아이콘: 14px hint 색상, 라벨 옆에 표시 (13px text-sub)
- 개인정보 게이지: `Shield` 아이콘, options: ['최소', '보통', '공개']
- 디테일 게이지: `SlidersHorizontal` 아이콘, options: ['심플', '보통', '상세']

### 저장/공유

- 저장: `html-to-image` 라이브러리 lazy import → `toPng(cardRef, { pixelRatio: 2 })` → 다운로드 (`Download` 아이콘)
- 공유: `toPng` → `navigator.share({ files })` / 미지원 시 다운로드 폴백 (`Share2` 아이콘)
- 빈 상태: "기록이 없습니다 / 첫 기록을 남겨보세요" (14px/12px, hint 색상)

---

## 8. 레벨 상세 바텀시트

경험치 & 레벨 리스트에서 항목 탭 시 표시되는 바텀시트. 컴포넌트: `LevelDetailSheet`.

```
┌─── 바텀시트 ──────────────────────────┐
│ [──── 드래그 핸들 ────]                │
│ 지역                            [✕]   │
│ 을지로                                 │
│                                        │
│ [Lv 뱃지 64px]  Lv.7 타이틀           │
│                 780 XP                 │
│                                        │
│ 다음 레벨까지         780 / 850 XP     │
│ [══════════ 진행바 82% ══════     ]    │
│                                        │
│ ┌─ [고유장소 42] | [총기록 58] | [재방문 16] ─┐ │
│ └──────────────────────────────────────┘ │
│                                        │
│ ── XP 구성 ──                          │
│ ✨ 새 장소 기록              +312      │
│ 🔄 재방문                    +142      │
│ 🏅 품질 보너스               +216      │
│ 🏆 마일스톤                   +95      │
│ ❤️ 소셜                       +15      │
│                                        │
│ ┌─ 🎯 50번째 고유 장소 ─────────────┐ │
│ │    [══ 진행바 84% ══]  42/50      │ │
│ │    +30 XP                         │ │
│ └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

| 구성 요소 | 설명 |
|-----------|------|
| 시트 핸들 | 36px 높이, 중앙 정렬 `bottom-sheet-handle` |
| 헤더 | 좌: axisType 라벨(11px hint) + axisValue(18px 800) / 우: X 닫기 버튼 (32px 원형, bg 배경, X 아이콘 16px) |
| 레벨 뱃지 | 64px (h-16 w-16) 정사각 rounded-2xl, `${levelColor}20` 배경 (hex alpha ≈ 12%), 레벨 숫자 28px 900 |
| 레벨 정보 | `Lv.N 타이틀` (14px bold) + `N XP` (12px hint) |
| 진행바 | 8px (h-2), 레벨 색상, "다음 레벨까지" 라벨 + `currentXp / nextLevelXp XP` |
| 통계 3열 | 고유 장소/와인 (`isWine` 판별), 총 기록, 재방문 — bg + border 라운드 박스 |
| XP 구성 | 5항목 리스트 (아이콘 14px + 라벨 13px + 수치 13px 600). 수평 바 없이 라벨+수치만 |
| 다음 마일스톤 | Target 아이콘 (18px, caution) + 라벨 + 진행바 (h-1.5 = 6px, caution) + 현재/목표 (11px hint) + XP 보상 (11px caution) |

### XP 구성 항목 매핑

| key | 표시 라벨 | Lucide 아이콘 | 실제 합산 소스 |
|-----|----------|--------------|---------------|
| `detail_axis` | 새 장소 기록 | Sparkles | `xpBreakdown.detail_axis` |
| `revisit` | 재방문 | Repeat | `xpBreakdown.revisit` |
| `record_full` | 품질 보너스 | Award | `record_full + record_photo + record_score` |
| `milestone` | 마일스톤 | Trophy | `xpBreakdown.milestone` |
| `social` | 소셜 | Heart | `social_share + social_like + social_follow + social_mutual` |

### axisType 라벨 매핑

| axisType | 표시 라벨 |
|----------|----------|
| `category` | 카테고리 |
| `area` | 지역 |
| `genre` | 장르 |
| `wine_variety` | 품종 |
| `wine_region` | 와인 지역 |

### 인터랙션

- 오버레이(`bottom-sheet-overlay`) 탭 시 닫기
- Escape 키 누르면 닫기
- `max-height: 70dvh`, 오버플로우 시 내부 스크롤
- 통계 데이터는 항목 선택 시 `xpRepo`에서 비동기 로드 (`fetchLevelDetailStats`):
  - `getUniqueCount`, `getTotalRecordCountByAxis`, `getRevisitCountByAxis`, `getXpBreakdownByAxis`, `getNextMilestone`

---

## 9. 쿼리 전략

SWR 기반 병렬 요청. 초기 프로필 데이터 + 세부 통계 데이터 분리 로딩.

### 초기 로드 — `useProfile()` (6개 병렬 SWR)

| SWR 키 | 리포지토리 메서드 | 데이터 |
|--------|-----------------|--------|
| `['profile', userId]` | `profileRepo.getUserProfile()` | 유저 프로필 (nickname, avatar, handle, tasteSummary, tasteTags, totalXp, recordCount, currentStreak 등) |
| `['experiences', userId]` | `xpRepo.getUserExperiences()` | 전체 XP 축 목록 → 클라이언트에서 axisType별 그룹핑 (area, genre, wine_region, wine_variety, category) |
| `['recent-xp', userId]` | `xpRepo.getRecentXpHistories(id, 5)` | 최근 XP 5개 |
| `['activity-summary', userId]` | `profileRepo.getActivitySummary()` | 활동 요약 (방문수, 시음수, 평균만족도, 월별XP) |
| `['heatmap', userId]` | `profileRepo.getHeatmapData(id, 13)` | 13주 히트맵 셀 데이터 |
| `'level-thresholds'` | `xpRepo.getLevelThresholds()` | 레벨 임계값 (revalidateOnFocus: false) |

### 세부 통계 — `StatTabContainer` 마운트 시 로드

> **참고**: `useRestaurantStats()`와 `useWineStats()` 모두 `StatTabContainer` 마운트 시 동시에 SWR 요청됨. 탭 전환은 UI 표시만 변경하고 별도 요청 없음.

**식당 탭** — `useRestaurantStats()` (6개 병렬 SWR):

| SWR 키 | 메서드 |
|--------|--------|
| `['restaurant-stats', userId]` | `profileRepo.getRestaurantStats()` |
| `['genre-dist', userId]` | `profileRepo.getGenreDistribution()` |
| `['rest-score-dist', userId]` | `profileRepo.getRestaurantScoreDistribution()` |
| `['rest-monthly', userId]` | `profileRepo.getRestaurantMonthlySpending(id, 6)` |
| `['rest-map', userId]` | `profileRepo.getRestaurantMapMarkers()` |
| `['scene-dist', userId]` | `profileRepo.getSceneDistribution()` |

**와인 탭** — `useWineStats()` (6개 병렬 SWR):

| SWR 키 | 메서드 |
|--------|--------|
| `['wine-stats', userId]` | `profileRepo.getWineStats()` |
| `['variety-dist', userId]` | `profileRepo.getVarietyDistribution()` |
| `['wine-score-dist', userId]` | `profileRepo.getWineScoreDistribution()` |
| `['wine-monthly', userId]` | `profileRepo.getWineMonthlySpending(id, 6)` |
| `['wine-region-map', userId]` | `profileRepo.getWineRegionMapData()` |
| `['wine-type-dist', userId]` | `profileRepo.getWineTypeDistribution()` |

### 레벨 상세 — on-demand

항목 탭 시 `xpRepo`에서 비동기 로드 (Promise.all 4개 → getNextMilestone 1개):
- `getUniqueCount`, `getTotalRecordCountByAxis`, `getRevisitCountByAxis`, `getXpBreakdownByAxis`, `getNextMilestone`

### Wrapped — `useWrapped(category)`

| SWR 키 | 메서드 |
|--------|--------|
| `['wrapped', userId, category]` | `profileRepo.getWrappedData(id, category)` |

- `level_thresholds`는 SWR에 `revalidateOnFocus: false, revalidateOnReconnect: false` 설정 → 사실상 세션 캐시
- SWR의 자동 revalidation으로 포커스 복귀 시 데이터 갱신

---

## 10. 프라이버시 기본값

> 전체 프라이버시 규칙, 버블 상태별 노출 매트릭스, RLS 가이드라인: → **SETTINGS.md §2~§9**

| 항목 | 기본값 | 원칙 |
|------|--------|------|
| 프로필 공개 (`privacy_profile`) | `bubble_only` | 프라이버시 우선 |
| 기록 공개 (`privacy_records`) | `shared_only` | 통제권은 나에게 |
| 전체 공개 가시성 (`visibility_public`) | score/comment/photos/level/quadrant ON, bubbles/price OFF | 단계적 공개 |
| 버블 기본 가시성 (`visibility_bubble`) | 전체 ON | 신뢰 기반 공유 |
| 버블별 커스텀 (`bubble_members.visibility_override`) | NULL (기본값 사용) | 세밀한 제어 |

---

## 11. 컴포넌트 맵

현재 구현된 컴포넌트 목록.

### Presentation Components

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `ProfileHeader` | components/profile/ | 2컬럼 아바타+이름+미식정체성 카드 (인라인) + bio |
| `TasteIdentityCard` | components/profile/ | 독립 미식 정체성 카드 (키워드 하이라이트+태그+공유버튼) |
| `TotalLevelCard` | components/profile/ | 총 레벨+XP+진행바 |
| `OverviewGrid` | components/profile/ | 2x2 통계 그리드 |
| `ActivityHeatmap` | components/profile/ | 활동 히트맵 + 통계 (총 기록/연속일/활동 개월) + Legend |
| `RecentXpList` | components/profile/ | 최근 XP 5개 리스트 (XpReason 기반 아이콘+라벨) |
| `StatSummaryCards` | components/profile/ | 3열 요약 카드 (grid-cols-3) |
| `LevelList` | components/profile/ | 경험치 축 리스트 (탭 시 바텀시트) |
| `LevelDetailSheet` | components/profile/ | 레벨 상세 바텀시트 (XP 구성 5항목, 다음 마일스톤) |
| `StatTabs` | components/profile/ | 식당/와인 패널 렌더링 (StickyTabs + 차트들 조합) |
| `HorizontalBarChart` | components/charts/ | 수평 바 차트 (장르/품종/상황별/타입별 공용) |
| `VerticalBarChart` | components/charts/ | 세로 바 차트 (점수 분포/월별 소비 공용) |
| `RestaurantMap` | components/profile/ | 간이 SVG 세계 지도 + 도시 마커 |
| `WineRegionMapSimple` | components/profile/ | 와인 산지 간이 지도 (국가별 바 리스트 + 타입 도트) |
| `WrappedCard` | components/profile/ | Wrapped 공유 카드 (카테고리별 그라디언트) |
| `GaugeSlider` | components/profile/ | 개인정보/디테일 3단 게이지 |
| `VarietyToggle` | components/profile/ | 품종 전체/마신것만 토글 |

### Containers

| 컨테이너 | 위치 | 역할 |
|----------|------|------|
| `ProfileContainer` | containers/ | 프로필 전체 조합 + useProfile + 미니탭/레벨 상태 + levelSlot 전달 |
| `StatTabContainer` | containers/ | 식당/와인 탭 전환 + useRestaurantStats/useWineStats 동시 SWR 로딩 + showAllVarieties 상태 |
| `WrappedContainer` | containers/ | 카테고리 필터 + 게이지 상태 + useWrapped + 저장/공유 로직 |

### Application Hooks

| 훅 | 위치 | 역할 |
|----|------|------|
| `useProfile` | application/hooks/ | 프로필 + 경험치 + 최근XP + 활동요약 + 히트맵 + 임계값 (6개 SWR 병렬) |
| `useRestaurantStats` | application/hooks/ | 식당 세부 통계 6종 SWR |
| `useWineStats` | application/hooks/ | 와인 세부 통계 6종 SWR |
| `useWrapped` | application/hooks/ | Wrapped 데이터 SWR |

### 상태 관리

#### ProfileContainer 로컬 상태

| 상태 | 타입 | 설명 |
|------|------|------|
| `activeStatTab` | `'food' \| 'wine'` | 세부 통계 탭 (ProfileContainer에서 관리, StatTabContainer의 onTabChange로 동기화) |
| `foodMiniTab` | `'region' \| 'genre'` | 식당 경험치 미니탭 |
| `wineMiniTab` | `'origin' \| 'grape'` | 와인 경험치 미니탭 |
| `levelDetailOpen` | `boolean` | 레벨 상세 바텀시트 열림/닫힘 |
| `selectedExperience` | `UserExperience \| null` | 선택된 경험치 항목 |
| `levelDetailStats` | `object` | 비동기 로드된 상세 통계 (uniqueCount, totalRecords, revisitCount, xpBreakdown, nextMilestone) |

#### StatTabContainer 로컬 상태

| 상태 | 타입 | 설명 |
|------|------|------|
| `activeTab` | `'restaurant' \| 'wine'` | StatTabs 내부 탭 상태 |
| `showAllVarieties` | `boolean` | 품종 토글 상태 |

#### WrappedContainer 로컬 상태

| 상태 | 타입 | 설명 |
|------|------|------|
| `category` | `WrappedCategory` | `'all' \| 'restaurant' \| 'wine'` |
| `gaugePrivacy` | `0 \| 1 \| 2` | 개인정보 게이지 (최소/보통/공개) |
| `gaugeDetail` | `0 \| 1 \| 2` | 디테일 게이지 (심플/보통/상세) |
