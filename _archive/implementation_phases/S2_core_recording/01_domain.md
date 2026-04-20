# S2-T01: Domain 엔티티 정의 — Record, ListItem, Photo, Quadrant, Aroma, WineStructure

> lists + records 2-테이블 구조의 TypeScript 타입을 정의하고, 평가 시스템의 값 객체(Value Object)와 Repository 인터페이스를 생성한다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/DATA_MODEL.md` | `lists` 테이블 | 사용자×대상 관계, status |
| `systems/DATA_MODEL.md` | `records` 테이블 (§2) | 전체 컬럼, 타입, 제약조건 |
| `systems/DATA_MODEL.md` | `record_photos` 테이블 (§2) | 사진 테이블 스키마 |
| `systems/RATING_ENGINE.md` | §1 핵심 개념 | 식당(Quick) vs 와인(Deep) 평가 구조 |
| `systems/RATING_ENGINE.md` | §2 사분면 축 정의 | X/Y축 의미, 범위 |
| `systems/RATING_ENGINE.md` | §7 상황 태그 | RestaurantScene 6종 |
| `systems/RATING_ENGINE.md` | §8 와인 심화 평가 | 아로마, 품질평가 BLIC, 페어링 8종 |
| `systems/RATING_ENGINE.md` | §9 부가 입력 | companions, price, linked 필드 |

---

## 선행 조건

- S1-T01 (DB 스키마 마이그레이션) 완료 — lists, records, record_photos 테이블 존재
- S1-T03 (디자인 토큰) 완료 — gauge 색상 CSS 변수 사용 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/record.ts` | domain | DiningRecord, ListItem, CreateRecordInput 등 모든 타입 |
| `src/domain/entities/record-photo.ts` | domain | RecordPhoto, PendingPhoto, PHOTO_CONSTANTS |
| `src/domain/entities/quadrant.ts` | domain | QuadrantPoint, QuadrantReferencePoint 값 객체 |
| `src/domain/entities/aroma.ts` | domain | AromaSectorId, AromaSelection 값 객체 |
| `src/domain/entities/wine-structure.ts` | domain | WineStructure(BLIC) 값 객체 |
| `src/domain/repositories/record-repository.ts` | domain | RecordRepository 인터페이스 (lists + records 2-테이블) |

### 스코프 외

- Supabase 구현체 (`infrastructure/repositories/supabase-record-repository.ts`) — S2-T10
- Application hooks — S2-T10
- UI 컴포넌트 — S2-T02~T08
- Restaurant, Wine 엔티티 — S1에서 정의 완료

---

## 상세 구현 지침

### 1. `src/domain/entities/record.ts`

**R1 준수**: React, Supabase, Next.js import 절대 금지. 순수 TypeScript 타입만.

```typescript
// src/domain/entities/record.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

// ─── 공통 타입 ───

/** target_type: 'restaurant' | 'wine' */
export type RecordTargetType = 'restaurant' | 'wine'

/** lists.status */
export type ListStatus = 'visited' | 'wishlist' | 'cellar' | 'tasted'

/** records.camera_mode */
export type CameraMode = 'individual' | 'shelf' | 'receipt'

/** records.meal_time */
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** records.pairing_categories (와인 기록 전용) */
export type PairingCategory =
  | 'red_meat' | 'white_meat' | 'seafood' | 'cheese'
  | 'vegetable' | 'spicy' | 'dessert' | 'charcuterie'

// ─── List 엔티티 (사용자 × 식당/와인 관계) ───

export interface ListItem {
  id: string
  userId: string
  targetId: string
  targetType: RecordTargetType
  status: ListStatus
  source: string
  sourceRecordId: string | null
  createdAt: string
  updatedAt: string
}

// ─── Record 엔티티 (방문/시음 1회) ───

/**
 * records 테이블 1:1 매핑
 * DATA_MODEL.md §2 records 테이블 전체 컬럼
 *
 * 주요 변경사항 (기존 설계 대비):
 * - status/wineStatus 제거 → lists 테이블의 ListStatus로 관리
 * - listId 추가 (FK → lists.id)
 * - aromaRegions/aromaLabels/aromaColor 제거 → aromaPrimary/aromaSecondary/aromaTertiary 3배열 구조
 * - intensity 추가 (품질평가 BLIC 4번째 항목)
 * - privateNote 추가 (기존 tips 대체)
 * - companions: 비공개 (본인만 열람)
 */
export interface DiningRecord {
  id: string
  listId: string          // FK → lists.id
  userId: string
  targetId: string
  targetType: RecordTargetType

  // 사분면 평가
  axisX: number | null
  axisY: number | null
  satisfaction: number | null   // (axisX + axisY) / 2 자동 계산

  // 경험 데이터
  scene: string | null
  comment: string | null
  totalPrice: number | null
  purchasePrice: number | null
  visitDate: string | null
  mealTime: MealTime | null

  // 메뉴/페어링
  menuTags: string[] | null
  pairingCategories: PairingCategory[] | null

  // GPS
  hasExifGps: boolean
  isExifVerified: boolean

  // 와인 전용
  cameraMode: CameraMode | null
  ocrData: Record<string, unknown> | null
  aromaPrimary: string[]       // 1차향 섹터 ID 배열 (Ring 1)
  aromaSecondary: string[]     // 2차향 섹터 ID 배열 (Ring 2)
  aromaTertiary: string[]      // 3차향 섹터 ID 배열 (Ring 3)
  complexity: number | null
  finish: number | null
  balance: number | null
  intensity: number | null     // 강도 (BLIC 4번째 항목)
  autoScore: number | null

  // 메타
  privateNote: string | null   // 비공개 메모
  companionCount: number | null
  companions: string[] | null  // ⚠️ 무조건 비공개
  linkedRestaurantId: string | null
  linkedWineId: string | null
  recordQualityXp: number
  scoreUpdatedAt: string | null

  createdAt: string
  updatedAt: string
}

// ─── 대상 정보 포함 기록 (홈 피드용) ───

export type RecordSource = 'mine' | 'following' | 'bubble'

export interface RecordWithTarget extends DiningRecord {
  targetName: string
  targetMeta: string | null
  targetArea: string | null
  targetPhotoUrl: string | null
  targetLat: number | null
  targetLng: number | null
  source?: RecordSource
  genre?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  area?: string[] | null
  priceRange?: number | null
  michelinStars?: number | null
  hasBlueRibbon?: boolean | null
  mediaAppearances?: string[] | null
  wineType?: string | null
  variety?: string | null
  region?: string | null
  vintage?: number | null
  listStatus?: ListStatus
}

// ─── 기록 생성 입력 타입 ───

export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
  listStatus: ListStatus       // lists 테이블 status (visited/wishlist/cellar/tasted)
  cameraMode?: CameraMode | null
  menuTags?: string[] | null
  pairingCategories?: PairingCategory[] | null
  linkedRestaurantId?: string | null
  linkedWineId?: string | null
  // 경험 데이터
  axisX?: number | null
  axisY?: number | null
  satisfaction?: number | null
  scene?: string | null
  comment?: string | null
  totalPrice?: number | null
  purchasePrice?: number | null
  visitDate?: string | null
  mealTime?: MealTime | null
  companionCount?: number | null
  companions?: string[] | null
  privateNote?: string | null
  hasExifGps?: boolean
  isExifVerified?: boolean
  // 와인 전용
  aromaPrimary?: string[]
  aromaSecondary?: string[]
  aromaTertiary?: string[]
  complexity?: number | null
  finish?: number | null
  balance?: number | null
  intensity?: number | null
  autoScore?: number | null
}
```

### 2. `src/domain/entities/record-photo.ts`

```typescript
// src/domain/entities/record-photo.ts
// R1: 외부 의존 0

export interface RecordPhoto {
  id: string
  recordId: string
  url: string                // Supabase Storage (800px webp)
  orderIndex: number
  isPublic: boolean          // 공개 여부 (기본값 true)
  createdAt: string
}

export interface PendingPhoto {
  id: string
  file: File
  previewUrl: string
  orderIndex: number
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  uploadedUrl?: string
  isPublic: boolean          // 공개 여부 (기본값 true)
}

export const PHOTO_CONSTANTS = {
  MAX_PHOTOS: 10,
  MAX_WIDTH: 800,            // 리사이즈 최대 너비 (px)
  QUALITY: 0.7,              // WebP 품질 (0~1)
  OUTPUT_FORMAT: 'image/webp' as const,
  BUCKET_NAME: 'record-photos',
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const
```

### 3. `src/domain/entities/quadrant.ts`

```typescript
// src/domain/entities/quadrant.ts
// R1: 외부 의존 0

/**
 * 사분면 위치 + 만족도 값 객체
 * RATING_ENGINE.md §2, §3, §4
 *
 * 식당: x=음식 퀄리티%(0=낮음, 100=높음), y=경험 가치%(0=낮음, 100=높음)
 * 와인: x=구조·완성도%(0=낮음, 100=높음), y=즐거움·감성%(0=낮음, 100=높음)
 *
 * satisfaction은 (x + y) / 2로 자동 계산됨 (독립 드래그 아님)
 * 점 크기는 고정 20px (만족도에 따른 가변 크기 아님)
 */
export interface QuadrantPoint {
  x: number
  y: number
  satisfaction: number        // (x + y) / 2 자동 계산
}

/**
 * 참조 점 (사분면 배경에 표시되는 과거 기록)
 * opacity 0.3, pointer-events: none, 최대 8~12개
 * 참조 점 크기는 고정 20px
 */
export interface QuadrantReferencePoint extends QuadrantPoint {
  name: string
  score: number
}

/**
 * 만족도 → 게이지 단계 (1~5)
 */
export function getGaugeLevel(satisfaction: number): 1 | 2 | 3 | 4 | 5 {
  if (satisfaction <= 20) return 1
  if (satisfaction <= 40) return 2
  if (satisfaction <= 60) return 3
  if (satisfaction <= 80) return 4
  return 5
}
```

**참고**: 기존 설계의 `getCircleRatingSize`, `getRefDotSize` 함수는 현재 코드베이스에 존재하지 않는다.
점 크기는 고정 20px으로 변경되었다.

### 4. `src/domain/entities/aroma.ts`

```typescript
// src/domain/entities/aroma.ts
// R1: 외부 의존 0

/**
 * 아로마 섹터 ID (16개, WSET Level 3 기준)
 *
 * Ring 1 (1차향 — 포도 유래, 바깥, 9섹터): citrus ~ herb
 * Ring 2 (2차향 — 양조 유래, 중간, 4섹터): butter ~ toast
 * Ring 3 (3차향 — 숙성 유래, 안쪽, 3섹터): leather ~ nut
 */
export type AromaSectorId =
  // Ring 1 — 1차향 (포도 유래)
  | 'citrus'        // 시트러스
  | 'apple_pear'    // 사과/배
  | 'tropical'      // 열대과일
  | 'stone_fruit'   // 핵과
  | 'red_berry'     // 붉은베리
  | 'dark_berry'    // 검은베리
  | 'floral'        // 꽃
  | 'white_floral'  // 흰꽃
  | 'herb'          // 허브/채소
  // Ring 2 — 2차향 (양조 유래)
  | 'butter'        // 버터/크림 (MLF)
  | 'vanilla'       // 바닐라/삼나무 (오크)
  | 'spice'         // 정향/계피 (오크 향신료)
  | 'toast'         // 토스트/훈연 (효모/오크)
  // Ring 3 — 3차향 (숙성 유래)
  | 'leather'       // 가죽/담배
  | 'earth'         // 흙/버섯
  | 'nut'           // 견과/건과일

export type AromaRing = 1 | 2 | 3

export interface AromaSectorMeta {
  id: AromaSectorId
  ring: AromaRing
  nameKo: string
  nameEn: string
  hex: string
}

/**
 * 아로마 선택 값 객체
 * DB: records.aroma_primary (TEXT[]), records.aroma_secondary (TEXT[]), records.aroma_tertiary (TEXT[])
 */
export interface AromaSelection {
  primary: AromaSectorId[]     // 1차향 (Ring 1)
  secondary: AromaSectorId[]   // 2차향 (Ring 2)
  tertiary: AromaSectorId[]    // 3차향 (Ring 3)
}
```

### 5. `src/domain/entities/wine-structure.ts`

```typescript
// src/domain/entities/wine-structure.ts
// R1: 외부 의존 0

/**
 * 와인 품질 평가 값 객체 (BLIC)
 * RATING_ENGINE.md §8 품질 평가 (Quality)
 *
 * 4개 슬라이더, 모두 0~100 범위
 * records.balance, records.finish, records.intensity, records.complexity에 매핑
 */
export interface WineStructure {
  /** 균형: 0~100 (0=불균형, 100=완벽한 조화) */
  balance: number
  /** 여운: 0~100 (0→1초, 100→15초) */
  finish: number
  /** 강도: 0~100 (0=연한/희미, 100=강렬/집중) */
  intensity: number
  /** 복합성: 0~100 */
  complexity: number
}

export function calculateAutoScore(
  activeRingCount: number,
  finish: number,
  balance: number,
): number {
  const complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
  const raw = 50 + complexityBonus + (finish * 0.1) + (balance * 0.15)
  return Math.round(Math.max(1, Math.min(100, raw)))
}

export function finishToSeconds(value: number): number {
  return Math.round(1 + (value / 100) * 14)
}

export function getComplexityInitialValue(activeRingCount: number): number {
  if (activeRingCount <= 1) return 30
  if (activeRingCount === 2) return 60
  return 85
}
```

### 6. `src/domain/repositories/record-repository.ts`

```typescript
// src/domain/repositories/record-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { DiningRecord, ListItem, ListStatus, RecordTargetType, CreateRecordInput, RecordWithTarget } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

/**
 * Record Repository 인터페이스
 * lists + records 2-테이블 구조
 */
export interface RecordRepository {
  // ─── List (사용자 × 대상 관계) ───

  findOrCreateList(userId: string, targetId: string, targetType: RecordTargetType, status: ListStatus): Promise<ListItem>
  updateListStatus(listId: string, status: ListStatus): Promise<void>
  findListsByUser(userId: string, targetType: RecordTargetType, status?: ListStatus): Promise<ListItem[]>
  findListByUserAndTarget(userId: string, targetId: string, targetType: RecordTargetType): Promise<ListItem | null>
  deleteList(listId: string): Promise<void>

  // ─── Record (방문/시음 1회) ───

  create(input: CreateRecordInput): Promise<DiningRecord>
  findById(id: string): Promise<DiningRecord | null>
  findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]>
  findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]>
  findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]>
  update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord>
  delete(id: string): Promise<void>

  // ─── 사진 (읽기/삭제만) ───

  findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>
  deletePhoto(id: string): Promise<void>
}
```

---

## 데이터 흐름

```
사용자 기록 생성 요청
  ↓
presentation/containers → application/hooks/use-create-record
  ↓
application hook → RecordRepository.create() (domain 인터페이스)
  ↓
shared/di/container → SupabaseRecordRepository.create() (infrastructure 구현체)
  ↓
1. lists upsert (findOrCreateList)
2. records INSERT
  ↓
반환된 Row → DiningRecord 엔티티로 변환
  ↓
application hook → presentation으로 DiningRecord 반환

사진 추가 (container 오케스트레이션, DEC-007):
usePhotoUpload.uploadAll() → Supabase Storage upload → PhotoRepository.savePhotos() → record_photos INSERT
```

---

## 검증 체크리스트

```
□ R1 검증: grep -r "from 'react\|from '@supabase\|from 'next" src/domain/ → 결과 0건
□ DiningRecord 필드가 DATA_MODEL.md records 테이블 컬럼과 매핑 (camelCase)
□ ListItem 필드가 DATA_MODEL.md lists 테이블 컬럼과 매핑
□ RecordPhoto 필드가 record_photos 테이블 컬럼과 매핑 (isPublic 포함)
□ RecordTargetType: 'restaurant' | 'wine' — 2종만
□ ListStatus: 'visited' | 'wishlist' | 'cellar' | 'tasted' — 4종
□ CameraMode: 'individual' | 'shelf' | 'receipt' — 3종만
□ MealTime: 4종 (breakfast, lunch, dinner, snack)
□ PairingCategory: 8종 (red_meat ~ charcuterie)
□ AromaSectorId: 16종 (Ring1: 9 + Ring2: 4 + Ring3: 3)
□ WineStructure BLIC: balance, finish, intensity, complexity — 4개 필드
□ calculateAutoScore 공식: 50 + complexityBonus(activeRingCount) + finish×0.1 + balance×0.15 → clamp(1,100)
□ RecordRepository: lists 메서드 5개 + records 메서드 7개 + 사진 메서드 2개
□ companions 필드 비공개 경고 명시
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
