# WINE_DETAIL — 와인 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM, RECOMMENDATION
> route: /wines/[id]
> prototype: `prototype/02_detail_wine.html`

---

## 1. 식당 상세와의 차이점

| 요소 | 식당 | 와인 |
|------|------|------|
| 히어로 | 사진 캐러셀 (전폭, 가로) | 사진 캐러셀 + 라벨 세로 썸네일 (좌하단) |
| 컬러 | `--accent-food` #C17B5E | `--accent-wine` #8B7396 |
| 이름 색상 | `var(--text)` (기본 텍스트) | `var(--accent-wine)` (와인 보라) |
| nyam 점수 소스 | 웹+명성 (N/K/G + 미슐랭/블루리본) | Vivino+WS+명성 |
| 사분면 축 | 가격×분위기, 색=만족도 | 산미×바디, 점=내 리뷰 와인 비교 |
| 사분면 점 | 기록별 점, 색=만족도 | **현재 와인 hero dot + 다른 리뷰 와인 ref dots** |
| 실용 정보 | 주소/지도/전화/영업/메뉴 | 품종/산지/알코올/바디/산미/당도/온도/디캔팅/시세/음용적기 |
| 연결 | 여기서 마신 와인 | 함께한 레스토랑 (가로 스크롤 카드) |
| 추가 섹션 | — | 음식 페어링 태그 |
| 좋아요/공유 | 히어로 사진 우하단 (공통) | 히어로 사진 우하단 (공통) |
| 점수 카드 | 3슬롯 (공통) | 3슬롯 (공통) |
| 뱃지 | 미슐랭/블루리본/TV | Grand Cru/Vivino/WS |
| FAB | glassmorphism 중립 (공통) | glassmorphism 중립 (공통 위치·스타일) |

---

## 2. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←뒤로] nyam          🔔 👤         │  App Header (glassmorphism)
│                                      │  뒤로 라벨: referrer 기반 (홈/프로필/버블)
│ ┌──────────────────────────────────┐ │
│ │     사진 캐러셀 (h-56=224px)     │ │  Layer 1: 히어로
│ │     dot indicator               │ │  좌우 스와이프 + 자동 전환 4초
│ │ ┌─────────┐          [♡] [공유] │ │  우하단: 좋아요/공유 (배경 없는 흰색)
│ │ │ 라벨    │                     │ │  좌하단: 세로 라벨 썸네일 (110×160px)
│ │ │ 썸네일  │                     │ │  캐러셀 클릭 시 썸네일 숨김 → 바깥 클릭 시 복귀
│ │ └─────────┘                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Chateau Margaux (--accent-wine 색상)        │  Layer 2: 정보 (일관된 레이아웃)
│ Chateau Margaux · 2018               │  생산자 · 빈티지 (detail-sub)
│ [레드] · 보르도, 프랑스 · Cab.Sauv.  │  타입칩 + 산지 + 품종 (meta-row)
│                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐         │  Layer 3: 점수 카드 (항상 3슬롯)
│ │내 점수│ │ nyam │ │ 버블 │         │  없으면 "—" + "미시음"
│ │  91  │ │  92  │ │  88 ③│         │  버블: 뱃지(참여 버블 수) + 탭 확장
│ │2회시음│ │Viv+WS│ │평균·6│         │
│ └──────┘ └──────┘ └──────┘         │
│ ▼ (버블 탭 시 펼침)                   │  Layer 3b: 버블 확장 패널
│ ┌ 와인동호회 3명  96 ┐               │  각 버블별 아이콘 + 이름 + 인원 + 점수
│ │ 직장맛집   2명  88 │               │
│ └ 대학동기   1명  79 ┘               │
│                                      │
│ [Grand Cru] [Vivino 4.5] [WS 96]    │  Layer 4: 뱃지 행
│                                      │
│ ── 내 와인 지도 ────────────────    │  Layer 5: 사분면
│ ── 음식 페어링 ──────────────────    │  Layer 5b: 페어링 태그
│ ── 나의 기록 ────────────────────    │  Layer 6: 타임라인
│ ── 와인 정보 ────────────────────    │  Layer 7: 팩트 테이블
│ ── 함께한 레스토랑 ─────────────    │  Layer 8: 연결 식당
│ ── 버블 기록 ────────────────────    │  Layer 9: 버블 피드
│                             [+ FAB] │  우하단 플로팅 버튼
└──────────────────────────────────────┘
```

---

## 3. 와인 전용 디자인 토큰

```css
/* 핵심 와인 토큰 (DESIGN_SYSTEM + 목업 기준) */
--accent-wine:       #8B7396;  /* 와인 액센트 */
--accent-wine-light: #F0ECF3;  /* 와인 연한 배경 */
--accent-wine-dim:   #DDD6E3;  /* 와인 보더/태그 배경 (목업 기준값) */

/* 와인 타입 칩 색상 */
/* 레드 */     bg: #FAF0F0; color: var(--negative, #B87272); border: #EDDBDB
/* 화이트 */   bg: #FAFAF0; color: #9A8B30; border: #E8E4C8
/* 로제 */     bg: #FDF5F8; color: #B8879B; border: #EDD8E0
/* 스파클링 */ bg: #F0F5FA; color: var(--accent-social, #7A9BAE); border: #D6E0E8
/* 오렌지 */   bg: #FDF5F0; color: #C17B5E; border: #EDDBD0
/* 주정강화 */ bg: #F5F0F0; color: #8B6B5E; border: #DDD0C8
/* 디저트 */   bg: #FDF8F0; color: #C9A96E; border: #E8E0C8

/* 뱃지 색상 */
badge-wine-class: bg: var(--accent-wine-light); color: var(--accent-wine); border: #DDD6E3
badge-vivino: bg: #FBF0F0; color: #9B2335; border: #E8D0D0
badge-ws: bg: #F5F0E8; color: #8B7355; border: #E0D8C8
```

### 점수 카드 색상 규칙
- 내 점수, nyam 점수, 버블 점수: 모두 `var(--accent-wine)` 색상
- 빈 상태: `var(--border-bold, #D4CFC8)`, font-size 18px

### 사분면 관련
- **와인 사분면은 식당과 다름**: 개별 기록이 아닌 **다른 리뷰 와인과의 상대 위치** 표시
- 현재 와인 = hero dot (38px, `var(--accent-wine)`, 불투명, border 3px `#DDD6E3`)
- 참고 와인 = ref dot (28px, `var(--border-bold)`, 불투명도 35%, hover 시 70%)
- 각 dot 아래 와인명 라벨 표시

---

## 4. 공통 레이아웃 규칙

### 두 가지 컨테이너 패딩

| 컨테이너 | 대상 레이어 | 패딩 |
|----------|-----------|------|
| `detail-info` | Layer 2~4 (정보, 점수, 뱃지) | `0 20px` (좌우만, 내부 요소가 자체 수직 패딩) |
| `section` | Layer 5~9 (사분면, 기록, 팩트 등) | `16px 20px`, margin-top 8px |

### 섹션 헤더 (section 내부)
- flex between, margin-bottom: 14px
- 섹션 제목: 15px, weight 700, `var(--text)`
- 섹션 메타: 12px, `var(--text-sub)`

### 디바이더
- Layer 5b 이후 모든 섹션 사이에 8px 높이 구분선 (`#F0EDE8`): 5b↔6, 6↔7, 7↔8, 8↔9
- Layer 5 → 5b 사이만 디바이더 없이 연속 (5b의 padding-top: 0)

### 스크롤 영역
- 상단 padding-top: 80px (top-fixed 헤더 높이만큼 밀어냄)
- 하단 80px spacer (FAB 가림 방지)

---

## 5. 섹션별 상세

### Layer 1: 히어로 (사진 캐러셀 + 라벨 썸네일)

- **높이**: 224px (`h-56`)
- **캐러셀**: 좌우 스와이프 (터치 + 마우스 드래그), 4초 자동 전환, 트랙 전환 `transform 0.4s ease`
- **dot indicator**: 일반 6×6px 원 (`rgba(255,255,255,0.5)`), 활성 16×6px 필 (border-radius 3px, `#fff`), 하단 중앙 배치
- **사진 없을 때**: 기본 이미지 또는 `bg-neutral-100` + 와인 아이콘
- **좋아요/공유 버튼**: 사진 우하단, 배경 없는 흰색 아이콘 (`rgba(255,255,255,0.85)`)
  - 좋아요 토글: 활성 시 `#FF6038`
- **라벨 세로 썸네일** (와인 전용):
  - 위치: 캐러셀 좌하단 (absolute, bottom:14px, left:16px)
  - 크기: 110×160px, border-radius: 6px
  - 테두리: 2.5px `rgba(255,255,255,0.85)`, 그림자
  - 콘텐츠: 와인 아이콘 + 와인명 텍스트 (세로 배치)
  - **인터랙션**: 캐러셀 클릭 시 좌측으로 슬라이드 아웃 숨김 → 캐러셀 밖 클릭 시 복귀
  - 트랜지션: `transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease`
- **그라디언트 오버레이**: 하단 80px `transparent → rgba(0,0,0,0.4)`

### Layer 2: 정보 (일관된 레이아웃)

**기록 유무에 관계없이 항상 동일한 구조.**

- **이름**: 21px, weight 800, `color: var(--accent-wine)` (와인은 보라색 이름)
- **서브**: 생산자명 · 빈티지 (11px, `var(--text-sub)`)
- **메타 행**: 와인타입칩 · 산지 · 품종 (12px, 한 줄)
  - 와인 타입 칩: 소형 태그 (padding 1px 7px, border-radius **4px**, font-size 10px, weight 600) — pill이 아닌 각진 형태
  - 구분자: `·` (8px, `var(--border-bold)`, margin 0 5px)

### Layer 3: 점수 카드 (3슬롯 고정)

**항상 3칸 가로 배치 (flex, gap 8px). 데이터 없으면 `—` 표시.**

| 슬롯 | 라벨 | 값 | 서브 |
|------|------|-----|------|
| 내 점수 | "내 점수" | 점수 (또는 `—`) | "N회 시음" (또는 "미시음") |
| nyam | "nyam" | 점수 | "Vivino+WS" |
| 버블 | "버블" | 평균 점수 | "평균 · N명" |

- **카드 스타일**: `var(--bg-card)`, border 1px `var(--border)`, border-radius 10px, padding 8px 10px, min-height 56px, text-align center
- **라벨**: 9px, weight 600, `var(--text-hint)`, letter-spacing 0.02em
- **점수 숫자**: 24px, weight 800, `var(--accent-wine)`
- **빈 값**: 18px, `var(--border-bold)` — `—` 표시
- **서브텍스트**: 9px, `var(--text-hint)`
- **버블 카드**:
  - 탭 가능 (cursor: pointer)
  - 우상단 뱃지: 참여 버블 수 (원형, 16px, `var(--accent-social)` 배경)
  - 탭 시 Layer 3b 확장

### Layer 3b: 버블 확장 패널

- 버블 카드 탭 시 아래로 펼침 (max-height 애니메이션 0.25s ease)
- 다른 펼침 패널은 자동 접힘 (하나만 열림)
- 각 행:
  - 아이콘 (24×24px 컬러 박스, lucide 아이콘)
  - 버블명 + "N명 평가" 서브텍스트
  - 버블별 평균 점수 (16px, weight 800, `var(--accent-wine)`)

### Layer 4: 뱃지 행

- 와인 등급/외부 평점 뱃지 (있을 때만, 없어도 레이아웃 영향 없음)
- pill 형태: padding 3px 9px, border-radius 20px, 10px font
- lucide 아이콘 포함 (10×10px)
- 뱃지 종류:
  - **등급**: Grand Cru Classé 등 (`badge-wine-class` 토큰)
  - **Vivino**: 평점 표시 (`badge-vivino` 토큰)
  - **Wine Spectator**: 점수 표시 (`badge-ws` 토큰)

### Layer 5: 내 와인 지도 (사분면)

- **표시 조건**: 사용자의 와인 리뷰 2건 이상 (현재 와인 포함, 비교 대상 1개+ 필요)
- **섹션 헤더**: "내 와인 지도" + "리뷰한 와인 중 위치"
- **차트 영역**: `bg-elevated`, border-radius 8px, padding-bottom 80% (반응형 정사각형)
- **축**:
  - X축: 산미 낮음 ↔ 산미 높음
  - Y축: Light Body ↔ Full Body
  - 십자선: 중앙 50% 위치, `var(--accent-wine-dim)` 색상
  - 축 라벨: 9px, `var(--accent-wine)` 색상
- **점 (dot)**:
  - **현재 와인 (hero dot)**: 38×38px, `var(--accent-wine)` 배경, border 3px `#DDD6E3`, box-shadow `0 2px 10px rgba(139,115,150,0.4)`, 점수 표시 (11px, weight 800, 흰색), z-index 10
  - **참고 와인 (ref dot)**: 28×28px, `var(--border-bold)` 배경, border 2px `var(--border)`, 불투명도 35%, 점수 표시 (8px, weight 600, `var(--text)`), hover 시 70% + scale 1.15, z-index 5
  - 각 dot 아래 와인명 라벨 (9px, `var(--text-hint)`)
  - 현재 와인 라벨: 10px bold, `var(--accent-wine)` 색상
- **캡션**: info 아이콘 + "내가 리뷰한 와인과의 상대적 위치"
- **배경**: `var(--accent-wine-light)`, border `var(--accent-wine-dim)`

### Layer 5b: 음식 페어링

- **표시 조건**: DB 데이터이므로 기록 없어도 항상 표시
- **섹션 헤더**: "음식 페어링"
- **태그**: pill 형태 (padding 5px 12px, border-radius 20px)
  - 배경: `var(--accent-wine-light)`, border: `#DDD6E3`, 색상: `var(--accent-wine)`
  - font: 11px, weight 500
- flex-wrap으로 여러 줄 가능

### Layer 6: 나의 기록 (타임라인)

**기록 있음**: "N회 · 최근 날짜" → 타임라인 (최신순)

- **타임라인 라인**: 왼쪽 세로선, `var(--accent-wine) → #C0B3CA → transparent` 그라디언트
- **각 기록**:
  - 도트 (12px 원, 이중 링 구조: `border: 2px solid var(--bg)` 흰 테 + `box-shadow: 0 0 0 2px [색상]` 외곽 링)
    - 색상: 상황태그 색 또는 `var(--accent-wine)` — 점수 텍스트와 동일 색상 사용
  - 날짜 (11px) + 상황 태그 칩 (pill, padding 2px 8px, border-radius 20px, 10px weight 600, 흰색 텍스트, 상황별 배경색)
  - 점수 (13px, weight 700, 도트와 동일 색상) + 한줄평 (12px, `var(--text-sub)`)
  - **식당 연결** (와인 전용): `map-pin` 아이콘 (12px) + 식당명 (11px, `var(--text-sub)`, 탭→식당 상세)
- 탭 → 기록 상세 (`/records/[id]`)

**상황 태그 칩 색상**:
| 태그 | 색상 |
|------|------|
| 혼술 | `var(--scene-solo)` #7A9BAE |
| 데이트 | `var(--scene-romantic)` #B8879B |
| 페어링 | `var(--caution)` #C9A96E |
| 모임 | `var(--scene-friends)` #7EAE8B |
| 선물 | `var(--scene-business)` #8B7396 |
| 시음 | `var(--scene-drinks)` #B87272 |
| 디캔팅 | #A0896C |

**기록 없음**:
- 아이콘: `search` (28px, `var(--text-hint)`)
- 제목: "아직 기록이 없어요" (14px, weight 600, `var(--text-sub)`)
- 설명: "우하단 + 버튼으로 첫 기록을 남겨보세요" (12px, `var(--text-hint)`)
- 패딩: 40px 20px, text-align center

### Layer 7: 와인 정보 (팩트 테이블)

- **표시 조건**: DB 데이터이므로 기록 없어도 항상 표시
- **섹션 헤더**: "와인 정보"
- **테이블 레이아웃**: 2열 (`td:first-child` 90px 라벨, `td:last-child` 값)
  - 라벨: 12px, weight 500, `var(--text-sub)`
  - 값: 12px, weight 500, `var(--text)`
  - 행 구분선: 1px `#F0EDE8`

| 항목 | 표시 형식 예시 |
|------|--------------|
| 품종 | Cabernet Sauvignon 75%, Merlot 20%, Petit Verdot 5% |
| 산지 | 프랑스 보르도 메독 |
| 알코올 | 14.5% |
| 바디 | ●●●●○ Full (dot 레벨 표기) |
| 산미 | ●●○ 중간 |
| 당도 | ●○○ 드라이 |
| 적정 온도 | 16–18°C |
| 디캔팅 | 2시간 권장 |
| 참고 시세 | ≈ 80만원 |
| 음용 적기 | 2025–2045 |

### Layer 8: 함께한 레스토랑

- **표시 조건**: 와인 기록에 식당이 연결된 경우만 (없으면 섹션 숨김)
- **섹션 헤더**: "함께한 레스토랑"
- **가로 스크롤 카드** (hscroll-wrap):
  - 카드 너비: 130px, border-radius 12px
  - 사진: 60px 높이 (상단)
  - 정보: 식당명 (11px bold) + 점수·장르 (11px, 점수 bold `var(--accent-food)`)
  - 탭 → 식당 상세 (`/restaurants/[id]`)

### Layer 9: 버블 기록 (Phase 2)

- **섹션 헤더**: "버블 기록" + "Phase 2"
- **필터 칩**: 가로 배열 (전체, 와인 모임, 소믈리에 등)
  - 활성: `bg: var(--accent-wine-light)`, border: `var(--accent-wine)`, color: `var(--accent-wine)`
  - 비활성: `bg: var(--bg)`, border: `var(--border)`
- **버블 카드**:
  - border: `var(--accent-wine-dim)`, border-radius 12px, padding 12px
  - 상단: 아바타 (32px 원, 그라디언트) + 유저명 + **레벨 뱃지** + 버블명 + 점수 (14px bold, `var(--accent-wine)`)
    - 레벨 뱃지: 유저명 우측 인라인 (11px, weight 500, padding 1px 6px, border-radius 4px). 형식: `[지역] Lv.[N]`. 색상은 사용자 도메인에 따라 `--accent-wine`/`--accent-social` 등 변동
  - 본문: 한줄평 (12px, `var(--text-sub)`, line-height 1.5)
  - 하단: 메타(태그 · 시간) + 리액션(좋아요 + 댓글, lucide 아이콘 12px)
  - 좋아요 활성: `var(--accent-wine)` 색상
  - 탭 시 살짝 축소 (scale 0.98)
- **빈 상태**:
  - 아이콘: `message-circle` (28px, `var(--text-hint)`)
  - 제목: "아직 버블 기록이 없어요" (14px, weight 600, `var(--text-sub)`)
  - 설명: "버블에서 이 와인에 대한 이야기를 나눠보세요" (12px, `var(--text-hint)`)
  - 패딩: 40px 20px, text-align center

### FAB (+)

- **위치**: 우하단 (absolute, bottom: 28px, right: 16px)
- **스타일**: 44×44px 원형, glassmorphism 배경 (`rgba(248,246,243,0.88)`, blur 12px)
  - border: 1px `var(--border)`, 그림자
  - 아이콘: `plus` (22px)
- **동작**:
  - 기록 있는 상태: "새 시음 추가" (와인 선택 단계 스킵 → 바로 사분면 평가)
  - 기록 없는 상태: "첫 기록 남기기" (동일하게 와인 선택 스킵)

### 뒤로가기 FAB

- **위치**: 좌하단 (absolute, bottom: 28px, left: 16px)
- **스타일**: 44×44px 원형, glassmorphism 배경 (동일)
- **아이콘**: `chevron-left` (22px)
- **동작**: `history.back()`

---

## 5. 페이지 상태별 섹션 구성

데이터 조건에 따라 섹션 표시/숨김이 달라진다.

| 섹션 | 내 기록 있음 | 내 기록 없음 |
|------|:----------:|:----------:|
| Layer 1: 히어로 | ● 표시 | ● 표시 |
| Layer 2: 정보 (이름/메타) | ● 표시 | ● 표시 |
| Layer 3: 점수 카드 | 내 점수 = 실제 값 | 내 점수 = `—` / "미시음" |
| Layer 3: nyam 점수 | ● 표시 (DB) | ● 표시 (DB) |
| Layer 3: 버블 점수 | 데이터 따라 | 데이터 따라 |
| Layer 4: 뱃지 행 | ● 표시 (DB) | ● 표시 (DB) |
| Layer 5: 사분면 | ● 와인 리뷰 2건+ | ✕ 숨김 |
| Layer 5b: 음식 페어링 | ● 표시 (DB) | ● 표시 (DB) |
| Layer 6: 나의 기록 | ● 타임라인 | ○ 빈 상태 |
| Layer 7: 와인 정보 | ● 표시 (DB) | ● 표시 (DB) |
| Layer 8: 함께한 레스토랑 | ● 연결 있을 때만 | ✕ 숨김 |
| Layer 9: 버블 기록 | 버블 데이터 따라 | 버블 데이터 따라 |

> ● 표시, ○ 빈 상태 UI, ✕ 섹션 자체 숨김
> nyam/뱃지/페어링/와인정보는 DB 기반이므로 내 기록 유무와 무관하게 항상 표시.
> 버블 점수(Layer 3)와 버블 기록(Layer 9)은 내 기록과 독립적으로 버블 멤버 데이터 유무에 따라 결정.

---

## 6. 네비게이션 & 헤더

### App Header (top-fixed, glassmorphism)

- **구조**: 상태바 (44px) + 앱 헤더
- **배경**: `rgba(248,246,243,0.55)`, backdrop-filter blur 20px saturate 1.5, 그림자
- **좌측**: 뒤로 버튼 (chevron-left + 라벨)
  - 라벨: referrer 기반 동적 변경
    - `?from=home` → "홈" (→ `01_home.html`)
    - `?from=profile` → "프로필" (→ `03_profile.html`)
    - `?from=bubble` → "버블" (→ `04_bubbles_detail.html`)
    - 기본: "홈"
- **우측**: bubbles 텍스트 링크 + 알림 벨 (dot 표시) + 아바타 드롭다운 (프로필/설정)

---

## 7. 빈 상태

**점수 카드 3슬롯은 항상 표시, 데이터 없으면 `—`** (레이아웃 불변).

| 섹션 | 빈 상태 | 비고 |
|------|---------|------|
| 점수 카드 | 3슬롯 유지, 내 점수만 `—` + "미시음" | nyam/버블은 DB 데이터 |
| 기록 | "아직 기록이 없어요" + CTA 안내 | FAB로 기록 추가 |
| 사분면 | 섹션 숨김 | 와인 리뷰 2건+ 시 표시 |
| 페어링 | DB 데이터이므로 기록 없어도 표시 | 즉시 유용 |
| 와인 정보 | DB 데이터이므로 기록 없어도 표시 | 즉시 유용 |
| 식당 연결 | 섹션 숨김 | 기록에 식당 연결 있을 때만 |
| 버블 기록 | "아직 버블 기록이 없어요" | CTA 안내 포함 |

---

## 8. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 와인 기본정보 (이름/생산자/빈티지/품종/산지) | 와인 DB API 캐시 | 2주 |
| 라벨 이미지 | 와인 DB + 사용자 업로드 | 이벤트 |
| 와인 타입 | wines.type | — |
| 팩트 테이블 (알코올/바디/산미/당도/온도/디캔팅) | 와인 DB API 캐시 | 2주 |
| 참고 시세 | 와인 DB 또는 외부 가격 API | 2주 |
| 음용 적기 | 와인 DB | — |
| 음식 페어링 | 와인 DB + 사용자 기록 보강 | 이벤트 |
| 뱃지 (등급/Vivino/WS) | 와인 DB + 외부 평점 API | 2주 |
| 내 점수 | records 집계 (target_type='wine') | 실시간 |
| Nyam 점수 | Vivino + WS 가중 평균 | 2주 |
| 버블 점수 | bubble_shares → records 집계 | 실시간 |
| 사분면 좌표 | records.axis_x (산미), records.axis_y (바디) | 실시간 |
| 나의 기록 타임라인 | records + record_photos | 실시간 |
| 식당 연결 | records.linked_restaurant_id → restaurants | 실시간 |
| 버블 기록 피드 | bubble_shares + records + reactions + comments | 실시간 |

---

## 9. 인터랙션

| 요소 | 인터랙션 | 세부 |
|------|---------|------|
| 캐러셀 | 좌우 스와이프 + 자동 전환 | threshold 40px (터치) / 30px (마우스), 4초 auto-advance |
| 라벨 썸네일 | 캐러셀 클릭 시 숨김 | 좌측 슬라이드 아웃, 캐러셀 밖 클릭 시 복귀 |
| 좋아요 | 토글 | 활성: `#FF6038` |
| 버블 점수 카드 | 탭 → 확장 패널 | max-height 0→200px, 0.25s ease, 하나만 열림 |
| 타임라인 기록 | 탭 → 기록 상세 | `/records/[id]` |
| 식당 연결 | 탭 → 식당 상세 | `/restaurants/[id]` |
| 레스토랑 카드 | 탭 → 식당 상세 | `/restaurants/[id]` |
| 버블 카드 | 탭 → 살짝 축소 (0.98) | 상세 진입 |
| 필터 칩 | 탭 → 활성 전환 | 한 번에 하나만 활성 |
| FAB (+) | 탭 → 기록 플로우 | 와인 선택 스킵, 바로 사분면 평가 |
| 뒤로 FAB | 탭 → history.back() | — |
| 헤더 뒤로 | 탭 → referrer 기반 이동 | from 파라미터 기반 |

---

## 10. 컴포넌트 트리 (구현 가이드)

```
WineDetailPage (Container)
├── AppHeader
│   ├── BackButton (referrer-aware label)
│   ├── BubblesLink
│   ├── NotificationBell (+ dropdown)
│   └── AvatarMenu (프로필/설정)
├── ScrollContent
│   ├── HeroCarousel
│   │   ├── CarouselTrack (slides)
│   │   ├── CarouselDots
│   │   ├── HeroActions (LikeButton, ShareButton)
│   │   └── WineLabelThumbnail (세로 110×160)
│   ├── DetailInfo
│   │   ├── InfoHeader (name, sub, meta-row with WineTypeChip)
│   │   ├── ScoreCards (3 slots)
│   │   │   ├── ScoreCard (내 점수)
│   │   │   ├── ScoreCard (nyam)
│   │   │   └── ScoreCard.Bubble (탭→확장)
│   │   ├── BubbleExpandPanel (버블별 점수 rows)
│   │   └── BadgeRow (등급, Vivino, WS badges)
│   ├── QuadrantSection (내 와인 지도)
│   │   ├── QuadrantChart (crosshair + axis labels)
│   │   ├── QuadrantDot.Current (hero dot)
│   │   ├── QuadrantDot.Ref[] (reference dots)
│   │   └── QuadrantCaption
│   ├── PairingSection
│   │   └── PairingTag[]
│   ├── RecordSection (나의 기록)
│   │   ├── Timeline
│   │   │   └── TimelineItem[] (dot, date, scene-chip, score, comment, place-link)
│   │   └── EmptyState (조건부)
│   ├── WineFactSection (와인 정보)
│   │   └── FactTable (2-column key-value)
│   ├── ConnectedRestaurantSection (함께한 레스토랑)
│   │   └── HScrollCards
│   │       └── RestaurantCard[] (photo, name, score, genre)
│   └── BubbleRecordSection (버블 기록)
│       ├── FilterChips
│       ├── BubbleCard[] (avatar, user, score, comment, meta, reactions)
│       └── EmptyState (조건부)
├── FabBack (좌하단)
└── FabAdd (우하단)
```
