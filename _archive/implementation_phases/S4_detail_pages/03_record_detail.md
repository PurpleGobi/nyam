# S4-T03: 기록 상세 페이지

> Route: `/records/[id]`
> SSOT: `pages/04_RECORD_DETAIL.md`, `systems/DATA_MODEL.md`, `systems/RATING_ENGINE.md`, `systems/XP_SYSTEM.md`

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/04_RECORD_DETAIL.md` | 전체 | 10개 섹션 스펙 + 빈 상태 + 인터랙션 |
| `systems/DATA_MODEL.md` | records, record_photos, xp_histories, user_experiences | 테이블 컬럼 |
| `systems/RATING_ENGINE.md` | §4 점 비주얼, §7 상황 태그, §8 와인 심화 | 사분면/아로마/구조/페어링 |
| `systems/XP_SYSTEM.md` | XP 적립/차감 로직 | 삭제 시 XP 재계산 |

---

## 선행 조건

- S2 완료 (Record domain + DiningRecord 엔티티)
- S4-T01/T02 진행 중 또는 완료 (공통 컴포넌트 일부 재사용)

---

## 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/application/hooks/use-record-detail.ts` | application | 기록 상세 fetch + 삭제/수정 액션 |
| `src/presentation/components/record/mini-quadrant.tsx` | presentation | Section 1: 미니 사분면 |
| `src/presentation/components/record/satisfaction-gauge.tsx` | presentation | Section 2: 만족도 점수 + 바 |
| `src/presentation/components/record/aroma-display.tsx` | presentation | Section 3: 아로마 휠 (읽기 전용) |
| `src/presentation/components/record/photo-gallery.tsx` | presentation | Section 5: 사진 갤러리 + 풀스크린 |
| `src/presentation/components/record/pairing-display.tsx` | presentation | Section 6: 페어링 칩 (읽기 전용) |
| `src/presentation/components/record/record-practical-info.tsx` | presentation | Section 8: 실용 정보 |
| `src/presentation/components/record/xp-earned-section.tsx` | presentation | Section 9: 경험치 |
| `src/presentation/components/record/record-actions.tsx` | presentation | Section 10: 수정/삭제/공유 |
| `src/presentation/components/record/delete-confirm-modal.tsx` | presentation | 삭제 확인 모달 |
| `src/presentation/containers/record-detail-container.tsx` | presentation | 컨테이너 |
| `src/app/(main)/records/[id]/page.tsx` | app | 라우팅 |

---

## Application: use-record-detail Hook

```typescript
// src/application/hooks/use-record-detail.ts

import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { Wine } from '@/domain/entities/wine'
import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { RestaurantRepository } from '@/domain/repositories/restaurant-repository'
import type { WineRepository } from '@/domain/repositories/wine-repository'
import type { XpRepository } from '@/domain/repositories/xp-repository'
import type { AxisType } from '@/domain/entities/xp'
import { getLevelColor } from '@/domain/services/xp-calculator'

/** XP 이력 항목 */
export interface XpEarnedItem {
  axisType: string
  axisValue: string
  xpAmount: number
  currentLevel: number
  levelColor: string     // getLevelColor(level) 로 계산
}

/** 연결 대상 (식당 또는 와인) */
export interface LinkedTarget {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  /** 와인: "생산자 · 빈티지" */
  subText: string | null
}

export interface RecordDetailState {
  record: DiningRecord | null
  photos: RecordPhoto[]
  targetInfo: LinkedTarget | null
  /** 와인 기록인 경우 와인 전체 정보 (아로마 휠 등 표시용) */
  wineInfo: Wine | null
  linkedItem: LinkedTarget | null
  otherRecords: DiningRecord[]
  xpEarned: XpEarnedItem[]
  isLoading: boolean
  error: string | null
  isDeleting: boolean
  deleteError: string | null
}

export interface RecordDetailActions {
  /** 삭제 실행 — 성공 시 true 반환 */
  deleteRecord: () => Promise<boolean>
}

/**
 * 의존성 주입 패턴: repo를 단일 파라미터가 아닌 deps 객체로 받음
 * → 여러 레포지토리에 접근 필요 (record, restaurant, wine, xp)
 */
export function useRecordDetail(
  recordId: string,
  userId: string | null,
  deps: {
    recordRepo: RecordRepository
    restaurantRepo: RestaurantRepository
    wineRepo: WineRepository
    xpRepo: XpRepository
  },
): RecordDetailState & RecordDetailActions {
  // 로드 과정:
  // 1. deps.recordRepo.findById(recordId) + findPhotosByRecordId(recordId) 병렬
  // 2. 대상 정보 / 연결 아이템 / 다른 기록 / XP 이력 병렬:
  //    2a. record.targetType → restaurantRepo or wineRepo.findById → targetInfo
  //        와인인 경우 wineInfo도 함께 설정
  //    2b. record.linkedWineId or linkedRestaurantId → linkedItem
  //    2c. recordRepo.findByUserAndTarget → otherRecords (현재 제외)
  //    2d. xpRepo.getHistoriesByRecord + getUserExperiences → xpEarned
  //        → levelMap 빌드 후 getLevelColor(level)로 색상 결정
  //
  // deleteRecord:
  //   1. deps.recordRepo.delete(recordId) — record_photos ON DELETE CASCADE
  //   2. xp_histories 조회 → axis별 XP 합산
  //   3. axis별 user_experiences 차감 + level 재계산 (getLevelThresholds)
  //   4. users.total_xp 차감
  //   5. xp_histories 삭제
  //   6. 성공 시 true 반환
  //
  // ※ navigateToEdit는 hook에 없음 — 컨테이너에서 router.push로 직접 처리
}
```

---

## 페이지 레이아웃 (와이어프레임)

```
┌──────────────────────────────────────┐
│ [←]                          [⋯]    │  헤더 (glassmorphism)
│                                      │
│ 대상명                                │  H2, 21px, weight 800
│ YYYY.MM.DD · [상황태그]               │  방문일 + 씬 칩
│                                      │
│ ── Section 1: 미니 사분면 ──           │
│ ── Section 2: 만족도 ─────            │
│ ── Section 3: 아로마 (와인만) ──       │
│ ── Section 4: 한줄평 ─────            │
│ ── Section 5: 사진 ──────            │
│ ── Section 6: 페어링 (와인만) ──       │
│ ── Section 7: 메뉴/팁 (식당만) ──      │
│ ── Section 8: 실용 정보 ────          │
│ ── Section 9: 경험치 ─────           │
│ ── Section 10: 액션 ─────            │
│                          [h-20 여백] │
└──────────────────────────────────────┘
```

---

## 섹션별 상세

### 헤더 (record-nav)

| 요소 | 스펙 |
|------|------|
| 뒤로 버튼 | `chevron-left` → 이전 페이지 |
| 더보기 | `more-horizontal` → 드롭다운: 수정, 삭제, 공유(P2 숨김) |
| 스크롤 시 | 고정 헤더 + 대상명 (glassmorphism `rgba(248,246,243,0.55)` + blur 20px) |

### 대상명 + 방문 정보

```typescript
interface RecordHeaderProps {
  targetName: string
  targetType: 'restaurant' | 'wine'
  targetId: string
  /** 와인: 생산자 + 빈티지 포함 */
  targetSubText: string | null    // "Chateau Margaux · 2018"
  visitDate: string               // YYYY.MM.DD
  scene: string | null
  onTargetTap: () => void         // → /restaurants/[id] 또는 /wines/[id]
}
```

| 요소 | 스타일 |
|------|--------|
| 대상명 | 21px, weight 800 |
| 식당 대상명 색상 | `var(--text)` |
| 와인 대상명 색상 | `var(--accent-wine)` |
| 대상명 탭 | → `/restaurants/[id]` 또는 `/wines/[id]` |
| 방문일 | 12px, `var(--text-sub)`, YYYY.MM.DD |
| 상황 칩 | `scene` 있을 때만 표시, 상황별 색상 (RATING_ENGINE §7) |

**상황 태그 색상 (재사용):**

| 태그 | hex |
|------|------|
| solo (혼밥/혼술) | `#7A9BAE` |
| romantic (데이트) | `#B8879B` |
| friends (친구/모임) | `#7EAE8B` |
| family (가족/페어링) | `#C9A96E` |
| business (회식/선물) | `#8B7396` |
| drinks (술자리/시음) | `#B87272` |

---

### Section 1: 미니 사분면 (`mini-quadrant.tsx`)

```typescript
interface MiniQuadrantProps {
  /** 이 기록의 좌표 */
  currentDot: { axisX: number; axisY: number; satisfaction: number }
  /** 같은 대상의 다른 기록 좌표 */
  refDots: Array<{ axisX: number; axisY: number; satisfaction: number }>
  targetType: 'restaurant' | 'wine'
  /** 탭 → 대상 상세 페이지 */
  onTap: () => void
}
```

| 속성 | 값 |
|------|---|
| 높이 | h-48 (192px) |
| 이 기록의 점 | 불투명, 만족도 게이지 색상 fill |
| 다른 기록 점 | 반투명 30%, 동일 게이지 색상 규칙 |
| 식당 X축 | 가격 (저렴↔고가) |
| 식당 Y축 | 분위기 (캐주얼↔포멀) |
| 와인 X축 | 산미 (낮음↔높음) |
| 와인 Y축 | 바디 (Light↔Full) |
| 점 크기 | 만족도 기반 (RATING_ENGINE §4) |
| 기록 1개뿐 | 점 하나만 표시 |
| 탭 | → `/restaurants/[id]` 또는 `/wines/[id]` |

**만족도 → 점 크기 매핑:**

| 만족도 | 지름 |
|--------|------|
| 1~20 | 14px |
| 21~40 | 20px |
| 41~60 | 26px |
| 61~80 | 36px |
| 81~100 | 48px |

**만족도 → 게이지 색상:**

| 만족도 | 변수 | hex |
|--------|------|-----|
| 0~20 | `--gauge-1` | `#C4B5A8` |
| 21~40 | `--gauge-2` | `#B0ADA4` |
| 41~60 | `--gauge-3` | `#9FA5A3` |
| 61~80 | `--gauge-4` | `#889DAB` |
| 81~100 | `--gauge-5` | `#7A9BAE` |

**빈 상태** (axisX/axisY NULL = checked 상태):
- "사분면 평가를 추가해보세요" + [평가하기] 버튼
- 평가하기 → 수정 모드 (기록 플로우 진입)

---

### Section 2: 만족도 점수 (`satisfaction-gauge.tsx`)

```typescript
interface SatisfactionGaugeProps {
  satisfaction: number    // 1~100
}
```

| 요소 | 스타일 |
|------|--------|
| 숫자 | Display 2.5rem, bold |
| 컬러 바 | 높이 4px, radius 2px, 만족도 5단계 게이지 색상 |
| 바 너비 | `satisfaction%` (1~100 → 1~100%) |
| 배경 | `var(--bg-elevated)` |

---

### Section 3: 아로마 (와인 기록만) (`aroma-display.tsx`)

```typescript
interface AromaDisplayProps {
  aromaRegions: Record<string, unknown>   // JSONB
  aromaLabels: string[]                    // 향 라벨 배열
  complexity: number | null
  finish: number | null
  balance: number | null
}
```

| 속성 | 값 |
|------|---|
| 표시 조건 | `aromaRegions` 있을 때만 |
| 아로마 휠 | 선택된 섹터 하이라이트, 미선택 = `var(--bg-elevated)` |
| 라벨 칩 | `aromaLabels` 나열, 작은 pill 형태 |
| 구조 평가 요약 | complexity/finish/balance 중 값 있는 것만: "복합성 68 · 여운 7초+ · 균형 85" |
| 여운 표시 | 내부값 0~100 → 초 환산 (RATING_ENGINE §8) |

---

### Section 4: 한줄평

| 속성 | 값 |
|------|---|
| 표시 조건 | `comment` 있을 때만 |
| 스타일 | 1rem, `var(--text-sub)`, italic |
| 최대 | 200자 |
| 없으면 | 섹션 숨김 |

---

### Section 5: 사진 갤러리 (`photo-gallery.tsx`)

```typescript
interface PhotoGalleryProps {
  photos: RecordPhoto[]     // order_index 순
  onPhotoTap: (index: number) => void
}

interface FullscreenModalProps {
  photos: RecordPhoto[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}
```

| 속성 | 값 |
|------|---|
| 표시 조건 | `photos.length > 0` |
| 레이아웃 | 가로 스크롤, `order_index` 순 |
| 사진 크기 | `rounded-lg`, h-48 (192px), object-cover |
| 탭 | → 풀스크린 모달 |
| 없으면 | 섹션 숨김 |

**풀스크린 모달:**

| 속성 | 값 |
|------|---|
| 좌우 스와이프 | 사진 전환 |
| 핀치 줌 | 확대/축소 |
| 닫기 | `[x]` 버튼 (우상단) |
| 배경 | `rgba(0,0,0,0.9)` |
| dot indicator | 하단 중앙 |

---

### Section 6: 페어링 (와인 기록만) (`pairing-display.tsx`)

```typescript
interface PairingDisplayProps {
  pairingCategories: string[]   // PairingCategory[]
}
```

| 속성 | 값 |
|------|---|
| 표시 조건 | `pairingCategories` 있을 때만 |
| 칩 배경 | `var(--accent-wine-light)` |
| 칩 보더 | `var(--accent-wine-dim)` (#DDD6E3) |
| 칩 텍스트 | `var(--accent-wine)` |
| 레이아웃 | flex-wrap |

**페어링 한글 매핑:**

| 키 | 아이콘 | 한글 |
|----|--------|------|
| red_meat | 🥩 | 적색육 |
| white_meat | 🍗 | 백색육 |
| seafood | 🦐 | 어패류 |
| cheese | 🧀 | 치즈·유제품 |
| vegetable | 🌿 | 채소·곡물 |
| spicy | 🌶️ | 매운·발효 |
| dessert | 🍫 | 디저트·과일 |
| charcuterie | 🥜 | 샤퀴트리·견과 |

---

### Section 7: 메뉴 태그 / 팁 (식당 기록만)

| 속성 | 값 |
|------|---|
| menu_tags 칩 | `rounded-full bg-neutral-100 px-3 py-1` |
| tips 텍스트 | 0.875rem, `var(--text-sub)` |
| 둘 다 없으면 | 섹션 숨김 |

---

### Section 8: 실용 정보 (`record-practical-info.tsx`)

```typescript
interface RecordPracticalInfoProps {
  targetType: 'restaurant' | 'wine'
  totalPrice: number | null        // 식당 1인
  purchasePrice: number | null     // 와인 병 가격
  companions: string[] | null      // ⚠️ 비공개 본인만
  companionCount: number | null
  visitDate: string
  linkedItem: LinkedTarget | null  // 연결된 와인 또는 식당
  onLinkedItemTap: (id: string, type: string) => void
}
```

| 항목 | 표시 | 조건 |
|------|------|------|
| 가격 | 원화 포맷 "₩85,000 (1인)" / "₩380,000 (병)" | 없으면 "---" |
| 동반자 | 이름 나열 | 있을 때만 (⚠️ 비공개: 본인 기록에서만 표시) |
| 방문일 | YYYY.MM.DD | 항상 표시 |
| 연결된 와인 | 와인명 → 탭→`/wines/[id]` | 식당 기록 + `linkedWineId` 시 |
| 연결된 식당 | 식당명 → 탭→`/restaurants/[id]` | 와인 기록 + `linkedRestaurantId` 시 |

---

### Section 9: 경험치 (`xp-earned-section.tsx`)

```typescript
interface XpEarnedSectionProps {
  items: XpEarnedItem[]
}
```

| 속성 | 값 |
|------|---|
| 표시 조건 | `items.length > 0` |
| 각 행 | `{axisValue} +{xpAmount} XP (Lv.{currentLevel})` |
| 레벨 색상 | `levelColor` (level_thresholds.color) |
| 없으면 | 섹션 숨김 |

---

### Section 10: 액션 (`record-actions.tsx`)

```typescript
interface RecordActionsProps {
  onEdit: () => void
  onDelete: () => void
  /** S8까지 비활성 */
  onShareToBubble?: () => void
}
```

| 버튼 | 스타일 | 동작 |
|------|--------|------|
| [수정하기] | Secondary 버튼 | → 기록 플로우 진입 (pre-fill) |
| [삭제하기] | Destructive (`text-red-500`) | → 확인 모달 |
| [버블에 공유] | S4에서 **숨김** (Phase 2, S8에서 활성화) | --- |

---

### 삭제 확인 모달 (`delete-confirm-modal.tsx`)

```typescript
interface DeleteConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}
```

| 속성 | 값 |
|------|---|
| 컴포넌트 | `AlertDialog` (shadcn/ui) |
| 트랜지션 | 200ms ease-in-out |
| 제목 | "기록을 삭제하시겠습니까?" |
| 설명 | "이 기록을 삭제하면 경험치가 차감됩니다." |
| 확인 | "삭제하기" (destructive) |
| 취소 | "취소" |

**삭제 프로세스:**

```
1. records DELETE WHERE id = recordId
   → record_photos ON DELETE CASCADE (자동 삭제)
2. xp_histories DELETE WHERE record_id = recordId
3. user_experiences 재계산:
   → 해당 axis_type + axis_value의 total_xp = SUM(xp_histories.xp_amount)
   → level = level_thresholds에서 재조회
4. users.total_xp = SUM(all xp_histories.xp_amount)
5. users.active_xp 재계산 (최근 6개월)
6. users.record_count -= 1
7. router.back()
   (※ 실제 구현에서는 lists 업데이트 없음 — 남은 기록 수만 토스트 표시)
```

---

## 수정 모드

수정하기 탭 시 기록 플로우 (05_RECORD_FLOW) 통합 기록 화면에 진입. 기존 데이터 pre-fill.

**pre-fill 대상:**
- 사분면 위치 (axisX, axisY)
- 만족도 (satisfaction)
- 상황 태그 (scene)
- 코멘트 (comment)
- 동반자 (companions)
- 가격 (totalPrice / purchasePrice)
- 와인 전용: 아로마 (aromaRegions, aromaLabels), 구조 평가 (complexity, finish, balance), 페어링 (pairingCategories)
- 연결된 와인/식당 (linkedWineId / linkedRestaurantId)

**수정 후 저장:**
- `records` UPDATE
- XP 재계산 (quality 변동 시)

---

## 빈 상태 패턴

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 사분면 | axis_x/y NULL (checked 상태) | "사분면 평가를 추가해보세요" + [평가하기] |
| 아로마 | 와인 아닌 경우 or aromaRegions NULL | 섹션 숨김 |
| 한줄평 | comment NULL | 섹션 숨김 |
| 사진 | photos 0개 | 섹션 숨김 |
| 페어링 | 와인 아닌 경우 or pairingCategories NULL | 섹션 숨김 |
| 메뉴/팁 | menuTags + tips 모두 NULL | 섹션 숨김 |
| 실용 정보 | price + companions NULL | 방문일만 표시 |
| 경험치 | xpEarned 0건 | 섹션 숨김 |

---

## 컨테이너: `record-detail-container.tsx`

```typescript
// src/presentation/containers/record-detail-container.tsx

import { recordRepo } from '@/shared/di/container'
import { useRecordDetail } from '@/application/hooks/use-record-detail'

export function RecordDetailContainer({ id }: { id: string }) {
  // 1. useAuth() → userId
  // 2. useRecordDetail(id, userId, recordRepo) → state + actions
  // 3. 레이아웃:
  //    헤더 (glassmorphism, 고정)
  //    scroll-content
  //    ├─ 대상명 + 방문 정보
  //    ├─ Section 1: MiniQuadrant (axisX/Y 있을 때)
  //    ├─ Section 2: SatisfactionGauge (satisfaction 있을 때)
  //    ├─ Section 3: AromaDisplay (와인 + aromaRegions 있을 때)
  //    ├─ Section 4: 한줄평 (comment 있을 때)
  //    ├─ Section 5: PhotoGallery (photos > 0)
  //    ├─ Section 6: PairingDisplay (와인 + pairingCategories 있을 때)
  //    ├─ Section 7: 메뉴/팁 (식당 + menuTags/tips 있을 때)
  //    ├─ Section 8: RecordPracticalInfo
  //    ├─ Section 9: XpEarnedSection (xpEarned > 0)
  //    ├─ Section 10: RecordActions
  //    └─ spacer (h-20)
  //    DeleteConfirmModal
}
```

---

## 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 기록 기본정보 | records | 실시간 |
| 사진 | record_photos WHERE record_id, ORDER BY order_index | 실시간 |
| 식당/와인 정보 | restaurants / wines | 캐시 2주 |
| 사분면 좌표 | records.axis_x/y + 동일 target의 다른 records | 실시간 |
| 아로마 | records.aroma_regions/labels | 실시간 |
| 구조 평가 | records.complexity/finish/balance | 실시간 |
| 페어링 | records.pairing_categories | 실시간 |
| 경험치 | xp_histories WHERE record_id + user_experiences | 실시간 |
| 와인 연결 | records.linked_wine_id → wines | 실시간 |
| 식당 연결 | records.linked_restaurant_id → restaurants | 실시간 |

---

## 라우팅

```
/records/[id]
  ← 홈 카드 탭
  ← 식당 상세 Layer 5 타임라인 아이템 탭
  ← 와인 상세 Layer 6 타임라인 아이템 탭
  ← 프로필 최근 기록 탭
  → /restaurants/[id] (대상명 탭, 사분면 탭 — 식당 기록)
  → /wines/[id] (대상명 탭, 사분면 탭 — 와인 기록)
  → 기록 플로우 (수정하기)
```

---

## 인터랙션 요약

| 인터랙션 | 상세 |
|---------|------|
| 스크롤 시 | 고정 헤더 (glassmorphism) + 대상명 |
| 사진 탭 | 풀스크린 모달 (좌우 스와이프, 핀치 줌, [x] 닫기) |
| 사분면 탭 | 해당 식당/와인 상세 페이지로 이동 |
| 대상명 탭 | 상세 페이지 (`/restaurants/[id]` 또는 `/wines/[id]`) |
| 연결된 와인 탭 | `/wines/[id]` |
| 연결된 식당 탭 | `/restaurants/[id]` |
| 삭제 확인 모달 | `AlertDialog` (200ms ease-in-out) |
