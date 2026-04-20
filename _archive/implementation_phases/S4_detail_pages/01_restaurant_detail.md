# S4-T01: 식당 상세 페이지

> Route: `/restaurants/[id]?bubble=[bubbleId]`
> 목업: `prototype/02_detail_restaurant.html`
> SSOT: `pages/02_RESTAURANT_DETAIL.md`, `systems/DATA_MODEL.md`, `systems/RATING_ENGINE.md`, `systems/DESIGN_SYSTEM.md`

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/02_RESTAURANT_DETAIL.md` | 전체 | 식당 상세 스펙 |
| `systems/DATA_MODEL.md` | restaurants, records, lists, record_photos | 테이블 컬럼, FK 관계 |
| `systems/RATING_ENGINE.md` | §2 사분면 축, §4 점 비주얼, §6 배경 레퍼런스, §7 상황 태그 | 사분면 + dot 크기/색상 |
| `systems/DESIGN_SYSTEM.md` | 만족도 게이지, 씬 태그 색상 | CSS 토큰 |
| `prototype/02_detail_restaurant.html` | 전체 | 비주얼 레퍼런스 |

---

## 선행 조건

- S1 완료 (DB 스키마, Auth, 디자인 토큰)
- S2 완료 (Record domain + infrastructure)
- `Restaurant` 엔티티 (`src/domain/entities/restaurant.ts`) 존재
- `RestaurantRepository` 인터페이스 (`src/domain/repositories/restaurant-repository.ts`) 존재

---

## 파일 목록 (구현 완료)

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/restaurant.ts` | domain | Restaurant 인터페이스 + GENRE_MAJOR_CATEGORIES + ALL_GENRES |
| `src/domain/repositories/restaurant-repository.ts` | domain | RestaurantRepository 인터페이스 (검색/등록 + 상세 페이지 메서드) |
| `src/infrastructure/repositories/supabase-restaurant-repository.ts` | infrastructure | Supabase 구현체 |
| `src/application/hooks/use-restaurant-detail.ts` | application | 상세 데이터 fetch + 파생 상태 |
| `src/application/hooks/use-restaurant-stats.ts` | application | 식당 통계 (프로필 페이지용) |
| `src/presentation/components/detail/hero-carousel.tsx` | presentation | 히어로 캐러셀 (식당/와인 공통) — 썸네일 없음 |
| `src/presentation/components/detail/score-cards.tsx` | presentation | 점수 카드 2슬롯 (내점수 + 버블) — nyam 점수 슬롯 제거됨 |
| `src/presentation/components/detail/bubble-expand-panel.tsx` | presentation | 버블 확장 패널 (공통) |
| `src/presentation/components/detail/badge-row.tsx` | presentation | 뱃지 행 (공통) |
| `src/presentation/components/detail/record-timeline.tsx` | presentation | 기록 타임라인 (공통) |
| `src/presentation/components/detail/axis-level-badge.tsx` | presentation | 축 레벨 뱃지 (지역/장르 레벨 표시) |
| `src/presentation/components/detail/bubble-record-section.tsx` | presentation | 버블 기록 섹션 |
| `src/presentation/components/detail/bubble-record-card.tsx` | presentation | 버블 기록 카드 |
| `src/presentation/components/detail/bubble-filter-chips.tsx` | presentation | 버블 필터 칩 |
| `src/presentation/components/detail/restaurant-info.tsx` | presentation | 실용 정보 (식당 전용) |
| `src/presentation/components/detail/connected-items.tsx` | presentation | 연결 아이템 가로 스크롤 (공통) |
| `src/presentation/components/detail/detail-fab.tsx` | presentation | FAB 2개 (뒤로 + 추가) — variant prop 포함 |
| `src/presentation/components/layout/fab-actions.tsx` | presentation | 수정/삭제/공유 액션 FAB |
| `src/presentation/components/share/share-to-bubble-sheet.tsx` | presentation | 버블 공유 바텀시트 |
| `src/presentation/containers/restaurant-detail-container.tsx` | presentation | 컨테이너 (hook 조합 + 레이아웃) |
| `src/app/(main)/restaurants/[id]/page.tsx` | app | 라우팅 전용 |

**참고**: `quadrant-display.tsx` 는 사용하지 않음. 사분면은 `RatingInput` 컴포넌트를 `readOnly` 모드로 재사용.

---

## Domain: Restaurant 엔티티

```typescript
// src/domain/entities/restaurant.ts
// R1: 외부 의존 0

/** restaurants.genre CHECK 값 (16개, 6대분류) */
export type RestaurantGenre =
  | '한식' | '일식' | '중식'           // 동아시아
  | '태국' | '베트남' | '인도'         // 동남아/남아시아
  | '이탈리안' | '프렌치' | '스페인' | '지중해'  // 유럽
  | '미국' | '멕시칸'                  // 아메리카
  | '카페' | '바/주점' | '베이커리'     // 음료/디저트
  | '기타'                             // 기타

/** restaurants.price_range: 1~3 */
export type PriceRange = 1 | 2 | 3

/** 영업시간 JSONB */
export interface BusinessHours {
  mon?: string
  tue?: string
  wed?: string
  thu?: string
  fri?: string
  sat?: string
  sun?: string
}

/** 대표 메뉴 JSONB 배열 아이템 */
export interface MenuItem {
  name: string
  price: number
}

/** TV 출연 JSONB 배열 아이템 */
export interface MediaAppearance {
  show: string
  season?: string
  year?: number
}

/** external_ids JSONB */
export interface RestaurantExternalIds {
  kakao?: string
  naver?: string
  google?: string
}

/**
 * restaurants 테이블 1:1 매핑
 * DATA_MODEL.md §2 restaurants 테이블
 */
export interface Restaurant {
  id: string
  name: string
  address: string | null
  country: string           // NOT NULL DEFAULT '한국'
  city: string              // NOT NULL DEFAULT '서울'
  area: string[] | null     // 생활권 동네명 (배열)
  district: string | null   // 구
  genre: RestaurantGenre | null
  priceRange: PriceRange | null
  lat: number | null
  lng: number | null
  phone: string | null
  hours: BusinessHours | null
  photos: string[] | null   // TEXT[] (nullable)
  menus: MenuItem[] | null  // JSONB (nullable)

  // 외부 평점
  naverRating: number | null    // DECIMAL(2,1)
  kakaoRating: number | null
  googleRating: number | null

  // 권위 인증
  michelinStars: number | null  // NULL or 1,2,3
  hasBlueRibbon: boolean
  mediaAppearances: MediaAppearance[] | null  // JSONB (nullable)

  // nyam 종합 점수
  nyamScore: number | null      // 0~100, DECIMAL(4,1)
  nyamScoreUpdatedAt: string | null

  // 캐싱
  externalIds: RestaurantExternalIds | null
  cachedAt: string | null
  nextRefreshAt: string | null

  createdAt: string
}
```

---

## Domain: RestaurantRepository 인터페이스

```typescript
// src/domain/repositories/restaurant-repository.ts
// R1: 외부 의존 0

import type { Restaurant } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

export interface RestaurantRepository {
  // ─── S3: 검색/등록 ───
  search(query: string, userId: string): Promise<RestaurantSearchResult[]>
  findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]>
  create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }>

  // ─── S4: 상세 페이지 ───

  /** 식당 단건 조회 */
  findById(id: string): Promise<Restaurant | null>

  /** 식당의 내 기록 목록 (visit_date DESC) */
  findMyRecords(restaurantId: string, userId: string): Promise<DiningRecord[]>

  /** 기록별 사진 (order_index ASC) */
  findRecordPhotos(recordIds: string[]): Promise<Map<string, RecordPhoto[]>>

  /** 사분면 표시용: 내가 리뷰한 다른 식당들의 평균 좌표 (최대 12개) */
  findQuadrantRefs(userId: string, excludeId: string): Promise<QuadrantRefDot[]>

  /** 연결된 와인 목록 (linked_wine_id가 있는 기록의 와인) */
  findLinkedWines(restaurantId: string, userId: string): Promise<LinkedWineCard[]>

  /** 버블 점수 집계 (유저가 속한 버블에서 이 식당의 평균점) */
  findBubbleScores(restaurantId: string, userId: string): Promise<BubbleScoreRow[]>
}

/** 사분면 참조 점 */
export interface QuadrantRefDot {
  targetId: string
  targetName: string
  avgAxisX: number      // 0~100
  avgAxisY: number      // 0~100
  avgSatisfaction: number // 1~100
}

/** 연결된 와인 카드 데이터 */
export interface LinkedWineCard {
  wineId: string
  wineName: string
  wineType: string | null   // 'red' | 'white' | ... (미분류 시 null)
  labelImageUrl: string | null
  satisfaction: number | null
}

/** 버블 점수 행 */
export interface BubbleScoreRow {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null   // lucide 아이콘명 (미설정 시 null)
  bubbleColor: string | null  // 테마색 hex (미설정 시 null)
  memberCount: number         // 평가 참여 멤버 수
  avgScore: number | null     // 평균 점수 (평가 없으면 null)
}
```

---

## Application: use-restaurant-detail Hook

```typescript
// src/application/hooks/use-restaurant-detail.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.
'use client'

import { useState, useEffect } from 'react'
import type { Restaurant } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type {
  RestaurantRepository,
  QuadrantRefDot,
  LinkedWineCard,
  BubbleScoreRow,
} from '@/domain/repositories/restaurant-repository'

export type RestaurantViewMode = 'my_records' | 'recommend' | 'bubble_review'

/** Hook 반환값 */
export interface RestaurantDetailState {
  restaurant: Restaurant | null
  myRecords: DiningRecord[]
  recordPhotos: Map<string, RecordPhoto[]>
  quadrantRefs: QuadrantRefDot[]
  linkedWines: LinkedWineCard[]
  bubbleScores: BubbleScoreRow[]
  isLoading: boolean
  error: string | null

  // 파생값
  myAvgScore: number | null           // 내 기록 평균 만족도
  visitCount: number                   // 방문 횟수
  latestVisitDate: string | null       // 최근 방문일
  bubbleAvgScore: number | null        // 버블 전체 평균
  bubbleCount: number                  // 참여 버블 수
  viewMode: RestaurantViewMode
}

// ※ nyamScoreBreakdown은 제거됨 — nyam 점수는 DB 저장값 사용

export function useRestaurantDetail(
  restaurantId: string,
  userId: string | null,   // 비로그인 시 null → 식당 기본 정보만 표시
  repo: RestaurantRepository,
): RestaurantDetailState {
  // 구현:
  // 1. repo.findById(restaurantId) → restaurant
  // 2. userId 없으면 여기서 리턴 (기본 정보만)
  // 3. Promise.allSettled로 병렬 실행:
  //    - repo.findMyRecords(restaurantId, userId) → myRecords
  //    - repo.findBubbleScores(restaurantId, userId) → bubbleScores
  // 4. myRecords 있을 때만 병렬:
  //    - repo.findRecordPhotos(recordIds) → recordPhotos
  //    - repo.findQuadrantRefs(userId, restaurantId) → quadrantRefs
  //    - repo.findLinkedWines(restaurantId, userId) → linkedWines
  //
  // 파생값 계산:
  // - myAvgScore: scoredRecords(satisfaction !== null)의 평균 (Math.round)
  // - visitCount: myRecords.length
  // - latestVisitDate: myRecords[0].visitDate ?? createdAt
  // - bubbleAvgScore: scoredBubbles(avgScore !== null)의 평균
  // - bubbleCount: bubbleScores.length
  // - viewMode: myRecords.length > 0 ? 'my_records' : bubbleScores.length > 0 ? 'bubble_review' : 'recommend'
}
```

### nyam 점수 산출 로직 (순수 함수, domain/services/)

> **참고**: `use-restaurant-detail` hook에서는 nyamScoreBreakdown을 계산하지 않음.
> nyam 점수는 DB의 `restaurants.nyam_score` 값을 그대로 사용.
> `calcNyamScore`는 `domain/services/nyam-score.ts`에 순수 함수로 존재하며, DB 갱신 시 서버에서 사용.

```typescript
// src/domain/services/nyam-score.ts
// R1: 외부 의존 0

/**
 * nyam 점수 산출
 * 공식: (Naver×40% + Kakao×30% + Google×30%) × 20 → webScore
 *        미슐랭 +8, 블루리본 +5, TV +3 (상한 15) → prestigeBonus
 *        최종 = webScore × 0.82 + prestigeBonus × 1.15
 *
 * N/K/G 평점은 5.0 만점 → 100점 환산: rating / 5.0 × 100
 */
export function calcNyamScore(r: Restaurant): NyamScoreBreakdown | null {
  const n = r.naverRating
  const k = r.kakaoRating
  const g = r.googleRating

  // 외부 평점 하나도 없으면 산출 불가
  if (n === null && k === null && g === null) return null

  // 가중 평균 (5.0 만점 기준)
  let totalWeight = 0
  let weightedSum = 0
  if (n !== null) { weightedSum += n * 0.4; totalWeight += 0.4 }
  if (k !== null) { weightedSum += k * 0.3; totalWeight += 0.3 }
  if (g !== null) { weightedSum += g * 0.3; totalWeight += 0.3 }
  const webAvg = weightedSum / totalWeight  // 5.0 만점 기준 평균

  // 100점 환산: (webAvg / 5.0) × 100 → 0~100
  const webScore = (webAvg / 5.0) * 100

  // 명성 보너스
  let prestige = 0
  if (r.michelinStars && r.michelinStars >= 1) prestige += 8
  if (r.hasBlueRibbon) prestige += 5
  if (r.mediaAppearances && r.mediaAppearances.length > 0) prestige += 3
  const prestigeBonus = Math.min(prestige, 15)

  // 최종 점수
  const finalScore = Math.round(webScore * 0.82 + prestigeBonus * 1.15)

  return {
    naverRating: n,
    kakaoRating: k,
    googleRating: g,
    webAvg,
    webScore,
    prestigeBonus,
    finalScore: Math.min(finalScore, 100),
  }
}
```

---

## Layer별 컴포넌트 상세

### Layer 1: 히어로 캐러셀 (`hero-carousel.tsx`)

```typescript
// src/presentation/components/detail/hero-carousel.tsx
// R4: Supabase/infrastructure import 금지

interface HeroCarouselProps {
  /** 사진 URL 배열 */
  photos: string[]
  /** 사진 없을 때 fallback 아이콘 */
  fallbackIcon: 'restaurant' | 'wine'
  /** 좋아요 상태 */
  isWishlisted: boolean
  /** 좋아요 토글 콜백 */
  onWishlistToggle: () => void
  /** 공유 콜백 */
  onShare: () => void
}
```

> **참고**: 초기 설계의 히어로 썸네일(HeroThumbnailData)은 구현에서 제거됨.
> thumbnail/orientation prop 없음. 사진 클릭 시 팝업(전체화면) 기능으로 대체.

**스펙:**

| 속성 | 값 |
|------|---|
| 높이 | `h-56` (224px) |
| 사진 없음 | `var(--bg-elevated)` + fallbackIcon (28px, `--text-hint`) |
| 스와이프 | 좌우 터치/마우스 드래그 |
| dot indicator | 일반/활성 구분, 하단 중앙 |
| 사진 탭 | 풀스크린 팝업 |

**좋아요/공유 버튼:**

| 속성 | 값 |
|------|---|
| 위치 | 캐러셀 우하단 |
| 좋아요 활성 | `#FF6038` (brand) |
| 아이콘 | `heart` (20px), `share-2` (20px) |

---

### Layer 2: 정보 (`detail-info` 컨테이너 상단)

**컨테이너**: `.detail-info`, padding `0 20px` (Layer 2 + 3 + 뱃지 통합)

```typescript
interface DetailInfoHeaderProps {
  name: string
  /** 식당: '--text', 와인: '--accent-wine' */
  nameColor: string
  /** 식당: '장르 · 지역 · ₩₩₩', 와인: '생산자 · 빈티지' */
  metaText: string
  /** 와인 전용: 서브 행 (타입칩 + 산지 + 품종) */
  subMeta?: React.ReactNode
}
```

| 요소 | 스타일 |
|------|--------|
| 이름 | 21px, weight 800, `var(--text)` (식당) |
| 메타 | 12px, `var(--text-sub)`, 한 줄 |
| 가격대 | 12px, weight 700, `var(--text)` (강조) |
| 구분자 `·` | 8px, `var(--border-bold)`, margin `0 5px` |
| 패딩 | `14px 0 8px` |

---

### 점수 카드 (`score-cards.tsx`)

> **변경사항**: 초기 설계의 3슬롯(내점수/nyam/버블)에서 **2슬롯(내점수 + 버블)**로 변경됨.
> nyam 점수 슬롯은 제거되었으며, nyamScore/nyamSubText/bubbleCount prop 없음.

```typescript
interface ScoreCardsProps {
  /** 식당: '--accent-food', 와인: '--accent-wine' */
  accentColor: string
  myScore: number | null
  mySubText: string          // '3회 방문' | '미방문' | '2회 시음' | '미시음'
  bubbleScore: number | null
  bubbleSubText: string      // '리뷰 N개' | ''
  onBubbleCardTap: () => void
  isBubbleExpanded: boolean
}
```

**카드 공통 스타일:**

```
flex: 1 (균등 분할)
display: flex, gap: 8px → 2px
padding: 0 20px 10px
```

**버블 모드 동작:**
- 버블 모드(`bubbleId != null`) 시 카드 의미가 반전됨:
  - 좌측 카드 = 버블 평균 점수 / "버블 평균 · N명"
  - 우측 카드 = 내 점수 / "나 · N회"
- 일반 모드:
  - 좌측 카드 = 내 점수 / "N회 방문" or "미방문"
  - 우측 카드 = 버블 점수 / "리뷰 N개"

---

### Layer 3b: 버블 확장 패널 (`bubble-expand-panel.tsx`)

```typescript
interface BubbleExpandPanelProps {
  isOpen: boolean
  scores: BubbleScoreRow[]
  accentColor: string   // '--accent-food' | '--accent-wine'
}
```

| 속성 | 값 |
|------|---|
| 트랜지션 | `max-height 0.25s ease` |
| 열림 | `max-height: 200px` |
| 닫힘 | `max-height: 0; overflow: hidden` |
| 컨테이너 | `padding: 0 0 10px`, flex column, gap 6px |

**각 버블 점수 행:**

```
[아이콘 24px] [버블명 + N명 평가] [점수 16px bold]
```

| 요소 | 스타일 |
|------|--------|
| 아이콘 | 24px 정사각, radius 6px, 버블 테마색 light 배경, 아이콘 12px |
| 버블명 | 12px, weight 500, `var(--text)` |
| 평가 수 | 10px, `var(--text-hint)` |
| 점수 | 16px, weight 800, `var(--accent-food)` |
| 행 | flex, align-center, gap 8px, `var(--bg-card)`, border, radius 8px, padding `6px 10px` |

---

### 뱃지 행 (`badge-row.tsx`)

```typescript
interface BadgeRowProps {
  badges: BadgeItem[]
}

interface BadgeItem {
  type: 'michelin' | 'blue_ribbon' | 'tv' | 'wine_class' | 'vivino' | 'wine_spectator'
  label: string           // '미슐랭 1스타', '블루리본', '흑백요리사'
  icon: string            // lucide 아이콘명: 'star', 'award', 'tv'
}
```

**식당 뱃지 색상:**

| 뱃지 | 배경 | 텍스트 | 보더 |
|------|------|--------|------|
| 미슐랭 | `#FDF6EC` | `#B8860B` | `#E8DDCA` |
| 블루리본 | `#EDF2FB` | `#4A6FA5` | `#D0DCF0` |
| TV | `#FFF3F0` | `var(--brand)` | `#F0D8D0` |

**공통:**
- pill: padding `3px 9px`, radius 20px, font 10px weight 600, 아이콘 10px
- 컨테이너: flex, gap 5px, flex-wrap, padding `0 0 10px`
- 없으면 렌더링하지 않음

---

### Layer 5: 나의 기록 타임라인 (`record-timeline.tsx`)

```typescript
interface RecordTimelineProps {
  records: DiningRecord[]
  recordPhotos: Map<string, RecordPhoto[]>
  /** 식당: '--accent-food', 와인: '--accent-wine' */
  accentColor: string
  /** 섹션 헤더 */
  sectionTitle: string        // '나의 기록'
  sectionMeta: string         // '방문 3회 · 2026.03.15'
  /** 빈 상태 메시지 */
  emptyIcon: string           // 'search'
  emptyTitle: string          // '아직 방문 기록이 없어요'
  emptyDescription: string    // '우하단 + 버튼으로 첫 기록을 남겨보세요'
  /** 기록 탭 콜백 */
  onRecordTap: (recordId: string) => void
}
```

**타임라인 구조:**

| 요소 | 스타일 |
|------|--------|
| 세로선 | `left: 6px`, width 2px, `linear-gradient(to bottom, var(--accent-food), #D4A089, transparent)` |
| dot | 12px 원, `border: 2px solid var(--bg)` + `box-shadow: 0 0 0 2px [색상]` 외부 링 |
| dot 색상 | 상황태그 색상 또는 `var(--accent-food)` (기본값) |
| 날짜 | 11px, `var(--text-sub)`, flex row gap 6px |
| 상황 칩 | padding `2px 8px`, radius 20px, 10px weight 600, 흰색 텍스트, 상황별 배경색 |
| 점수 | 13px, weight 700, dot과 동일 색상 |
| 한줄평 | 12px, `var(--text-sub)`, inline |
| 사진 썸네일 | 44x44px, radius 6px, gap 6px |
| 아이템 간격 | `margin-bottom: 18px` (마지막 0) |
| 탭 → | `/records/[id]` |

**상황 태그 색상:**

| 태그 | CSS 변수 | hex |
|------|---------|------|
| 혼밥/혼술 | `--scene-solo` | `#7A9BAE` |
| 데이트 | `--scene-romantic` | `#B8879B` |
| 친구/모임 | `--scene-friends` | `#7EAE8B` |
| 가족 | `--scene-family` | `#C9A96E` |
| 회식/접대 | `--scene-business` | `#8B7396` |
| 술자리 | `--scene-drinks` | `#B87272` |

**빈 상태:**
- padding `40px 20px`, text-align center
- 아이콘: `search` 28px `var(--text-hint)`
- 제목: 14px weight 600 `var(--text-sub)`
- 설명: 12px `var(--text-hint)`

---

### 사분면: 내 식당 지도 (RatingInput readOnly)

> **변경**: `QuadrantDisplay` 대신 `RatingInput` 컴포넌트를 readOnly 모드로 사용.
> avg/recent 모드 전환 + 참조 dot 탭 시 네비게이션 + 롱프레스로 포커스 전환.

```typescript
// 참고: 실제로는 RatingInput을 사용. 아래는 개념적 props.
interface QuadrantDisplayProps {
  /** 현재 대상 이름 */
  currentName: string
  /** 현재 대상 평균 좌표 */
  currentDot: { axisX: number; axisY: number; satisfaction: number } | null
  /** 참조 점 (다른 식당/와인) — 최대 12개 */
  refDots: QuadrantRefDot[]
  /** 식당: '--accent-food', 와인: '--accent-wine' */
  accentColor: string
  /** X축 라벨 */
  xAxisLabels: [string, string]    // ['저렴', '고가'] | ['산미 낮음', '산미 높음']
  /** Y축 라벨 */
  yAxisLabels: [string, string]    // ['캐주얼', '포멀'] | ['Light Body', 'Full Body']
  /** 표시 조건: 리뷰 2개+ */
  isVisible: boolean
  /** 섹션 제목 */
  sectionTitle: string             // '내 식당 지도' | '내 와인 지도'
  sectionMeta: string              // '리뷰한 식당 중 위치' | '리뷰한 와인 중 위치'
}
```

**표시 조건**: 사용자의 서로 다른 식당 리뷰 2곳 이상일 때만 (이 식당 포함).

**차트 영역:**
- padding 16px, `var(--bg-card)`, radius 12px, border
- 차트: `var(--bg-elevated)`, radius 8px, border
- 비율: `padding-bottom: 80%` (4:5 반응형)

**점 (dot):**

| 종류 | 크기 | 배경 | 보더 | 텍스트 | z-index |
|------|------|------|------|--------|---------|
| 현재 (current) | 38px | `var(--accent-food)` | 3px `var(--accent-food-light)` | `#fff`, 11px, weight 800 | 10 |
| 참조 (ref) | 18~32px (만족도 기반 동적) | `var(--border-bold)` | 2px `var(--border)` | `var(--text)`, 8px, weight 600 | 5 |

- 현재 dot: `box-shadow: 0 2px 10px rgba(193,123,94,0.4)`, 하단 라벨 10px bold `var(--text-sub)` weight 700
- 참조 dot: opacity 0.35, hover 시 0.7 + scale 1.15, 하단 라벨 9px `var(--text-hint)`
- dot 내부에 점수 숫자 표시
- 축 라벨: 9px, `var(--text-sub)`, weight 500
- 십자선: 1px `var(--border)`

**캡션**: `info` 아이콘 12px `var(--text-hint)` + "내가 리뷰한 비슷한 가격대·지역 식당과의 상대적 위치" 11px `var(--text-hint)`

---

### Layer 7: 실용 정보 (`restaurant-info.tsx`)

```typescript
interface RestaurantInfoProps {
  address: string | null
  lat: number | null
  lng: number | null
  hours: BusinessHours | null
  phone: string | null
  menus: MenuItem[]
  /** 내 기록 모드에서만 메뉴 접이식 표시 */
  showMenuSection: boolean
}
```

| 행 | 아이콘 | 내용 | 액션 |
|----|--------|------|------|
| 주소 | `map-pin` | 주소 텍스트 + 미니 지도 (120px, radius 8px) | 탭 → 외부 지도 |
| 영업 | `clock` | `영업 중` (`var(--positive)`, weight 600) · 시간 | --- |
| 전화 | `phone` | 전화번호 | "전화하기" (`var(--accent-food)`, weight 600) |
| 메뉴 | --- | 접이식 버튼 (내 기록 모드만) | 토글 |

**정보 행 공통:**
```
display: flex, align-items: flex-start, gap: 10px
padding: 8px 0
border-bottom: 1px solid #F0EDE8 (마지막 행 제외)
font-size: 13px
아이콘: 16px, var(--text-sub), flex-shrink: 0
```

**메뉴 접이식:**
- 버튼: `#F0EDE8` 배경, radius 8px, 13px weight 600, 화살표 rotation 0→180deg 0.3s
- 내용: 메뉴명 + 가격, 행별 `border-bottom: 1px solid #F0EDE8`

---

### Layer 8: 연결된 와인 (`connected-items.tsx`)

```typescript
interface ConnectedItemsProps {
  /** 섹션 제목 */
  sectionTitle: string       // '연결된 와인' | '함께한 레스토랑'
  sectionMeta: string        // '같이 즐긴 와인' | ''
  items: ConnectedItemCard[]
  /** 식당 상세에서: 'wine', 와인 상세에서: 'restaurant' */
  targetType: 'wine' | 'restaurant'
  onItemTap: (id: string) => void
}

interface ConnectedItemCard {
  id: string
  name: string
  imageUrl: string | null
  /** 점수 (만족도) */
  score: number | null
  /** 보조 텍스트 (장르, 와인타입 등) */
  subText: string
}
```

**가로 스크롤 카드 (식당→와인):**

| 속성 | 값 |
|------|---|
| 카드 너비 | 130px |
| 배경 | `var(--accent-wine-light)` |
| border | `1px solid #DDD6E3` |
| border-radius | 12px |
| padding | 10px |
| 와인 라벨 | 100% x 56px, 보라 그라디언트, radius 6px, wine 아이콘 20px |
| 와인명 | 11px, weight 600, `var(--accent-wine)`, line-height 1.3 |
| 점수 | 11px, `var(--text-sub)`, 점수 bold `var(--accent-wine)` |

**표시 조건**: 이 식당에서 와인 기록이 있을 때만 (`linked_wine_id IS NOT NULL`인 records 존재). 없으면 섹션 숨김.

---

### FAB (`detail-fab.tsx`)

```typescript
interface DetailFabProps {
  onBack: () => void
  onAdd: () => void
  variant?: 'food' | 'wine'  // 기본 'food'
}
```

**공통 스타일:**
```
position: absolute
bottom: 28px
width: 44px, height: 44px
border-radius: 50%
background: rgba(248,246,243,0.88)
backdrop-filter: blur(12px)
border: 1px solid var(--border)
box-shadow: 0 2px 12px rgba(0,0,0,0.12)
active: scale(0.9)
z-index: 85
```

| FAB | 위치 | 아이콘 | 동작 |
|-----|------|--------|------|
| 뒤로 | `left: 16px` | `chevron-left` (22px) | `router.back()` |
| 추가 | `right: 16px` | `plus` (22px) | 기록 추가 (식당 선택 스킵) |

---

### 앱 헤더 (`app-header.tsx`)

> **변경사항**: `DetailHeader` 전용 컴포넌트 대신 공통 `AppHeader` 사용.
> `from` 파라미터 기반 뒤로 라벨 로직은 제거됨 — 일반 앱 헤더를 그대로 사용.

```typescript
// src/presentation/components/layout/app-header.tsx
// 공통 앱 헤더 컴포넌트 — 모든 페이지에서 동일하게 사용
```

---

## 컨테이너: `restaurant-detail-container.tsx`

```typescript
// src/presentation/containers/restaurant-detail-container.tsx
// R4: shared/di 경유, infrastructure 직접 import 금지

interface RestaurantDetailContainerProps {
  restaurantId: string
  bubbleId: string | null   // 버블 모드 (URL ?bubble= 파라미터)
}

export function RestaurantDetailContainer({ restaurantId, bubbleId }: RestaurantDetailContainerProps) {
  // 사용하는 hooks:
  // - useAuth() → user
  // - useRestaurantDetail(restaurantId, userId, restaurantRepo) → state
  // - useWishlist(userId, restaurantId, 'restaurant', recordRepo) → isWishlisted, toggle
  // - useAxisLevel(userId, [{axisType:'genre', axisValue}, {axisType:'area', axisValue}]) → axisLevels
  // - useShareRecord(userId, activeRecordId) → availableBubbles, shareToBubbles, canShare
  // - useBubbleDetail(bubbleId, userId) → bubbleInfo (버블 모드)
  // - useBubbleFeed(bubbleId, ...) → 버블 멤버 공유 (버블 모드)
  //
  // 주요 상태:
  // - quadrantMode: 'avg' | 'recent' (사분면 평균/최근 전환)
  // - focusedRecordIdx: 최근 모드에서 포커스된 기록
  // - bubbleExpanded: 버블 확장 패널 토글
  //
  // 레이아웃:
  //    AppHeader (공통 앱 헤더)
  //    [BubbleMiniHeader — 버블 모드일 때만]
  //    HeroCarousel (사진 / 찜 / 공유)
  //    ├─ 기본정보 (이름, 가격대, 지역 cascade, 장르 cascade + AxisLevelBadge)
  //    ├─ ScoreCards (2슬롯) + BubbleExpandPanel
  //    ├─ BadgeRow (미슐랭/블루리본/TV)
  //    ├─ Divider
  //    ├─ 사분면 (RatingInput readOnly, avg/recent 모드 전환)
  //    │   - 버블 모드: 멤버 평가 dots
  //    │   - 일반 모드: 내 평가 + 참조 dots
  //    ├─ Divider
  //    ├─ RecordTimeline (나의 기록 타임라인)
  //    ├─ Divider
  //    ├─ BubbleRecordSection (버블 기록)
  //    ├─ Divider
  //    ├─ RestaurantInfo (주소, 영업시간, 전화, 메뉴, 외부 링크)
  //    └─ spacer
  //    DetailFab (뒤로 + 추가)
  //    FabActions (수정/삭제 — 기록 있을 때만)
  //    DeleteConfirmModal
  //    ShareToBubbleSheet
}
```

**참고**: 초기 설계와의 차이점:
- `QuadrantDisplay` 대신 `RatingInput` readOnly 모드 사용
- 점수 카드 3슬롯 → 2슬롯 (nyam 점수 슬롯 제거)
- `DetailInfoHeader` 대신 인라인 JSX로 지역/장르 cascade 렌더링
- `FabActions`(수정/삭제/공유) 추가 — FAB 영역에 기록 액션 포함
- `BubbleRecordSection` 추가 — 버블 기록 표시
- 버블 모드(`bubbleId`) 지원 — `BubbleMiniHeader` + 멤버 사분면 표시
- `useAxisLevel` hook으로 지역/장르 레벨 뱃지 표시

---

## 뷰 모드별 섹션 가시성

| 섹션 | 내 기록 | 추천 | 버블 리뷰 |
|------|---------|------|----------|
| L1 히어로 | 표시 | 표시 | 표시 |
| L2 정보 | 표시 | 표시 | 표시 |
| L3 점수 카드 | 3개 전부 | 내점수 "---" | 내점수 "---", 버블 값 |
| 뱃지 행 | 표시 | 표시 | 표시 |
| L5 나의 기록 | 타임라인 | 빈 상태 | 빈 상태 |
| L6 사분면 | 기록 2+ | 숨김 | 숨김 |
| L7 실용 정보 | 메뉴 포함 | 메뉴 없음 | 메뉴 없음 |
| L8 와인 연결 | 있을 때 | 숨김 | 숨김 |
| L9 버블 기록 | S8에서 구현 | S8에서 구현 | S8에서 구현 |

---

## 빈 상태 패턴

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 점수 카드 | 2슬롯 유지, 값만 "—" 표시 | 레이아웃 불변 |
| 기록 | `search` 아이콘 + "아직 방문 기록이 없어요" + CTA | padding 40px 20px |
| 사분면 | 섹션 숨김 | 리뷰 2개+ 시 표시 |
| 사진 (히어로) | `var(--bg-elevated)` + 장르 아이콘 | --- |
| 와인 연결 | 섹션 숨김 | 기록에 linked_wine_id 있을 때만 |
| 버블 기록 | `message-circle` 아이콘 + "아직 버블 기록이 없어요" + CTA | S4에서는 항상 빈 상태 |

---

## 데이터 소스

| UI 요소 | 소스 테이블/필드 | 갱신 |
|---------|----------------|------|
| 식당 기본정보 | restaurants.* | 2주 캐시 |
| 내 점수 | records (user_id + target_id, target_type='restaurant') → AVG(satisfaction) | 실시간 |
| nyam 점수 | restaurants.nyam_score (또는 프론트 계산) | 2주 |
| 버블 점수 | bubble_shares → records → AVG(satisfaction) by bubble | 실시간 |
| 사분면 좌표 | records.axis_x/y (현재) + 다른 식당 records (refs) | 실시간 |
| 기록 타임라인 | records WHERE user_id AND target_id, ORDER BY visit_date DESC | 실시간 |
| 사진 | record_photos WHERE record_id IN (기록 IDs), ORDER BY order_index | 실시간 |
| 연결 와인 | records.linked_wine_id → wines | 실시간 |
| 뱃지 | restaurants.michelin_stars, has_blue_ribbon, media_appearances | 2주 캐시 |
| 찜 상태 | lists WHERE user_id AND target_id AND target_type='restaurant' AND status='wishlist' | 실시간 |

---

## 라우팅

```typescript
// src/app/(main)/restaurants/[id]/page.tsx

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ bubble?: string }>
}

export default async function RestaurantDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <RestaurantDetailContainer restaurantId={id} bubbleId={bubble ?? null} />
}
```

```
/restaurants/[id]
  ?bubble=[bubbleId]  ← 버블 모드 진입

진입 경로:
  ← 홈 카드 탭
  ← 프로필 최근 기록
  ← 버블 상세 식당 리뷰 (?bubble= 파라미터 포함)
  ← 검색 결과 탭
  ← 추천 결과 탭

이동 경로:
  → /records/[id] (타임라인 아이템 탭)
  → /wines/[id] (연결 와인 카드 탭)
  → 기록 플로우 (FAB+ 탭 — 식당 선택 스킵)
```

---

## 레이아웃 구조 (CSS)

```
scroll-content (padding-top: 80px)
├─ .hero-wrap                ← Layer 1 (캐러셀 + 썸네일 + 액션)
├─ .detail-info              ← Layer 2+3+뱃지 (padding: 0 20px)
│   ├─ .detail-name          ← 21px, weight 800
│   ├─ .meta-row             ← 12px, var(--text-sub)
│   ├─ .score-cards          ← flex, gap 8px
│   ├─ .bubble-expand        ← max-height transition
│   └─ .badge-row            ← flex, gap 5px
├─ .section (padding: 16px 20px)  ← Layer 5 (나의 기록)
├─ .divider (8px, #F0EDE8)
├─ .section                  ← Layer 6 (사분면) — 조건부
├─ .divider
├─ .section                  ← Layer 7 (실용 정보)
├─ .divider
├─ .section                  ← Layer 8 (연결 와인) — 조건부
├─ .divider
├─ .section                  ← Layer 9 (버블 기록 — S4 빈 상태)
└─ spacer (h-20, 80px)
```

**.section 공통:**
- padding: `16px 20px`
- margin-top: 8px
- 섹션 헤더: flex between, margin-bottom 14px
  - 제목: 15px, weight 700, `var(--text)`
  - 메타: 12px, `var(--text-sub)`

**.divider:**
- height: 8px, background: `#F0EDE8`
