# WINE_DETAIL — 와인 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM, XP_SYSTEM
> route: /wines/[id]?bubble={bubbleId}
> prototype: `prototype/02_detail_wine.html`

---

## 1. 식당 상세와의 차이점

| 요소 | 식당 | 와인 |
|------|------|------|
| 히어로 | 사진 캐러셀 (전폭, 가로) | 사진 캐러셀 (와인 사진 → 라벨 → 기록 사진 fallback) |
| 컬러 | `--accent-food` #C17B5E | `--accent-wine` #8B7396 |
| 이름 색상 | `var(--text)` (기본 텍스트) | `var(--text)` (기본 텍스트) |
| 점수 표시 | nyam 점수 카드 | Classification/Vivino/RP/WS 인라인 배치 |
| 사분면 | 개별 기록별 점, 색=만족도 | hero dot(내 평균) + 내 기록 dots + 다른 와인 ref dots |
| 실용 정보 | 주소/지도/전화/영업/메뉴 | 품종/산지/알코올/바디/산미/당도/온도/디캔팅/시세/음용적기 |
| 연결 | 여기서 마신 와인 | 기록 히스토리 카드 내 연결 식당 표시 |
| 추가 섹션 | — | 향 프로필 (AromaWheel), 구조 평가 (WineStructureEval), 가격 분석 모달, quadrantMode(avg/recent) |
| 좋아요/공유 | 히어로 사진 우하단 (공통) | 히어로 사진 우하단 (공통) |
| FAB | glassmorphism 뒤로 + accent 추가 (공통) | 뒤로: glassmorphism (fab-back), 추가: solid `var(--accent-wine)` 배경 + 흰색 아이콘 (FabAdd variant="wine") |
| 기록 액션 | — | FabActions (수정/공유/삭제) — 기록 존재 시 표시 |
| 버블 모드 | — | `?bubble=` 쿼리로 BubbleMiniHeader + 멤버 사분면 표시 |

---

## 2. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←뒤로] nyam          🔔 👤         │  AppHeader (glassmorphism)
│                                      │
│ ┌──────────────────────────────────┐ │  [버블 모드시 BubbleMiniHeader]
│ │ 버블아이콘 버블명  N명    [닫기] │ │  sticky, top: 46px
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │     사진 캐러셀 (h-56=224px)     │ │  Section 1: 히어로
│ │     dot indicator               │ │  좌우 스와이프 + 마우스 드래그
│ │                      [공유] [♡] │ │  우하단: 공유/찜 (아이콘)
│ └──────────────────────────────────┘ │
│                                      │
│ Chateau Margaux [Red]         Viv 4.5│  Section 2: 기본 정보
│ 2018  Chateau Margaux         RP 96 │  이름+타입칩 | 외부 점수 인라인
│                      적정가 80만~120만│  적정가 + [추가정보] 버튼
│ ────────────────────────────────────│  구분선
│ 🏷 프랑스 › 보르도 › 메독 [Lv.5]    │  Country › Region + 산지 레벨
│ 🍇 Cab.Sauv. 75% · Merlot 25% [Lv.3]│ 품종 칩 + 품종 레벨
│ Medium+ Body | 높음 Acid | Dry |ABV 14%│ 특성 한줄 (body/acidity/sweet/abv)
│ 🌡 16-18°C · 🍷 디캔팅 2h · 📅 음용│  서빙 정보 행
│ 🍽 스테이크, 치즈, 파스타            │  푸드 페어링
│ "블랙커런트와 시가박스 노트..."       │  테이스팅 노트 (italic)
│                                      │
│ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄│  Divider (8px)
│                                      │
│ 나의 기록              2회시음·2024.12│  Section 3: 나의 기록
│                                      │  헤더 (제목 + 시음 메타)
│ ┌──────────────────────────────────┐ │
│ │   사분면 (RatingInput readOnly)  │ │  hero dot + record dots + ref dots
│ └──────────────────────────────────┘ │
│ 향 프로필  2회 누적                   │  AromaWheel (merged, readOnly)
│ ┌──────────────────────────────────┐ │
│ │      아로마 휠                    │ │
│ └──────────────────────────────────┘ │
│ 구조 평가  평균                       │  WineStructureEval (averaged)
│ ┌──────────────────────────────────┐ │
│ │  복합성/피니시/밸런스 슬라이더    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄│  Divider (8px)
│                                      │
│ 기록 히스토리                         │  Section 4: 기록 히스토리
│ ┌──────────────────────────────────┐ │
│ │ [📷] 2024.12.15         91점    │ │  카드형 (bg-card, rounded-xl)
│ │      "훌륭한 밸런스..."          │ │  사진 썸네일 + 날짜 + 점수 + 코멘트
│ │      📍 레스토랑명               │ │  연결 식당 (있을 때만)
│ ├──────────────────────────────────┤ │
│ │ [📷] 2024.06.20         85점    │ │
│ │      "지난번보다 아쉬움"          │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [← FAB]                    [+ FAB] │  DetailFab (좌: 뒤로, 우: 기록 추가)
│                      [✏️ 🔗 🗑]    │  FabActions (기록 있을 때만)
└──────────────────────────────────────┘
```

---

## 3. 와인 전용 디자인 토큰

```css
/* 핵심 와인 토큰 */
--accent-wine:       #8B7396;  /* 와인 액센트 */

/* 와인 타입 칩 (WineTypeChip) — WINE_TYPE_COLORS in domain/entities/wine.ts */
/* 칩은 영문 타입명을 CSS capitalize로 표시 (e.g., "Red", "White", "Sparkling") */
/* 배경색 = 아래 색상, 텍스트 = 흰색, rounded-full, 11px, font-semibold */
/* 레드 */     #8B2252
/* 화이트 */   #C9A96E
/* 로제 */     #D4879B
/* 스파클링 */ #7A9BAE
/* 오렌지 */   #C17B5E
/* 주정강화 */ #8B7396
/* 디저트 */   #B87272
```

### 특성 라벨 매핑

```typescript
// 컨테이너 내 정의 (wine-detail-container.tsx)
BODY_LABELS:     { 1:'Light', 2:'Medium-', 3:'Medium', 4:'Medium+', 5:'Full' }
ACIDITY_LABELS:  { 1:'낮음', 2:'약간 낮음', 3:'보통', 4:'높음', 5:'매우 높음' }
SWEETNESS_LABELS:{ 1:'Dry', 2:'Off-dry', 3:'Medium', 4:'Sweet', 5:'Luscious' }
```

### AxisLevelBadge 스타일

```typescript
// LEVEL_TIERS — 레벨별 색상 티어
// Lv.1-3: 초록 (#7EAE8B)
// Lv.4-5: 파랑 (#7A9BAE)
// Lv.6-7: 보라 (#8B7396)
// Lv.8-9: 주황 (#C17B5E)
// Lv.10+: 금색 (#C9A96E)
```

- 크기: 10px, weight 800, borderRadius 8px, border 1.5px
- axisLabel 있으면 "{label} Lv.{N}", 없으면 "Lv.{N}"만 표시
- `transform: rotate(-2deg)` 틸트 효과
- 고레벨(>7): gradient 배경 추가

### 가격 포맷

```typescript
// formatPrice(price: number): string
// 10000 이상 → "{N}만원" / 미만 → "{N}원"
```

---

## 4. 라우트 & Props

```typescript
// src/app/(main)/wines/[id]/page.tsx
interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bubble?: string }>
}
// → WineDetailContainer { wineId: string, bubbleId: string | null }
```

- `bubble` 쿼리 파라미터가 있으면 **버블 모드** 활성화
- 버블 모드: BubbleMiniHeader 표시 + 사분면에 버블 멤버 dots

---

## 5. 섹션별 상세

### 로딩 상태

- 전체 화면 중앙에 스피너: 24×24px, `border-[var(--accent-wine)]`, animate-spin

### Section 1: 히어로 (HeroCarousel)

- **높이**: 224px, `cursor: grab` (사진 있을 때만, 없으면 기본 커서)
- **사진 소스 우선순위** (fallback chain):
  1. `wine.photos` (와인 전용 사진)
  2. `wine.labelImageUrl` (라벨 이미지)
  3. `recordPhotos` (기록 사진 수집)
  4. fallback: `bg-elevated` + Wine 아이콘 (28px, hint)
- **캐러셀**: 좌우 스와이프 (터치/마우스 드래그, threshold 40px), `transition-transform 400ms ease-in-out`
- **dot indicator**: 2장 이상일 때 표시, 활성 16×6px 흰색 / 비활성 6×6px 반투명, **클릭 시 다음 사진으로 순환**
- **하단 그라디언트**: 80px, `transparent → rgba(0,0,0,0.4)`
- **사진 클릭**: PopupWindow로 확대 표시 (max 90vw/70vh, rounded-2xl), **팝업 내 클릭 시 다음 사진 순환**
- **우하단 버튼** (bottom: 10px, right: 12px):
  - 공유(Share2): Web Share API (`navigator.share`) 호출
  - 찜(WishlistButton, variant="hero"): 토글, 20px 아이콘

### Section 2: 기본 정보 (통합 섹션)

**padding: `14px 20px 0`**. 와인의 모든 메타데이터를 한 섹션에 통합 표시.

#### 1행: 와인명 + 타입칩 + 외부 점수

좌측-우측 flex 배치:

**좌측:**
- 와인명: 19px, weight 800, `color: var(--text)`, lineHeight 1.3
- WineTypeChip: 인라인 (와인명 우측)
- 서브: 빈티지 + 생산자 (13px, `var(--text-sub)`)

**우측 (있을 때만):**
- Classification 뱃지: rounded-md, border, 10px, font-semibold
- Vivino 점수: 라벨 10px hint + 값 18px bold sub
- RP 점수: 라벨 10px hint + 값 18px bold sub
- WS 점수: 라벨 10px hint + 값 18px bold sub

#### 2행: 적정가 (우측 정렬, referencePriceMin 또는 referencePriceMax 있을 때만)

- "적정가" 라벨 (10px, hint) + 가격 범위 (13px bold, `var(--accent-wine)`)
  - 둘 다 있으면: `"{min}~{max}"` (e.g., "8만원~12만원")
  - 하나만 있으면: 단일 값 표시
- `priceReview` 존재 시 **[추가정보]** 버튼 (Info 아이콘 + 텍스트, bg-elevated, rounded 6px) → 가격 분석 모달 오픈

#### 구분선

- 1px `var(--border)`, margin 10px 0

#### 3행: 산지 계층 (Country › Region › Sub-region/Appellation) + 산지 레벨

- Country: pill 칩 (MapPin 아이콘 + 국가명, `var(--accent-wine)` 색상, 12% 배경)
- Region: 일반 텍스트
- Sub-region 또는 Appellation: 일반 텍스트
- `›` 구분자로 계층 표현
- **산지 레벨 뱃지**: region 값에 매칭되는 AxisLevelBadge — 행 끝에 인라인 표시

#### 4행: 품종 칩 + 품종 레벨

- 각 grapeVariety를 개별 pill 칩으로 표시
- Grape 아이콘(11px) + 품종명 + 퍼센트 (`pct > 0 && pct < 100`일 때만, 10px, opacity 0.55)
- grapeVarieties 없고 mainVariety만 있을 때: 단일 칩으로 표시
- 스타일: `var(--accent-wine)` 색상, 10% 배경 (`color-mix`), rounded-full, 12px, font-medium
- **품종 레벨 뱃지**: bestVariety 값에 매칭되는 AxisLevelBadge — 칩 행 끝에 인라인 표시

#### 5행: 특성 한줄 (Body | Acidity | Sweetness | ABV)

- 형식: `"{BODY_LABELS} Body | {ACIDITY_LABELS} Acid | {SWEETNESS_LABELS} | ABV {N}%"`
  - 예: "Medium+ Body | 높음 Acid | Dry | ABV 14.5%"
- 13px, font-medium, `var(--text)`
- `|` 구분자 (`var(--border)` 색상), 각 항목은 해당 데이터 있을 때만 표시

#### 6행: 서빙 정보 (있을 때만)

- Thermometer 아이콘 + 서빙온도
- GlassWater 아이콘 + "디캔팅" + 시간
- CalendarRange 아이콘 + "음용" + 기간
- `·` 구분자, 13px, `var(--text-sub)`

#### 7행: 푸드 페어링 (있을 때만)

- UtensilsCrossed 아이콘 + 쉼표 구분 텍스트
- 13px, `var(--text-sub)`

#### 8행: 테이스팅 노트 (있을 때만)

- 이탤릭, 12px, `var(--text-sub)`
- 따옴표로 감싸서 표시: `"...노트 내용..."`

### Divider

- `height: 8px`, `backgroundColor: var(--bg-elevated)`
- 주요 섹션 사이에 배치

### Section 3: 나의 기록

**padding: `16px 20px`**

#### 헤더

- 좌측: "나의 기록" (15px, weight 700)
- 우측: "N회 시음 · 최근날짜" 또는 "아직 기록이 없어요" (12px, hint)
- **참고**: 축 레벨 뱃지는 Section 2의 산지/품종 행에 인라인 배치됨 (Section 3 헤더에는 없음)

#### 사분면 (RatingInput, readOnly)

- **표시 조건**: `tastingCount > 0` 또는 `(버블모드 && bubbleRefPoints > 0)`

**quadrantMode 토글** (기록 2건 이상일 때 표시):
- `'avg'` (기본): 전체 기록 평균 dot + 개별 기록 dots + 다른 와인 ref dots
- `'recent'`: 특정 기록 1개의 dot + 나머지 기록 dots (ref로 표시)

**일반 모드 — avg:**
- `avgDot`: 모든 기록의 axisX/axisY/satisfaction 평균값 → hero dot
- `referencePoints`: 내 기록 개별 dots + `quadrantRefs` (다른 와인 평균 dots, 최대 12개)
- ref dot 클릭 시 해당 와인 상세로 이동 (`onRefNavigate`)

**일반 모드 — recent:**
- `focusedDot`: `focusedRecordIdx`에 해당하는 기록의 좌표 → hero dot
- `referencePoints`: 나머지 기록들 (`otherRecordRefs`)
- ref dot 롱프레스 시 해당 기록으로 포커스 전환 (`onRefLongPress`)
- `onRefNavigate` 비활성

**버블 모드 (`?bubble=` 있을 때):**
- `bubbleRefPoints`: 해당 버블 멤버들의 사분면 데이터
- 현재 유저의 dot이 없으면 `hideDot` 처리
- 멤버 이름 라벨 표시

#### 향 프로필 (AromaWheel, readOnly)

- **표시 조건**: `hasAromaData` (기록 중 aromaRegions 데이터가 있는 기록 존재)
- **라벨**: "향 프로필" (13px, weight 600, sub) + "N회 누적" (11px, hint)
- **합산 로직**:
  - regions: 각 region의 max 값 사용 (여러 기록 중 최대)
  - labels: 모든 기록의 unique labels 합집합
  - color: 모든 기록의 aromaColor 평균 (RGB 각 채널 평균)

#### 구조 평가 (WineStructureEval)

- **표시 조건**: `hasStructureData` (기록 중 complexity !== null인 기록 존재)
- **라벨**: "구조 평가" (13px, weight 600, sub) + "평균" (11px, hint)
- **평균 로직**: complexity, finish, balance 각각 산술 평균 (Math.round)
- **기본값** (데이터 없을 때): `{ complexity: 30, finish: 50, balance: 50 }`

### Section 4: 기록 히스토리

**padding: `16px 20px`**

- 헤더: "기록 히스토리" (15px, weight 700)

**기록 있음:**
- 카드 리스트 (flex-col, gap 2)
- 각 카드: `bg-card`, rounded-xl, p-3 (12px), gap-3, 전체 영역 탭 가능 (button)
  - 좌측: 기록 사진 첫번째 썸네일 (48×48px, rounded-lg) — **사진 있을 때만 표시**
  - 우측 상단: 날짜 (13px, weight 600, `var(--text)`) + 점수 pill (11px, weight 700, accent-wine 12% 배경) — **satisfaction 있을 때만 표시**
  - 코멘트: line-clamp-2, 12px, sub — **comment 있을 때만 표시**
  - 연결 식당: 📍 + 식당명 (11px, hint) — **linkedRestaurantId 매칭 성공 시만 표시**
- 탭 → 기록 수정 (`/record?...&edit={recordId}`)

**기록 없음:**
- "아직 기록이 없어요" (13px, hint, text-center, py-6)

### 하단 여백

- `height: 80px` spacer (FAB 가림 방지)

---

## 6. FAB & 기록 액션

### DetailFab (항상 표시)

- **좌하단**: 뒤로 버튼 (← chevron) → `router.back()`
- **우하단**: 기록 추가 버튼 (FabAdd) → `/record?type=wine&targetId={wineId}&name=...&meta=...&from=detail`
  - meta: WINE_TYPE_LABELS(한국어) + region + vintage 조합 (e.g., "레드 · 보르도 · 2018")
- **variant**: `"wine"`

### activeRecordId (동적 대상 기록)

수정/공유/삭제 대상 기록은 `activeRecordId`로 결정:
- `quadrantMode === 'recent'` && focusedRecord → **focusedRecord.id** (사분면에서 선택한 기록)
- 그 외 → `selectedRecordId ?? myRecords[0]?.id ?? null` (첫 번째 기록 기본)

### FabActions (기록 존재 시만 표시)

- **variant**: `"wine"` → accent 색상 `var(--accent-wine)`
- **버튼 3개** (Pencil/Share2/Trash2 아이콘 + 라벨):
  - 수정 (accent tone): `activeRecordId` 기준 기록 편집 페이지 이동 (meta: 타입 라벨 + region, vintage 미포함)
  - 공유 (neutral tone): canShare 체크 후 ShareToBubbleSheet 오픈 (불가 시 showToast)
  - 삭제 (danger tone): DeleteConfirmModal 오픈 → 확인 시:
  1. XP 이력 + 버블 공유 동시 조회 (`Promise.all([xpRepo.getHistoriesByRecord, bubbleRepo.getRecordShares])`)
  2. 기록 삭제 (`recordRepo.delete`)
  3. XP 차감 + 이력 삭제 (best-effort)
  4. toast: "기록이 삭제되었습니다"
  5. 버블 공유가 있었으면 (`shares.length > 0`) 추가 toast: "N개 버블 공유도 함께 삭제되었습니다"
  6. 남은 기록 조회 → 있으면 (`remaining.length > 0`) toast: "이 와인의 기록이 N건 남아있습니다"
  7. `router.replace('/')` (딜레이 없음)

---

## 7. 모달 & 시트

### 가격 분석 모달 (PriceReview)

- **트리거**: Section 2 적정가 옆 [추가정보] 버튼 (priceReview 존재 시)
- **오버레이**: fixed, rgba(0,0,0,0.4), z-200
- **모달**: fixed center, w-[calc(100%-40px)], max-w-[360px], rounded-2xl
- **내용**:
  - 헤더: "가격 분석" + X 닫기 버튼
  - 판정 뱃지 (verdict):
    - `buy`: 초록(#16a34a) pill + ShieldCheck 아이콘, "구매 추천"
    - `conditional_buy`: 노랑(#f59e0b) pill + ShieldAlert 아이콘, "조건부 구매"
    - `avoid`: 빨강(#dc2626) pill + ShieldX 아이콘, "비추천"
  - 분석 요약: summary 텍스트 (14px, leading-relaxed)
  - 대안 와인 리스트: "같은 가격대 대안" 라벨 + 카드 리스트 (이름 + 가격)

### DeleteConfirmModal

- 기록 삭제 확인 모달
- isDeleting 상태로 로딩 처리

### ShareToBubbleSheet

- 버블 선택 시트
- 사용자의 활성 버블 목록에서 다중 선택 → 공유

### Toast (`useToast` 훅)

- `showToast(message)` 함수로 호출 (별도 `<Toast>` 컴포넌트 렌더링 불필요)
- 삭제 완료, 버블 공유 삭제, 남은 기록 수, 공유 불가 등

---

## 8. 버블 모드 (Bubble Mode)

`/wines/[id]?bubble={bubbleId}` 접근 시 활성화.

### BubbleMiniHeader

- **위치**: sticky, top: 46px (AppHeader 아래), z-index: 80
- **데이터**: `useBubbleDetail(bubbleId, userId)`
  - 버블명, 설명, 아이콘, 배경색, 멤버 수
- showBack 옵션 활성

### 사분면 변경

- 일반 모드의 ref dots 대신 **버블 멤버 dots** 표시
- `useBubbleFeed(bubbleId, 'member', 'rating_and_comment')`로 shares 조회
- 해당 와인(wineId)에 대한 shares만 필터링
- 각 멤버의 axisX, axisY, satisfaction으로 ref points 생성
- 자신의 share는 satisfaction 값 유지, 타인은 0으로 처리

### 버블 멤버 평균 점수

- `bubbleMemberAvg`: satisfaction이 있는 shares의 평균 (Math.round)

---

## 9. 페이지 상태별 섹션 구성

| 섹션 | 내 기록 있음 | 내 기록 없음 |
|------|:----------:|:----------:|
| Section 1: 히어로 | ● 표시 | ● 표시 (fallback 아이콘) |
| Section 2: 기본 정보 | ● 표시 | ● 표시 (DB 데이터) |
| Section 2: 적정가+가격분석 | 데이터 따라 | 데이터 따라 |
| Section 2: 산지/품종/특성 | 데이터 따라 | 데이터 따라 |
| Section 2: 서빙/페어링/노트 | 데이터 따라 | 데이터 따라 |
| Section 2: 산지/품종 레벨 뱃지 | 데이터 따라 (axisLevels 매칭 시) | 데이터 따라 |
| Section 3: 나의 기록 헤더 | ● "N회 시음" | ● "아직 기록이 없어요" |
| Section 3: 사분면 | ● 기록 dots (avg/recent 모드) | ✕ 숨김 (버블모드 제외) |
| Section 3: 향 프로필 | ● aroma 데이터 있을 때 | ✕ 숨김 |
| Section 3: 구조 평가 | ● complexity 데이터 있을 때 | ✕ 숨김 |
| Section 4: 기록 히스토리 | ● 카드 리스트 | ○ "아직 기록이 없어요" |
| FabActions | ● 표시 | ✕ 숨김 |

> ● 표시, ○ 빈 상태 UI, ✕ 섹션/요소 자체 숨김

---

## 10. 데이터 소스

### useWineDetail 훅 (application/hooks/use-wine-detail.ts)

| 로딩 순서 | 호출 | 조건 |
|-----------|------|------|
| 1 | `repo.findById(wineId)` | 항상 |
| 2 | `repo.findMyRecords(wineId, userId)` | userId 존재 |
| 3 (병렬) | `repo.findRecordPhotos(recordIds)` | records > 0 |
| 3 (병렬) | `repo.findQuadrantRefs(userId, wineId)` | records > 0 |
| 3 (병렬) | `repo.findLinkedRestaurants(wineId, userId)` | records > 0 |
| 3 (병렬) | `repo.findBubbleScores(wineId, userId)` | records > 0 |
| 3 (대체) | `repo.findBubbleScores(wineId, userId)` | records = 0 |

### 파생값 (hook 내 계산)

| 값 | 계산 |
|----|------|
| `myAvgScore` | records의 satisfaction 산술 평균 |
| `tastingCount` | `myRecords.length` |
| `latestTastingDate` | 첫 번째 record의 visitDate 또는 createdAt |
| `nyamScoreBreakdown` | Vivino + WS + classification → baseScore + prestigeBonus |
| `bubbleAvgScore` | bubbleScores의 avgScore 평균 |
| `bubbleCount` | `bubbleScores.length` |
| `viewMode` | records > 0 → 'my_records' / bubbleScores > 0 → 'bubble_review' / 'recommend' |

### Supabase 쿼리 (infrastructure/repositories/supabase-wine-repository.ts)

| 메서드 | 테이블 | 주요 조건 |
|--------|--------|----------|
| `findById` | wines | `id = ?` |
| `findMyRecords` | records | `target_id = ? AND user_id = ? AND target_type = 'wine'`, ORDER BY visit_date DESC NULLS FIRST |
| `findRecordPhotos` | record_photos | `record_id IN (?)`, ORDER BY order_index ASC → `Map<recordId, photos>` |
| `findQuadrantRefs` | records + wines | user의 다른 와인 기록 (target_id ≠ current), GROUP BY target_id, 평균값, LIMIT 12 |
| `findLinkedRestaurants` | records + restaurants | 와인 기록에 연결된 식당 ID → 식당 정보 조회 |
| `findBubbleScores` | bubble_members + bubbles + bubble_shares + records | 유저 활성 버블 → 해당 와인 shares → 버블별 평균 |

### 컨테이너 내 추가 데이터

| 데이터 | 훅 | 용도 |
|--------|-----|------|
| `isWishlisted` / `toggle` | `useWishlist(userId, wineId, 'wine', recordRepo)` | 찜 토글 |
| `availableBubbles` / `shareToBubbles` | `useShareRecord(userId, activeRecordId)` | 기록 공유 |
| `axisLevels` | `useAxisLevel(userId, [{wine_region}, {wine_variety}])` | 축 레벨 뱃지 (Section 2 인라인) |
| `bubbleInfo` | `useBubbleDetail(bubbleId, userId)` | 버블 모드 헤더 |
| `bubbleFeedShares` | `useBubbleFeed(bubbleId, role, contentType)` | 버블 멤버 사분면 |
| `showToast` | `useToast()` | 알림 메시지 표시 |

---

## 11. 컴포넌트 트리 (구현 가이드)

```
WineDetailPage (src/app/(main)/wines/[id]/page.tsx)
└── WineDetailContainer (src/presentation/containers/wine-detail-container.tsx)
    ├── AppHeader
    ├── BubbleMiniHeader (조건: bubbleId && bubbleInfo)
    │
    ├── HeroCarousel
    │   ├── Photo slides (swipe + drag)
    │   ├── Dot indicator (클릭 → goNext)
    │   ├── PopupWindow (사진 확대)
    │   ├── Share button (Share2)
    │   └── WishlistButton (variant="hero")
    │
    ├── Section: 기본 정보 (padding: 14px 20px 0)
    │   ├── 1행: Wine name + WineTypeChip + Classification/Vivino/RP/WS
    │   ├── 2행: 적정가 + [추가정보] 버튼
    │   ├── 구분선 (1px)
    │   ├── 3행: Country › Region › Sub-region (MapPin 칩) + AxisLevelBadge(산지)
    │   ├── 4행: GrapeVariety pill chips (Grape 아이콘) + AxisLevelBadge(품종)
    │   ├── 5행: Body | Acidity | Sweet | ABV
    │   ├── 6행: Serving temp · Decanting · Drinking window
    │   ├── 7행: Food pairings (UtensilsCrossed)
    │   └── 8행: Tasting notes (italic quote)
    │
    ├── Divider
    │
    ├── Section: 나의 기록 (padding: 16px 20px)
    │   ├── Header (제목 + 시음 메타)
    │   ├── RatingInput (사분면, readOnly, quadrantMode: avg|recent)
    │   │   ├── avg: avgDot + allRecordDots + quadrantRefs
    │   │   ├── recent: focusedDot + otherRecordRefs (onRefLongPress)
    │   │   └── [버블모드] bubbleRefPoints (멤버 dots)
    │   ├── AromaWheel (merged, readOnly) — 조건: hasAromaData
    │   └── WineStructureEval (averaged) — 조건: hasStructureData
    │
    ├── Divider
    │
    ├── Section: 기록 히스토리 (padding: 16px 20px)
    │   ├── 기록 카드[] (photo + date + score + comment + linkedRestaurant)
    │   └── Empty state ("아직 기록이 없어요")
    │
    ├── Spacer (80px)
    │
    ├── DetailFab (variant="wine")
    │   ├── Back (좌하단)
    │   └── Add (우하단)
    │
    ├── FabActions (조건: myRecords > 0)
    │   ├── Edit → /record?...&edit={id}
    │   ├── Share → ShareToBubbleSheet
    │   └── Delete → DeleteConfirmModal
    │
    ├── DeleteConfirmModal
    ├── ShareToBubbleSheet
    └── PriceReviewModal (조건: showPriceReview && wine.priceReview)
```

---

## 12. 관련 파일 맵

| 영역 | 파일 경로 |
|------|----------|
| 라우트 | `src/app/(main)/wines/[id]/page.tsx` |
| 컨테이너 | `src/presentation/containers/wine-detail-container.tsx` |
| 도메인 엔티티 | `src/domain/entities/wine.ts`, `wine-structure.ts`, `aroma.ts` |
| 레포지토리 인터페이스 | `src/domain/repositories/wine-repository.ts` |
| 레포지토리 구현 | `src/infrastructure/repositories/supabase-wine-repository.ts` |
| 비즈니스 훅 | `src/application/hooks/use-wine-detail.ts` |
| DI 컨테이너 | `src/shared/di/container.ts` |
| 공유 컴포넌트 | `src/presentation/components/detail/` (hero-carousel, wine-type-chip, axis-level-badge, detail-fab, wishlist-button 등) |
| 기록 컴포넌트 | `src/presentation/components/record/` (rating-input, aroma-wheel, wine-structure-eval, delete-confirm-modal) |
| 공유 기능 | `src/presentation/components/share/share-to-bubble-sheet.tsx` |
| 버블 컴포넌트 | `src/presentation/components/bubble/bubble-mini-header.tsx` |
| 레이아웃 | `src/presentation/components/layout/` (app-header, fab-actions) |
| AI 와인 정보 API | `src/app/api/wines/detail-ai/route.ts` |
