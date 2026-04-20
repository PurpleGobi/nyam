# S4-T02: 와인 상세 페이지

> Route: `/wines/[id]?bubble=[bubbleId]`
> 목업: `prototype/02_detail_wine.html`
> SSOT: `pages/03_WINE_DETAIL.md`, `systems/DATA_MODEL.md`, `systems/RATING_ENGINE.md`

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/03_WINE_DETAIL.md` | 전체 | L1~L8 + 빈 상태 + 와인 전용 토큰 |
| `systems/DATA_MODEL.md` | wines, records | 테이블 컬럼, 와인 메타 필드 |
| `systems/RATING_ENGINE.md` | §2 와인 사분면, §4 점 비주얼, §8 와인 심화 | 산미×바디 축, 아로마, 페어링 |
| `prototype/02_detail_wine.html` | 전체 | 비주얼 레퍼런스 |

---

## 선행 조건

- S1 완료 (DB 스키마, Auth, 디자인 토큰)
- S2 완료 (Record domain + infrastructure)
- S4-T01 완료 (공통 컴포넌트: hero-carousel, score-cards, bubble-expand-panel, detail-fab)

---

## 식당 상세와의 차이점 요약

| 요소 | 식당 | 와인 |
|------|------|------|
| 히어로 썸네일 | 가로 160x110px | **세로** 110x160px (라벨) |
| 액센트 컬러 | `--accent-food` (#C17B5E) | `--accent-wine` (#8B7396) |
| 이름 색상 | `var(--text)` | `var(--accent-wine)` |
| L2 메타 | 장르 · 지역 · 가격대 | 생산자 · 빈티지 + 타입칩 · 산지 · 품종 |
| nyam 점수 소스 | N/K/G + 명성 | Vivino + WS + 등급 |
| 사분면 축 | 가격 x 분위기 | 산미 x 바디 |
| L5b | (없음) | 음식 페어링 태그 |
| L7 | 주소/영업/전화/메뉴 | 팩트 테이블 (품종/산지/ABV/바디/산미/당도/온도/디캔팅/시세/음용적기) |
| L8 | 연결 와인 | 함께한 레스토랑 |
| 뱃지 | 미슐랭/블루리본/TV | Grand Cru/Vivino/WS |

---

## 파일 목록 (구현 완료)

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/wine.ts` | domain | Wine 인터페이스 + WINE_TYPE_LABELS + WINE_TYPE_COLORS + PriceReview |
| `src/domain/repositories/wine-repository.ts` | domain | WineRepository 인터페이스 (검색/등록 + 상세) |
| `src/infrastructure/repositories/supabase-wine-repository.ts` | infrastructure | Supabase 구현체 |
| `src/application/hooks/use-wine-detail.ts` | application | 상세 데이터 fetch |
| `src/application/hooks/use-wine-stats.ts` | application | 와인 통계 (프로필 페이지용) |
| `src/presentation/components/detail/wine-type-chip.tsx` | presentation | 와인 타입 칩 |
| `src/presentation/components/detail/wine-facts-table.tsx` | presentation | 팩트 테이블 (현재 미사용 — 인라인으로 대체) |
| `src/presentation/components/detail/food-pairing-tags.tsx` | presentation | 페어링 태그 (현재 미사용 — 인라인으로 대체) |
| `src/presentation/containers/wine-detail-container.tsx` | presentation | 컨테이너 |
| `src/app/(main)/wines/[id]/page.tsx` | app | 라우팅 |

**공통 컴포넌트 재사용** (S4-T01에서 생성):
- `hero-carousel.tsx` (thumbnail 없음, fallbackIcon='wine')
- `score-cards.tsx` (accentColor='--accent-wine', 2슬롯)
- `bubble-expand-panel.tsx`
- `detail-fab.tsx` (variant='wine')

**추가 사용 컴포넌트**:
- `RatingInput` (record 컴포넌트, readOnly 모드로 사분면 표시)
- `AromaWheel` (record 컴포넌트, readOnly 모드로 향 프로필 표시)
- `WineStructureEval` (record 컴포넌트, 품질 평가 표시)
- `FabActions` (layout 컴포넌트, variant='wine')
- `DeleteConfirmModal`, `ShareToBubbleSheet`
- `AxisLevelBadge` (산지/품종 레벨)
- `BubbleMiniHeader` (버블 모드)

---

## Domain: Wine 엔티티

```typescript
// src/domain/entities/wine.ts
// R1: 외부 의존 0

export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'

export interface GrapeVariety {
  name: string
  pct: number    // 퍼센트 (0~100)
}

export interface CriticScores {
  RP?: number   // Robert Parker
  WS?: number   // Wine Spectator
  JR?: number   // Jancis Robinson
  JH?: number   // James Halliday
}

/** 가격 분석 리뷰 (AI 생성) */
export interface PriceReview {
  verdict: 'buy' | 'conditional_buy' | 'avoid'
  summary: string
  alternatives: Array<{ name: string; price: string }>
}

export interface WineExternalIds {
  vivino?: string
  wine_searcher?: string
}

export interface Wine {
  id: string
  name: string
  producer: string | null
  region: string | null
  subRegion: string | null
  appellation: string | null        // ← 추가: AOC/DOC 등
  country: string | null
  variety: string | null
  grapeVarieties: GrapeVariety[]
  wineType: WineType
  vintage: number | null
  abv: number | null
  labelImageUrl: string | null
  photos: string[]

  bodyLevel: number | null          // 1~5
  acidityLevel: number | null       // 1~5 (변경: 1~3 → 1~5)
  sweetnessLevel: number | null     // 1~5 (변경: 1~3 → 1~5)
  foodPairings: string[]
  servingTemp: string | null
  decanting: string | null

  referencePriceMin: number | null  // ← 변경: referencePrice → min/max 범위
  referencePriceMax: number | null
  drinkingWindowStart: number | null
  drinkingWindowEnd: number | null

  vivinoRating: number | null
  criticScores: CriticScores | null
  classification: string | null
  tastingNotes: string | null       // ← 추가: AI 테이스팅 노트
  priceReview: PriceReview | null   // ← 추가: AI 가격 분석

  nyamScore: number | null
  nyamScoreUpdatedAt: string | null
  externalIds: WineExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null
  createdAt: string
}

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: '레드', white: '화이트', rose: '로제', sparkling: '스파클링',
  orange: '오렌지', fortified: '주정강화', dessert: '디저트',
}

export const WINE_TYPE_COLORS: Record<WineType, string> = {
  red: '#8B2252', white: '#C9A96E', rose: '#D4879B', sparkling: '#7A9BAE',
  orange: '#C17B5E', fortified: '#8B7396', dessert: '#B87272',
}
```

---

## Domain: WineRepository 인터페이스

```typescript
// src/domain/repositories/wine-repository.ts
// R1: 외부 의존 0

import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { WineSearchResult } from '@/domain/entities/search'
import type { CreateWineInput } from '@/domain/entities/register'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'

/** 연결된 식당 카드 데이터 */
export interface LinkedRestaurantCard {
  restaurantId: string
  restaurantName: string
  genre: string | null
  photoUrl: string | null
  satisfaction: number | null
}

export interface WineRepository {
  // ─── S3: 검색/등록 ───
  search(query: string, userId: string): Promise<WineSearchResult[]>
  create(input: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }>

  // ─── S4: 상세 페이지 ───

  /** 와인 단건 조회 */
  findById(id: string): Promise<Wine | null>

  /** 와인의 내 기록 목록 (visit_date DESC) */
  findMyRecords(wineId: string, userId: string): Promise<DiningRecord[]>

  /** 기록별 사진 */
  findRecordPhotos(recordIds: string[]): Promise<Map<string, RecordPhoto[]>>

  /** 사분면 표시용: 내가 리뷰한 다른 와인의 평균 좌표 (최대 12개) */
  findQuadrantRefs(userId: string, excludeId: string): Promise<QuadrantRefDot[]>

  /** 연결된 식당 (linked_restaurant_id가 있는 기록의 식당) */
  findLinkedRestaurants(wineId: string, userId: string): Promise<LinkedRestaurantCard[]>

  /** 버블 점수 집계 */
  findBubbleScores(wineId: string, userId: string): Promise<BubbleScoreRow[]>
}
```

---

## Application: use-wine-detail Hook

```typescript
// src/application/hooks/use-wine-detail.ts

import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { LinkedRestaurantCard, WineRepository } from '@/domain/repositories/wine-repository'

export interface WineDetailState {
  wine: Wine | null
  myRecords: DiningRecord[]
  recordPhotos: Map<string, RecordPhoto[]>
  quadrantRefs: QuadrantRefDot[]
  linkedRestaurants: LinkedRestaurantCard[]
  bubbleScores: BubbleScoreRow[]
  isLoading: boolean
  error: string | null

  // 파생값
  myAvgScore: number | null
  tastingCount: number           // 시음 횟수
  latestTastingDate: string | null
  nyamScoreBreakdown: WineNyamScoreBreakdown | null
  bubbleAvgScore: number | null
  bubbleCount: number
  viewMode: 'my_records' | 'recommend' | 'bubble_review'
}

export interface WineNyamScoreBreakdown {
  vivinoRating: number | null
  wsScore: number | null
  classification: string | null
  baseScore: number           // (vivino/5×100 × 60% + ws × 40%) 또는 단일 소스
  prestigeBonus: number       // 등급 보너스
  finalScore: number
}

export function useWineDetail(
  wineId: string,
  userId: string,
  repo: WineRepository,
): WineDetailState {
  // 1. repo.findById → wine
  // 2. repo.findMyRecords → myRecords
  // 3. repo.findRecordPhotos → recordPhotos
  // 4. repo.findQuadrantRefs → quadrantRefs (2개+ 리뷰 시만)
  // 5. repo.findLinkedRestaurants → linkedRestaurants
  // 6. repo.findBubbleScores → bubbleScores
  //
  // viewMode: myRecords.length > 0 ? 'my_records' : bubbleScores.length > 0 ? 'bubble_review' : 'recommend'
}
```

---

## 와인 전용 디자인 토큰

```css
/* 핵심 와인 토큰 */
--accent-wine:       #8B7396;
--accent-wine-light: #F0ECF3;
--accent-wine-dim:   #DDD6E3;
```

---

## 와인 타입 칩 (`wine-type-chip.tsx`)

```typescript
interface WineTypeChipProps {
  wineType: WineType
}
```

**타입별 색상:**

| 타입 | 한글 | 배경 | 텍스트 | 보더 |
|------|------|------|--------|------|
| red | 레드 | `#FAF0F0` | `#B87272` | `#EDDBDB` |
| white | 화이트 | `#FAFAF0` | `#9A8B30` | `#E8E4C8` |
| rose | 로제 | `#FDF5F8` | `#B8879B` | `#EDD8E0` |
| sparkling | 스파클링 | `#F0F5FA` | `#7A9BAE` | `#D6E0E8` |
| orange | 오렌지 | `#FDF5F0` | `#C17B5E` | `#EDDBD0` |
| fortified | 주정강화 | `#F5F0F0` | `#8B6B5E` | `#DDD0C8` |
| dessert | 디저트 | `#FDF8F0` | `#C9A96E` | `#E8E0C8` |

**칩 스타일:**
- padding: `1px 7px`
- border-radius: **4px** (pill이 아닌 각진 형태)
- font-size: 10px, weight 600
- border: 1px solid [보더색]

---

## Layer 2: 정보 (와인 전용)

```typescript
// 식당과 다른 구조: 이름 + 서브 + 메타행

// 이름: 21px, weight 800, var(--accent-wine) ← 식당과 다름 (보라색)
// 서브: 생산자명 · 빈티지 (11px, var(--text-sub))
// 메타행: [WineTypeChip] · 산지 · 품종 (12px)
```

| 요소 | 스타일 |
|------|--------|
| 이름 | 21px, weight 800, `var(--accent-wine)` |
| 서브 | 11px, `var(--text-sub)`, "Chateau Margaux · 2018" |
| 메타행 | WineTypeChip + ` · ` + 산지 + ` · ` + 품종 (12px) |
| 구분자 `·` | 8px, `var(--border-bold)`, margin `0 5px` |

---

## 점수 카드 (와인)

공통 `ScoreCards` 컴포넌트 재사용 (2슬롯). 차이점:

| 속성 | 식당 | 와인 |
|------|------|------|
| accentColor | `--accent-food` | `--accent-wine` |
| 내 점수 서브 | "N회 방문" / "미방문" | "N회 시음" / "미시음" |

> nyam 점수 슬롯은 제거됨 — 외부 점수(Vivino/RP/WS)는 기본정보 1행에 인라인 표시.

---

## 뱃지 행 (와인)

**와인 뱃지 색상:**

| 뱃지 | 배경 | 텍스트 | 보더 |
|------|------|--------|------|
| 등급 (Grand Cru 등) | `var(--accent-wine-light)` | `var(--accent-wine)` | `#DDD6E3` |
| Vivino | `#FBF0F0` | `#9B2335` | `#E8D0D0` |
| Wine Spectator | `#F5F0E8` | `#8B7355` | `#E0D8C8` |

**아이콘:** 등급=`award`, Vivino=`grape`, WS=`trophy`

---

## 사분면 (내 와인 지도)

> **변경**: `QuadrantDisplay` 대신 `RatingInput` readOnly 모드 사용 (record 컴포넌트 재사용).

차이점:

| 속성 | 식당 | 와인 |
|------|------|------|
| X축 | 저렴 ↔ 고가 | 산미 낮음 ↔ 산미 높음 |
| Y축 | 캐주얼 ↔ 포멀 | Light Body ↔ Full Body |
| accentColor | `--accent-food` | `--accent-wine` |
| 현재 dot shadow | `rgba(193,123,94,0.4)` | `rgba(139,115,150,0.4)` |
| 십자선 색상 | `var(--border)` | `var(--accent-wine-dim)` |
| 축 라벨 색상 | `var(--text-sub)` | `var(--accent-wine)` |
| 배경 | `var(--bg-card)` | `var(--accent-wine-light)`, border `var(--accent-wine-dim)` |
| 캡션 | "리뷰한 비슷한 가격대·지역 식당과..." | "내가 리뷰한 와인과의 상대적 위치" |

---

## Layer 5b: 음식 페어링 (`food-pairing-tags.tsx`)

```typescript
interface FoodPairingTagsProps {
  /** 영문 키 배열 */
  pairings: string[]
}
```

| 속성 | 값 |
|------|---|
| 표시 조건 | DB 데이터이므로 기록 없어도 항상 표시 |
| 섹션 헤더 | "음식 페어링" |
| 태그 | pill, padding `5px 12px`, radius 20px |
| 태그 배경 | `var(--accent-wine-light)` |
| 태그 보더 | `#DDD6E3` |
| 태그 텍스트 | `var(--accent-wine)`, 11px, weight 500 |
| 레이아웃 | flex-wrap (여러 줄 가능) |

**영문→한글 매핑 (프론트에서 변환):**

| 영문 키 | 한글 |
|---------|------|
| steak | 스테이크 |
| lamb | 양갈비 |
| cheese | 치즈 |
| dark_chocolate | 다크 초콜릿 |
| seafood | 해산물 |
| pasta | 파스타 |
| mushroom | 버섯 |
| truffle | 트러플 |
| poultry | 가금류 |
| pork | 돼지고기 |
| salad | 샐러드 |
| nuts | 견과류 |
| fruit | 과일 |
| spicy | 매운 음식 |

> 매핑에 없는 키는 원문 그대로 표시.

**Layer 5 → 5b 사이**: 디바이더 없이 연속 (5b의 padding-top: 0)

---

## Layer 6: 나의 기록 타임라인 (와인)

공통 `RecordTimeline` 재사용. 차이점:

| 속성 | 식당 | 와인 |
|------|------|------|
| accentColor | `--accent-food` | `--accent-wine` |
| 세로선 그라디언트 | `--accent-food → #D4A089 → transparent` | `--accent-wine → #C0B3CA → transparent` |
| 섹션 메타 | "방문 N회 · 최근 날짜" | "N회 · 최근 날짜" |
| 추가 정보 | (없음) | `map-pin` 12px + 식당명 (11px, `var(--text-sub)`, 탭→`/restaurants/[id]`) |

**와인 상황 태그 칩 색상:**

| 태그 | 색상 |
|------|------|
| 혼술 | `#7A9BAE` |
| 데이트 | `#B8879B` |
| 페어링 | `#C9A96E` |
| 모임 | `#7EAE8B` |
| 선물 | `#8B7396` |
| 시음 | `#B87272` |
| 디캔팅 | `#A0896C` |

---

## 와인 정보 표시 (인라인)

> **변경**: `wine-facts-table.tsx` 컴포넌트는 존재하지만 현재 **미사용**.
> 모든 와인 정보가 기본정보 섹션 내 인라인으로 표시됨.

**표시 위치**: 기본정보 section 내 5~7행

**표시 형식:**

| 항목 | 행 | 표시 형식 |
|------|---|----------|
| Body/Acidity/Sweetness/ABV | 5행 | `Medium+ Body | 높음 Acid | Off-dry | ABV 14.5%` (파이프 구분) |
| 서빙온도/디캔팅/음용시기 | 6행 | 아이콘(Thermometer/GlassWater/CalendarRange) + 텍스트, `·` 구분 |
| 푸드페어링 | 7행 | UtensilsCrossed 아이콘 + 쉼표 구분 텍스트 |
| 적정가 | 우측 상단 | `적정가 N만원~M만원` (min/max 범위) + [추가정보] 버튼 |
| 품종 | 4행 | 개별 pill 칩 (Grape 아이콘 + 이름 + 비율%) |
| 산지 | 3행 | Country › Region › Sub-region/Appellation cascade |

**가격 포맷 함수:**
```typescript
function formatPrice(price: number): string {
  if (price >= 10000) return `${Math.round(price / 10000)}만원`
  return `${price.toLocaleString()}원`
}
```

**레벨 라벨 (실제 구현):**

> **변경**: dot 레벨(●●●○○) 대신 텍스트 라벨로 인라인 표시.
> acidityLevel/sweetnessLevel이 1~3에서 **1~5**로 확장됨.

```typescript
const BODY_LABELS: Record<number, string> = {
  1: 'Light', 2: 'Medium-', 3: 'Medium', 4: 'Medium+', 5: 'Full'
}
const ACIDITY_LABELS: Record<number, string> = {
  1: '낮음', 2: '약간 낮음', 3: '보통', 4: '높음', 5: '매우 높음'
}
const SWEETNESS_LABELS: Record<number, string> = {
  1: 'Dry', 2: 'Off-dry', 3: 'Medium', 4: 'Sweet', 5: 'Luscious'
}
// 표시 형태: "Medium+ Body | 높음 Acid | Off-dry | ABV 14.5%"
```

**값이 null인 항목**: 행 자체를 숨김 (빈 줄 표시하지 않음).

---

## Layer 8: 함께한 레스토랑

공통 `ConnectedItems` 재사용. 차이점:

| 속성 | 식당→와인 | 와인→식당 |
|------|----------|----------|
| targetType | `'wine'` | `'restaurant'` |
| 카드 배경 | `var(--accent-wine-light)` | `var(--bg-card)` |
| 카드 보더 | `#DDD6E3` | `var(--border)` |
| 이미지 높이 | 56px (와인 라벨) | 60px (식당 사진) |
| 이름 색상 | `var(--accent-wine)` | `var(--text)`, 11px bold |
| 점수 색상 | `var(--accent-wine)` | `var(--accent-food)`, 11px bold |
| 보조 텍스트 | (없음) | 장르 11px |
| 탭 | → `/wines/[id]` | → `/restaurants/[id]` |

**표시 조건**: 와인 기록에 `linked_restaurant_id`가 있는 경우만. 없으면 섹션 숨김.

---

## 컨테이너: `wine-detail-container.tsx`

> **주요 변경**: 초기 설계의 L1~L8 순차 레이아웃에서 크게 변경됨.
> 와인 정보, 향 프로필, 품질 평가가 "나의 기록" 섹션 내부에 통합.
> 기록 히스토리가 별도 섹션으로 분리 (카드 형태).

```typescript
// src/presentation/containers/wine-detail-container.tsx

interface WineDetailContainerProps {
  wineId: string
  bubbleId: string | null   // 버블 모드 (URL ?bubble= 파라미터)
}

export function WineDetailContainer({ wineId, bubbleId }: WineDetailContainerProps) {
  // 사용하는 hooks:
  // - useAuth() → user
  // - useWineDetail(wineId, userId, wineRepo) → state
  // - useWishlist(userId, wineId, 'wine', recordRepo) → isWishlisted, toggle
  // - useAxisLevel(userId, [{axisType:'wine_region'}, {axisType:'wine_variety'}]) → axisLevels
  // - useShareRecord(userId, activeRecordId) → availableBubbles, shareToBubbles
  // - useBubbleDetail(bubbleId, userId) → bubbleInfo (버블 모드)
  // - useBubbleFeed(bubbleId, ...) → 버블 멤버 공유 (버블 모드)
  //
  // 로컬 상태:
  // - quadrantMode: 'avg' | 'recent'
  // - focusedRecordIdx, showDeleteConfirm, showShareSheet, showPriceReview
  //
  // 파생 계산:
  // - mergedAroma: 모든 기록의 향 union (primary/secondary/tertiary)
  // - mergedStructure: 모든 기록의 품질 평가 평균 (balance/finish/intensity/complexity)
  //
  // 레이아웃:
  //    AppHeader
  //    [BubbleMiniHeader — 버블 모드]
  //    HeroCarousel (사진 / 찜 / 공유)
  //    ├─ 기본정보 section (padding 14px 20px 0)
  //    │   ├─ 1행: 와인명 + WineTypeChip + classification/Vivino/RP/WS 외부점수
  //    │   ├─ 2행: 빈티지 + 생산자
  //    │   ├─ 적정가 (referencePriceMin~Max) + [추가정보] 버튼 → 가격 분석 팝업
  //    │   ├─ 구분선
  //    │   ├─ 3행: Country › Region › Sub-region/Appellation + AxisLevelBadge
  //    │   ├─ 4행: 품종 칩(Grape 아이콘 + 이름 + 비율%) + AxisLevelBadge
  //    │   ├─ 5행: Body | Acidity | Sweet | ABV (인라인 텍스트)
  //    │   ├─ 6행: 서빙온도 · 디캔팅 · 음용시기 (아이콘 포함)
  //    │   ├─ 7행: 푸드페어링 (UtensilsCrossed 아이콘 + 텍스트)
  //    │   └─ 8행: 테이스팅 노트 (italic, 따옴표)
  //    ├─ ScoreCards (2슬롯) + BubbleExpandPanel
  //    ├─ Divider
  //    ├─ 나의 기록 section
  //    │   ├─ 사분면 (RatingInput readOnly, avg/recent 모드)
  //    │   ├─ 향 프로필 (AromaWheel readOnly, 누적 데이터)
  //    │   └─ 품질 평가 (WineStructureEval, 평균 데이터)
  //    ├─ Divider
  //    ├─ 기록 히스토리 section (카드 리스트)
  //    │   └─ 각 기록: 날짜 + 점수 + 코멘트 + 식당 연결 + 사진
  //    └─ spacer (80px)
  //    DetailFab (variant='wine')
  //    FabActions (variant='wine', 수정/공유/삭제)
  //    DeleteConfirmModal
  //    ShareToBubbleSheet
  //    [가격 분석 팝업 — showPriceReview]
}
```

**가격 분석 팝업:**
- `wine.priceReview` 존재 시 [추가정보] 버튼으로 열림
- verdict 뱃지: buy(초록), conditional_buy(주황), avoid(빨강)
- 분석 요약 텍스트
- 같은 가격대 대안 와인 리스트

**참고: 초기 설계 대비 주요 변경사항:**
- L7 팩트 테이블 → 기본정보 섹션 내 인라인으로 통합 (별도 섹션 아님)
- L5b 음식 페어링 → 기본정보 섹션 내 인라인으로 통합
- L6 타임라인 → "기록 히스토리" 카드 리스트로 변경 (RecordTimeline 미사용)
- L8 함께한 레스토랑 → 기록 히스토리 카드 내 식당 연결 표시로 대체
- L9 버블 기록 → 제거됨 (BubbleRecordSection 미사용)
- BadgeRow → 제거됨 (classification, Vivino, WS가 기본정보 행에 통합)
- 뱃지 행 → 기본정보 1행에 classification/Vivino/RP/WS 인라인 표시
- 향 프로필(AromaWheel) + 품질 평가(WineStructureEval) → "나의 기록" 섹션에 통합
- 가격 분석(PriceReview) 팝업 추가
- 테이스팅 노트(tastingNotes) 기본정보에 추가

---

## 뷰 모드별 섹션 가시성

| 섹션 | 내 기록 있음 | 내 기록 없음 |
|------|:----------:|:----------:|
| 히어로 | 표시 | 표시 |
| 기본정보 (이름/외부평점/산지/품종/스펙) | 표시 | 표시 |
| 적정가 + 가격분석 | 표시 (DB) | 표시 (DB) |
| 테이스팅 노트 | 표시 (DB) | 표시 (DB) |
| 점수 카드 (2슬롯) | 내 점수 = 실제 값 | "—" / "미시음" |
| 버블 확장 패널 | 데이터 따라 | 데이터 따라 |
| 나의 기록: 사분면 | 기록 있을 때 | 숨김 |
| 나의 기록: 향 프로필 | aromaData 있을 때 | 숨김 |
| 나의 기록: 품질 평가 | structureData 있을 때 | 숨김 |
| 기록 히스토리 | 카드 리스트 | "아직 기록이 없어요" |

---

## 빈 상태

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 점수 카드 | 2슬롯 유지, "—" 표시 | 레이아웃 불변 |
| 기본정보 | DB 데이터이므로 항상 표시 | null 필드는 해당 행 숨김 |
| 나의 기록 | 사분면/향/품질 모두 숨김 | 기록 없으면 전체 숨김 |
| 기록 히스토리 | "아직 기록이 없어요" 텍스트 | 중앙 정렬 안내 |

---

## 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 와인 기본정보 | wines.* | 2주 캐시 |
| 라벨 이미지 | wines.label_image_url + wines.photos | 2주 캐시 |
| 와인 스펙 | wines.body_level/acidity_level/sweetness_level/serving_temp/decanting/reference_price_min/reference_price_max/drinking_window_* | 2주 캐시 |
| 음식 페어링 | wines.food_pairings | 2주 캐시 |
| 내 점수 | records AVG(satisfaction) WHERE target_type='wine' | 실시간 |
| nyam 점수 | wines.nyam_score | 2주 캐시 |
| 버블 점수 | bubble_shares → records 집계 | 실시간 |
| 사분면 | records.axis_x(산미)/axis_y(바디) | 실시간 |
| 기록 타임라인 | records WHERE user_id AND target_id | 실시간 |
| 연결 식당 | records.linked_restaurant_id → restaurants | 실시간 |
| 찜 상태 | lists WHERE target_type='wine' AND status='wishlist' | 실시간 |

---

## 라우팅

```typescript
// src/app/(main)/wines/[id]/page.tsx

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bubble?: string }>
}

export default async function WineDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <WineDetailContainer wineId={id} bubbleId={bubble ?? null} />
}
```

```
/wines/[id]
  ?bubble=[bubbleId]  ← 버블 모드 진입

진입 경로:
  ← 홈 카드 탭
  ← 프로필 최근 기록
  ← 식당 상세 연결 와인 카드 탭
  ← 기록 상세 연결된 와인 탭
  ← 검색 결과
  ← 버블 상세 (?bubble= 파라미터 포함)

이동 경로:
  → 기록 플로우 (기록 히스토리 카드 탭 → 수정 모드)
  → 기록 플로우 (FAB+ 탭 — 와인 선택 스킵)
```

---

## 디바이더 규칙

- Layer 5 → 5b: 디바이더 **없이** 연속 (5b padding-top: 0)
- Layer 5b → 6, 6 → 7, 7 → 8, 8 → 9: 모두 8px 디바이더 (`#F0EDE8`)
