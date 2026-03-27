# S4-T02: 와인 상세 페이지 — L1~L8

> Route: `/wines/[id]`
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
- S4-T01 완료 (공통 컴포넌트: hero-carousel, score-cards, badge-row, record-timeline, quadrant-display, connected-items, detail-fab)

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

## 생성할 파일 목록 (와인 전용)

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/wine.ts` | domain | Wine 인터페이스 |
| `src/domain/repositories/wine-repository.ts` | domain | WineRepository 인터페이스 |
| `src/infrastructure/repositories/supabase-wine-repository.ts` | infrastructure | Supabase 구현체 |
| `src/application/hooks/use-wine-detail.ts` | application | 상세 데이터 fetch |
| `src/presentation/components/detail/wine-type-chip.tsx` | presentation | 와인 타입 칩 |
| `src/presentation/components/detail/wine-facts-table.tsx` | presentation | L7 팩트 테이블 |
| `src/presentation/components/detail/food-pairing-tags.tsx` | presentation | L5b 페어링 태그 |
| `src/presentation/containers/wine-detail-container.tsx` | presentation | 컨테이너 |
| `src/app/(main)/wines/[id]/page.tsx` | app | 라우팅 |

**공통 컴포넌트 재사용** (S4-T01에서 생성):
- `hero-carousel.tsx` (orientation='vertical' 전달)
- `score-cards.tsx` (accentColor='--accent-wine')
- `bubble-expand-panel.tsx`
- `badge-row.tsx`
- `record-timeline.tsx`
- `quadrant-display.tsx` (축 라벨만 변경)
- `connected-items.tsx` (targetType='restaurant')
- `detail-fab.tsx`

---

## Domain: Wine 엔티티

```typescript
// src/domain/entities/wine.ts
// R1: 외부 의존 0

/** wines.wine_type */
export type WineType = 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'

/** 블렌드 품종 비율 (grape_varieties JSONB 배열 아이템) */
export interface GrapeVariety {
  name: string
  pct: number    // 퍼센트 (0~100)
}

/** critic_scores JSONB */
export interface CriticScores {
  RP?: number   // Robert Parker
  WS?: number   // Wine Spectator
  JR?: number   // Jancis Robinson
  JH?: number   // James Halliday
}

/** external_ids JSONB */
export interface WineExternalIds {
  vivino?: string
  wine_searcher?: string
}

/**
 * wines 테이블 1:1 매핑
 * DATA_MODEL.md §2 wines 테이블
 */
export interface Wine {
  id: string
  name: string
  producer: string | null
  region: string | null
  subRegion: string | null
  country: string | null
  variety: string | null            // 단일 품종
  grapeVarieties: GrapeVariety[]    // 블렌드 비율
  wineType: WineType
  vintage: number | null            // NULL = NV
  abv: number | null                // DECIMAL(3,1)
  labelImageUrl: string | null
  photos: string[]                  // TEXT[]

  // 와인 DB 메타
  bodyLevel: number | null          // 1~5
  acidityLevel: number | null       // 1~3
  sweetnessLevel: number | null     // 1~3
  foodPairings: string[]            // TEXT[] 영문 키
  servingTemp: string | null        // "16-18°C"
  decanting: string | null          // "2시간 권장"

  referencePrice: number | null     // 원
  drinkingWindowStart: number | null // 연도
  drinkingWindowEnd: number | null   // 연도

  // 외부 평점
  vivinoRating: number | null       // 0.0~5.0
  criticScores: CriticScores | null

  // 권위 인증
  classification: string | null     // Grand Cru Classe 등

  // nyam 점수
  nyamScore: number | null          // 0~100
  nyamScoreUpdatedAt: string | null

  // 캐싱
  externalIds: WineExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null

  createdAt: string
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

## Layer 3: 점수 카드 (와인)

공통 `ScoreCards` 컴포넌트 재사용. 차이점:

| 속성 | 식당 | 와인 |
|------|------|------|
| accentColor | `--accent-food` | `--accent-wine` |
| 내 점수 서브 | "N회 방문" / "미방문" | "N회 시음" / "미시음" |
| nyam 서브 | "웹+명성" | "Vivino+WS" |

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

## Layer 5: 내 와인 지도 (사분면)

공통 `QuadrantDisplay` 재사용. 차이점:

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

## Layer 7: 와인 정보 팩트 테이블 (`wine-facts-table.tsx`)

```typescript
interface WineFactsTableProps {
  wine: Wine
}
```

**표시 조건**: DB 데이터이므로 기록 없어도 항상 표시.

**테이블 레이아웃:**
- 2열: `td:first-child` 90px 라벨, `td:last-child` 값
- 라벨: 12px, weight 500, `var(--text-sub)`
- 값: 12px, weight 500, `var(--text)`
- 행 구분선: `1px solid #F0EDE8`

**항목:**

| 항목 | 소스 필드 | 표시 형식 |
|------|----------|----------|
| 품종 | `grapeVarieties` | "Cabernet Sauvignon 75%, Merlot 20%, Petit Verdot 5%" (비율 포함) |
| 산지 | `country` + `region` + `subRegion` | "프랑스 보르도 메독" (있는 필드만 이어붙이기) |
| 알코올 | `abv` | "14.5%" |
| 바디 | `bodyLevel` (1~5) | `●●●●○` Full (dot 레벨 표기) |
| 산미 | `acidityLevel` (1~3) | `●●○` 중간 |
| 당도 | `sweetnessLevel` (1~3) | `●○○` 드라이 |
| 적정 온도 | `servingTemp` | "16-18°C" |
| 디캔팅 | `decanting` | "2시간 권장" |
| 참고 시세 | `referencePrice` | "≈ 80만원" (만원 단위 반올림, 1만 미만은 원 단위) |
| 음용 적기 | `drinkingWindowStart` ~ `drinkingWindowEnd` | "2025-2045" |

**dot 레벨 렌더링:**

```typescript
function renderDotLevel(level: number, max: number): string {
  // level=4, max=5 → '●●●●○'
  return '●'.repeat(level) + '○'.repeat(max - level)
}

function bodyLabel(level: number): string {
  const labels = ['', 'Light', 'Medium-Light', 'Medium', 'Medium-Full', 'Full']
  return labels[level] ?? ''
}

function acidityLabel(level: number): string {
  const labels = ['', '낮음', '중간', '높음']
  return labels[level] ?? ''
}

function sweetnessLabel(level: number): string {
  const labels = ['', '드라이', '오프 드라이', '스위트']
  return labels[level] ?? ''
}
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

```typescript
// src/presentation/containers/wine-detail-container.tsx

import { wineRepo } from '@/shared/di/container'
import { useWineDetail } from '@/application/hooks/use-wine-detail'

export function WineDetailContainer({ id }: { id: string }) {
  // 1. useAuth() → userId
  // 2. useWineDetail(id, userId, wineRepo) → state
  // 3. 레이아웃:
  //    scroll-content (padding-top: 80px)
  //    ├─ HeroCarousel (orientation='vertical')   ← Layer 1
  //    ├─ .detail-info                             ← Layer 2+3+뱃지
  //    │   ├─ DetailInfoHeader (nameColor='--accent-wine')
  //    │   │   ├─ 와인명 (accent-wine)
  //    │   │   ├─ 생산자 · 빈티지 (서브)
  //    │   │   └─ WineTypeChip · 산지 · 품종 (메타행)
  //    │   ├─ ScoreCards (accentColor='--accent-wine')
  //    │   ├─ BubbleExpandPanel
  //    │   └─ BadgeRow (와인 뱃지)
  //    ├─ .section   ← Layer 5 (내 와인 지도) — 리뷰 2+만
  //    ├─ .section   ← Layer 5b (음식 페어링) — 디바이더 없이 연속
  //    ├─ .divider
  //    ├─ .section   ← Layer 6 (나의 기록)
  //    ├─ .divider
  //    ├─ .section   ← Layer 7 (와인 정보 팩트 테이블)
  //    ├─ .divider
  //    ├─ .section   ← Layer 8 (함께한 레스토랑) — 있을 때만
  //    ├─ .divider
  //    ├─ .section   ← Layer 9 (버블 기록 — S4 빈 상태만)
  //    └─ spacer (h-20)
  //    DetailFab
}
```

---

## 뷰 모드별 섹션 가시성

| 섹션 | 내 기록 있음 | 내 기록 없음 |
|------|:----------:|:----------:|
| L1 히어로 | 표시 | 표시 |
| L2 정보 (이름/메타) | 표시 | 표시 |
| L3 점수 카드 | 내 점수 = 실제 값 | 내 점수 = "---" / "미시음" |
| L3 nyam 점수 | 표시 (DB) | 표시 (DB) |
| L3 버블 점수 | 데이터 따라 | 데이터 따라 |
| L4 뱃지 행 | 표시 (DB) | 표시 (DB) |
| L5 사분면 | 와인 리뷰 2건+ | 숨김 |
| L5b 음식 페어링 | 표시 (DB) | 표시 (DB) |
| L6 나의 기록 | 타임라인 | 빈 상태 |
| L7 와인 정보 | 표시 (DB) | 표시 (DB) |
| L8 함께한 레스토랑 | 연결 있을 때만 | 숨김 |
| L9 버블 기록 | S4 빈 상태 | S4 빈 상태 |

---

## 빈 상태

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 점수 카드 | 3슬롯 유지, "---" | 레이아웃 불변 |
| 기록 | `search` 아이콘 + "아직 기록이 없어요" + CTA | padding 40px 20px |
| 사분면 | 섹션 숨김 | 와인 리뷰 2건+ |
| 페어링 | DB 데이터이므로 항상 표시 | --- |
| 와인 정보 | DB 데이터이므로 항상 표시 | --- |
| 식당 연결 | 섹션 숨김 | 기록에 식당 연결 있을 때만 |
| 버블 기록 | `message-circle` + "아직 버블 기록이 없어요" + CTA | S4에서 항상 빈 상태 |

---

## 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 와인 기본정보 | wines.* | 2주 캐시 |
| 라벨 이미지 | wines.label_image_url + wines.photos | 2주 캐시 |
| 팩트 테이블 | wines.body_level/acidity_level/sweetness_level/serving_temp/decanting/reference_price/drinking_window_* | 2주 캐시 |
| 음식 페어링 | wines.food_pairings | 2주 캐시 |
| 내 점수 | records AVG(satisfaction) WHERE target_type='wine' | 실시간 |
| nyam 점수 | wines.nyam_score | 2주 캐시 |
| 버블 점수 | bubble_shares → records 집계 | 실시간 |
| 사분면 | records.axis_x(산미)/axis_y(바디) | 실시간 |
| 기록 타임라인 | records WHERE user_id AND target_id | 실시간 |
| 연결 식당 | records.linked_restaurant_id → restaurants | 실시간 |
| 찜 상태 | wishlists WHERE target_type='wine' | 실시간 |

---

## 라우팅

```
/wines/[id]
  ?from=home | profile | bubble | search | recommend

진입 경로:
  ← 홈 카드 탭
  ← 프로필 최근 기록
  ← 식당 상세 L8 연결 와인 카드 탭
  ← 기록 상세 연결된 와인 탭
  ← 검색 결과

이동 경로:
  → /records/[id] (타임라인 아이템 탭)
  → /restaurants/[id] (L8 연결 식당 카드 탭, L6 식당 연결 링크)
  → 기록 플로우 (FAB+ 탭 — 와인 선택 스킵)
```

---

## 디바이더 규칙

- Layer 5 → 5b: 디바이더 **없이** 연속 (5b padding-top: 0)
- Layer 5b → 6, 6 → 7, 7 → 8, 8 → 9: 모두 8px 디바이더 (`#F0EDE8`)
