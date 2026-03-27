# S2-T01: Domain 엔티티 정의 — Record, Photo, Quadrant, Aroma, WineStructure

> records 테이블의 모든 컬럼을 TypeScript 타입으로 정의하고, 평가 시스템의 값 객체(Value Object)와 Repository 인터페이스를 생성한다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/DATA_MODEL.md` | `records` 테이블 (§2) | 전체 컬럼, 타입, 제약조건 |
| `systems/DATA_MODEL.md` | `record_photos` 테이블 (§2) | 사진 테이블 스키마 |
| `systems/RATING_ENGINE.md` | §1 핵심 개념 | 식당(Quick) vs 와인(Deep) 평가 구조 |
| `systems/RATING_ENGINE.md` | §2 사분면 축 정의 | X/Y축 의미, 범위 |
| `systems/RATING_ENGINE.md` | §7 상황 태그 | RestaurantScene 6종 |
| `systems/RATING_ENGINE.md` | §8 와인 심화 평가 | 아로마, 구조평가, 페어링 8종 |
| `systems/RATING_ENGINE.md` | §9 부가 입력 | companions, price, linked 필드 |

---

## 선행 조건

- S1-T01 (DB 스키마 마이그레이션) 완료 — records, record_photos 테이블 존재
- S1-T03 (디자인 토큰) 완료 — gauge 색상 CSS 변수 사용 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/record.ts` | domain | Record 엔티티, 모든 타입 유니온 |
| `src/domain/entities/record-photo.ts` | domain | RecordPhoto 인터페이스 (기본 인터페이스 정의. 2.8에서 PendingPhoto, PHOTO_CONSTANTS 추가) |
| `src/domain/entities/quadrant.ts` | domain | QuadrantPoint 값 객체 |
| `src/domain/entities/aroma.ts` | domain | AromaSelection 값 객체 |
| `src/domain/entities/wine-structure.ts` | domain | WineStructure 값 객체 |
| `src/domain/repositories/record-repository.ts` | domain | RecordRepository 인터페이스 |

### 스코프 외

- Supabase 구현체 (`infrastructure/repositories/supabase-record-repository.ts`) — S2-T05 이후
- Application hooks (`application/hooks/use-create-record.ts`) — S2-T06 이후
- UI 컴포넌트 — S2-T02~T04
- Restaurant, Wine 엔티티 — S1에서 정의 완료

---

## 상세 구현 지침

### 1. `src/domain/entities/record.ts`

**R1 준수**: React, Supabase, Next.js import 절대 금지. 순수 TypeScript 타입만.

```typescript
// src/domain/entities/record.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

// ─── 타입 유니온 (DB ENUM 매핑) ───

/** records.target_type: 'restaurant' | 'wine' */
export type RecordTargetType = 'restaurant' | 'wine'

/** records.status: 'checked' | 'rated' | 'draft' */
export type RecordStatus = 'checked' | 'rated' | 'draft'

/** records.wine_status: 시음/셀러/찜 3분류 (target_type='wine'일 때만 사용) */
export type WineStatus = 'tasted' | 'cellar' | 'wishlist'

/** records.camera_mode: 개별/진열장/영수증 */
export type CameraMode = 'individual' | 'shelf' | 'receipt'

// 씬태그 타입은 src/domain/entities/scene.ts에서 정의 (태스크 2.7)
// 식당 6종: solo, romantic, friends, family, business, drinks
// 와인 씬태그는 RATING_ENGINE.md에 따라 UI 입력 없음 (DB에는 string으로 저장 가능)
// DiningRecord.scene은 string | null로 저장

/** records.meal_time */
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/**
 * records.pairing_categories (와인 기록 전용)
 * WSET 8카테고리 그리드 — RATING_ENGINE.md §8
 */
export type PairingCategory =
  | 'red_meat'       // 적색육 (스테이크, 양갈비, 오리, 사슴)
  | 'white_meat'     // 백색육 (닭, 돼지, 송아지, 토끼)
  | 'seafood'        // 어패류 (생선, 갑각류, 조개, 굴, 초밥)
  | 'cheese'         // 치즈/유제품 (숙성, 블루, 브리, 크림소스)
  | 'vegetable'      // 채소/곡물 (버섯, 트러플, 리조또, 파스타)
  | 'spicy'          // 매운/발효 (커리, 마라, 김치, 된장)
  | 'dessert'        // 디저트/과일 (다크초콜릿, 타르트, 건과일)
  | 'charcuterie'    // 샤퀴트리/견과 (하몽, 살라미, 아몬드, 올리브)

// ─── Record 엔티티 ───

/**
 * records 테이블 1:1 매핑
 * DATA_MODEL.md §2 records 테이블 전체 컬럼
 *
 * 주요 규칙:
 * - axisX, axisY: 0~100 범위 (DECIMAL(5,2))
 * - satisfaction: 1~100 정수
 * - 와인 전용 필드: aroma*, complexity, finish, balance, autoScore, pairingCategories, purchasePrice, wineStatus, cameraMode, ocrData
 * - 식당 전용 필드: totalPrice
 * - companions: 비공개 (본인만 열람, API/버블/프로필 외부 노출 절대 금지)
 *
 * DB 컬럼명 ↔ TypeScript 프로퍼티 매핑:
 * records.user_id → userId
 * records.target_id → targetId
 * records.target_type → targetType
 * records.wine_status → wineStatus
 * records.camera_mode → cameraMode
 * records.ocr_data → ocrData
 * records.axis_x → axisX
 * records.axis_y → axisY
 * records.aroma_regions → aromaRegions
 * records.aroma_labels → aromaLabels
 * records.aroma_color → aromaColor
 * records.auto_score → autoScore
 * records.menu_tags → menuTags
 * records.pairing_categories → pairingCategories
 * records.companion_count → companionCount
 * records.total_price → totalPrice
 * records.purchase_price → purchasePrice
 * records.visit_date → visitDate
 * records.meal_time → mealTime
 * records.linked_restaurant_id → linkedRestaurantId
 * records.linked_wine_id → linkedWineId
 * records.has_exif_gps → hasExifGps
 * records.is_exif_verified → isExifVerified
 * records.record_quality_xp → recordQualityXp
 * records.score_updated_at → scoreUpdatedAt
 * records.created_at → createdAt
 * records.updated_at → updatedAt
 * (전체 매핑은 10_infra.md의 mapDbToRecord 참조)
 */
export interface DiningRecord {
  /** UUID PK */
  id: string

  /** FK → users.id */
  userId: string

  /** FK → restaurants.id 또는 wines.id */
  targetId: string

  /** 'restaurant' | 'wine' */
  targetType: RecordTargetType

  // ─── 상태 ───

  /** 'checked' | 'rated' | 'draft' (기본값: 'rated') */
  status: RecordStatus

  /** 와인 3분류: 'tasted' | 'cellar' | 'wishlist' (target_type='wine'일 때만) */
  wineStatus: WineStatus | null

  // ─── 카메라 모드 메타데이터 (와인 전용) ───

  /** 'individual' | 'shelf' | 'receipt' */
  cameraMode: CameraMode | null

  /**
   * 카메라 모드별 OCR 인식 결과 (JSONB)
   * - individual: { wine_name: string, vintage: string, producer: string }
   * - shelf: { wines: Array<{ name: string, price: number }> }
   * - receipt: { items: Array<{ name: string, price: number, qty: number }>, total: number }
   */
  ocrData: globalThis.Record<string, unknown> | null

  // ─── 사분면 (본 기록은 필수, 온보딩 기록은 NULL 허용) ───

  /** X축: 0~100 (식당: 가격%, 와인: 산미%) — DECIMAL(5,2) */
  axisX: number | null

  /** Y축: 0~100 (식당: 분위기%, 와인: 바디%) — DECIMAL(5,2) */
  axisY: number | null

  /** 만족도: 1~100 (점 크기) — INT */
  satisfaction: number | null

  /** 상황 태그: RestaurantScene | WineScene | null — VARCHAR(20) */
  scene: string | null

  // ─── 와인 전용 ───

  /** 향 팔레트 칠한 영역 데이터 (JSONB) */
  aromaRegions: globalThis.Record<string, unknown> | null

  /** 자동 추출된 향 라벨 (TEXT[]) — 예: ['시트러스', '열대과일', '바닐라'] */
  aromaLabels: string[] | null

  /** 점 대표 색상 hex — VARCHAR(7) — 예: '#fde047' */
  aromaColor: string | null

  /** 복합성: 0~100 — INT */
  complexity: number | null

  /** 여운: 0~100 — DECIMAL(5,2) */
  finish: number | null

  /** 균형: 0~100 — DECIMAL(5,2) */
  balance: number | null

  /** 자동 산출 만족도 — INT */
  autoScore: number | null

  // ─── 확장 (선택) ───

  /** 한줄평: 최대 200자 — VARCHAR(200) */
  comment: string | null

  /** 추천 메뉴/페어링 메모 — TEXT[] */
  menuTags: string[] | null

  /** WSET 페어링 카테고리 (와인 전용) — TEXT[] */
  pairingCategories: PairingCategory[] | null

  /** 사용팁 — TEXT */
  tips: string | null

  /**
   * 함께 간 사람 — TEXT[]
   * ⚠️ 무조건 비공개: 본인만 열람
   * API, 버블, 프로필 등 외부 노출 절대 금지
   */
  companions: string[] | null

  /** 동반자 수 (1=혼자, 2, 3, 4, 5+) — 필터/통계용, 비공개 아님 */
  companionCount: number | null

  /** 식당 1인 결제 금액 (원) — INT (총액 아님, 본인 지불 금액) */
  totalPrice: number | null

  /** 와인 구매/병 단가 (원) — INT */
  purchasePrice: number | null

  // ─── 날짜 ───

  /** 방문/음용 날짜 (wine_status='cellar'일 때는 구매 날짜) — ISO date string */
  visitDate: string | null

  /** 'breakfast' | 'lunch' | 'dinner' | 'snack' — 캘린더 뷰 시간대 라벨 */
  mealTime: MealTime | null

  // ─── 연결 ───

  /** 와인 기록의 식당 연결 — FK → restaurants.id */
  linkedRestaurantId: string | null

  /** 식당 기록의 와인 연결 — FK → wines.id */
  linkedWineId: string | null

  /** EXIF GPS 존재 여부 */
  hasExifGps: boolean

  /** GPS가 식당 위치 반경 200m 이내일 때 true */
  isExifVerified: boolean

  /** 이 기록으로 획득한 총 XP (비정규화) */
  recordQualityXp: number

  /** 만족도 점수 마지막 부여 시점 (6개월 제한 기준) — ISO datetime */
  scoreUpdatedAt: string | null

  /** 생성 시각 — ISO datetime */
  createdAt: string

  /** 수정 시각 — ISO datetime */
  updatedAt: string
}

// ─── 팩토리 함수 ───

/**
 * DiningRecord 기본값 생성 (신규 기록 초기 상태)
 * infrastructure에서 DB insert 전에 사용
 */
export function createDefaultRecord(
  userId: string,
  targetId: string,
  targetType: RecordTargetType,
): Omit<DiningRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    targetId,
    targetType,
    status: 'draft',
    wineStatus: targetType === 'wine' ? 'tasted' : null,
    cameraMode: null,
    ocrData: null,
    axisX: null,
    axisY: null,
    satisfaction: null,
    scene: null,
    aromaRegions: null,
    aromaLabels: null,
    aromaColor: null,
    complexity: null,
    finish: null,
    balance: null,
    autoScore: null,
    comment: null,
    menuTags: null,
    pairingCategories: null,
    tips: null,
    companions: null,
    companionCount: null,
    totalPrice: null,
    purchasePrice: null,
    visitDate: null,
    mealTime: null,
    linkedRestaurantId: null,
    linkedWineId: null,
    hasExifGps: false,
    isExifVerified: false,
    recordQualityXp: 0,
    scoreUpdatedAt: null,
  }
}

// ─── 기록 생성 입력 타입 ───

/**
 * 기록 생성 시 전달하는 입력 데이터
 * RecordRepository.create()의 파라미터 타입
 *
 * DiningRecord에서 서버가 자동 생성하는 필드(id, createdAt, updatedAt)와
 * 서버 전용 필드(ocrData, recordQualityXp, scoreUpdatedAt)를 제외한 입력 전용 타입.
 *
 * CreateRestaurantRecordInput과 CreateWineRecordInput은
 * 09_record_flow에서 이 타입을 확장하여 정의한다.
 */
export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
  status: RecordStatus
  wineStatus?: WineStatus | null
  cameraMode?: CameraMode | null
  axisX?: number | null
  axisY?: number | null
  satisfaction?: number | null
  scene?: string | null
  aromaRegions?: globalThis.Record<string, unknown> | null
  aromaLabels?: string[] | null
  aromaColor?: string | null
  complexity?: number | null
  finish?: number | null
  balance?: number | null
  autoScore?: number | null
  comment?: string | null
  menuTags?: string[] | null
  pairingCategories?: PairingCategory[] | null
  tips?: string | null
  companions?: string[] | null
  companionCount?: number | null
  totalPrice?: number | null
  purchasePrice?: number | null
  visitDate?: string | null
  mealTime?: MealTime | null
  linkedRestaurantId?: string | null
  linkedWineId?: string | null
  hasExifGps?: boolean
  isExifVerified?: boolean
}
```

### 2. `src/domain/entities/record-photo.ts`

```typescript
// src/domain/entities/record-photo.ts
// R1: 외부 의존 0

/**
 * record_photos 테이블 1:1 매핑
 * DATA_MODEL.md §2 record_photos
 */
export interface RecordPhoto {
  /** UUID PK */
  id: string

  /** FK → records.id (ON DELETE CASCADE) */
  recordId: string        // DB: record_id

  /** 이미지 URL (Supabase Storage) */
  url: string

  /** 사진 순서 (0부터 시작, 기본값 0) */
  orderIndex: number      // DB: order_index

  /** 생성 시각 — ISO datetime */
  createdAt: string       // DB: created_at
}
```

### 3. `src/domain/entities/quadrant.ts`

```typescript
// src/domain/entities/quadrant.ts
// R1: 외부 의존 0

/**
 * 사분면 위치 + 만족도 값 객체
 * RATING_ENGINE.md §2, §3, §4
 *
 * 식당: x=가격%(0=저렴, 100=고가), y=분위기%(0=캐주얼, 100=포멀)
 * 와인: x=산미%(0=낮음, 100=높음), y=바디%(0=Light Body, 100=Full Body)
 */
export interface QuadrantPoint {
  /** X축: 0~100 */
  x: number

  /** Y축: 0~100 */
  y: number

  /** 만족도: 1~100 (점 크기 결정) */
  satisfaction: number
}

/**
 * 참조 점 (사분면 배경에 표시되는 과거 기록)
 * RATING_ENGINE.md §6
 * opacity 0.3, pointer-events: none, 최대 8~12개
 */
export interface QuadrantReferencePoint extends QuadrantPoint {
  /** 식당/와인 이름 (라벨 표시용) */
  name: string

  /** 표시 점수 (= satisfaction) */
  score: number
}

// ─── 만족도 → 점 크기 매핑 (사분면 표시용, §4) ───

/**
 * 만족도 → 참조 점 지름 (px)
 * | 1~20: 14px | 21~40: 20px | 41~60: 26px | 61~80: 36px | 81~100: 48px |
 */
export function getRefDotSize(satisfaction: number): number {
  if (satisfaction <= 20) return 14
  if (satisfaction <= 40) return 20
  if (satisfaction <= 60) return 26
  if (satisfaction <= 80) return 36
  return 48
}

/**
 * 만족도 → Circle Rating 지름 (px)
 * 기록 플로우 인터랙티브 점
 * 28px (score 0) → 120px (score 100)
 * 공식: size = 28 + (score / 100) * 92
 */
export function getCircleRatingSize(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return 28 + (clamped / 100) * 92
}

/**
 * 만족도 → 게이지 단계 (1~5)
 * | 0~20: 1 | 21~40: 2 | 41~60: 3 | 61~80: 4 | 81~100: 5 |
 */
export function getGaugeLevel(satisfaction: number): 1 | 2 | 3 | 4 | 5 {
  if (satisfaction <= 20) return 1
  if (satisfaction <= 40) return 2
  if (satisfaction <= 60) return 3
  if (satisfaction <= 80) return 4
  return 5
}
```

### 4. `src/domain/entities/aroma.ts`

```typescript
// src/domain/entities/aroma.ts
// R1: 외부 의존 0

/**
 * 아로마 섹터 ID (15개)
 * RATING_ENGINE.md §8 아로마 팔레트
 *
 * Ring 1 (1차향, 바깥, 8섹터): citrus ~ white_floral
 * Ring 2 (2차향, 중간, 4섹터): butter ~ herb
 * Ring 3 (3차향, 안쪽, 3섹터): leather ~ nut
 */
export type AromaSectorId =
  // Ring 1 — 1차향 (과일/꽃)
  | 'citrus'        // 12시, 시트러스, #fde047
  | 'apple_pear'    // 1시, 사과/배, #a3e635
  | 'tropical'      // 2시, 열대과일, #fb923c
  | 'stone_fruit'   // 3시, 핵과, #fda4af
  | 'red_berry'     // 4시, 붉은베리, #f87171
  | 'dark_berry'    // 5시, 검은베리, #a855f7
  | 'floral'        // 6시, 꽃, #f472b6
  | 'white_floral'  // 7시, 흰꽃, #fef3c7
  // Ring 2 — 2차향 (발효/숙성)
  | 'butter'        // 8시, 버터/브리오슈, #fde68a
  | 'vanilla'       // 9시, 바닐라/토스트, #d97706
  | 'spice'         // 10시, 향신료, #991b1b
  | 'herb'          // 11시, 허브, #4ade80
  // Ring 3 — 3차향 (숙성)
  | 'leather'       // 중앙-좌, 가죽/담배, #78350f
  | 'earth'         // 중앙-우, 흙/미네랄, #78716c
  | 'nut'           // 중앙-하, 견과/초콜릿, #92400e

/** 아로마 링 번호 */
export type AromaRing = 1 | 2 | 3

/**
 * 아로마 섹터 메타데이터 (정적 상수)
 */
export interface AromaSectorMeta {
  id: AromaSectorId
  ring: AromaRing
  position: string
  nameKo: string
  nameEn: string
  hex: string
}

/**
 * 아로마 팔레트 선택 값 객체
 * records.aroma_regions (JSONB), records.aroma_labels (TEXT[]), records.aroma_color (VARCHAR(7))
 */
export interface AromaSelection {
  /**
   * 활성화된 섹터 ID → 활성화 상태
   * 예: { citrus: true, tropical: true, vanilla: true }
   * JSONB로 records.aroma_regions에 저장
   */
  regions: Partial<globalThis.Record<AromaSectorId, boolean>>

  /**
   * 선택된 섹터의 한국어 이름 배열 (자동 추출)
   * 예: ['시트러스', '열대과일', '바닐라']
   * records.aroma_labels에 저장
   */
  labels: string[]

  /**
   * 선택 영역의 가중 평균 hex 색상
   * records.aroma_color에 저장
   * null = 아무것도 선택 안 함
   */
  color: string | null
}
```

### 5. `src/domain/entities/wine-structure.ts`

```typescript
// src/domain/entities/wine-structure.ts
// R1: 외부 의존 0

/**
 * 와인 구조 평가 값 객체
 * RATING_ENGINE.md §8 구조 평가 (Structure)
 *
 * 3개 슬라이더, 모두 0~100 범위
 * records.complexity, records.finish, records.balance에 각각 매핑
 */
export interface WineStructure {
  /**
   * 복합성: 0~100
   * 라벨: 1차향(과일/꽃) ← → 2차향(발효) ← → 3차향(숙성)
   * AI 초기값: 아로마 휠 선택 링 수 기반
   *   - 1링만 선택 → ~30
   *   - 2링 선택 → ~60
   *   - 3링 선택 → ~85
   */
  complexity: number

  /**
   * 여운: 0~100 (내부값)
   * 표시: 초 환산 — finishToSeconds()로 변환 (0→1초, 100→15초)
   * 라벨: 짧음(<3초) ← → 보통(5~8초) ← → 긴(10초+)
   */
  finish: number

  /**
   * 균형: 0~100
   * 라벨: 산미 치우침 ← → 조화 ← → 타닌/알코올 치우침
   * 중간값(50) = 완벽한 조화 상태
   */
  balance: number
}

/**
 * 자동 만족도 산출
 * RATING_ENGINE.md §8 만족도 자동 산출 공식
 *
 * 복합성 보너스는 아로마 링 선택 수 기반 (슬라이더 값이 아님):
 *   - 1링만 선택 → +0
 *   - 2링 선택 → +7
 *   - 3링 선택 → +15
 *
 * @param activeRingCount 아로마 선택에서 활성화된 링 수 (1, 2, or 3)
 * @param finish 여운 0~100
 * @param balance 균형 0~100
 * @returns 1~100 범위의 자동 산출 만족도
 */
export function calculateAutoScore(
  activeRingCount: number,
  finish: number,
  balance: number,
): number {
  const complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
  const raw = 50 + complexityBonus + (finish * 0.1) + (balance * 0.15)
  return Math.round(Math.max(1, Math.min(100, raw)))
}

/**
 * 여운 내부값(0~100) → 초 환산
 * 05_structure.md 기준 단순 선형 공식: sec = Math.round(1 + (value / 100) * 14)
 * 결과 범위: 1초 ~ 15초
 *
 * @returns 초 단위 정수
 */
export function finishToSeconds(value: number): number {
  return Math.round(1 + (value / 100) * 14)
}

/**
 * 아로마 링 수 → 복합성 AI 초기값
 * RATING_ENGINE.md §8 복합성 AI 초기값
 */
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
// infrastructure에서 implements로 구현

import type { DiningRecord, RecordTargetType, CreateRecordInput } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

/**
 * Record Repository 인터페이스 (SINGLE canonical definition)
 * infrastructure/repositories/supabase-record-repository.ts에서 구현 (10_infra.md)
 * application/hooks에서 이 인터페이스에만 의존 (R3 준수)
 */
export interface RecordRepository {
  // ─── 기록 CRUD ───

  /**
   * 기록 생성
   * @param input CreateRecordInput (record.ts에서 정의)
   * @returns 생성된 Record (id, createdAt, updatedAt 포함)
   */
  create(input: CreateRecordInput): Promise<DiningRecord>

  /**
   * ID로 기록 조회
   * @returns Record 또는 null (미존재 시)
   */
  findById(id: string): Promise<DiningRecord | null>

  /**
   * 사용자 ID + 대상 타입으로 기록 목록 조회
   * visit_date DESC 정렬 (최신순)
   * @param targetType 생략 시 전체 타입 조회
   */
  findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]>

  /**
   * 사용자의 특정 대상(식당/와인)에 대한 기록 목록 조회
   * 사분면 참조 점 표시용
   */
  findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]>

  /**
   * 기록 부분 업데이트
   * @param id 기록 ID
   * @param data 업데이트할 필드 (Partial)
   * @returns 업데이트된 Record
   */
  update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord>

  /**
   * 기록 삭제
   * record_photos는 ON DELETE CASCADE로 자동 삭제
   */
  delete(id: string): Promise<void>

  // ─── 사진 ───

  // 사진 저장(INSERT)은 PhotoRepository.savePhotos() 책임 (DEC-007)

  /**
   * 기록의 사진 목록 조회
   * order_index ASC 정렬
   */
  findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>

  /**
   * 사진 삭제
   */
  deletePhoto(id: string): Promise<void>

  // ─── 찜 연동 ───

  /**
   * 기록 저장 시 동일 대상의 찜(wishlist)을 방문 처리
   * 찜이 없으면 아무 동작 안 함 (에러 아님)
   */
  markWishlistVisited(userId: string, targetId: string, targetType: RecordTargetType): Promise<void>
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
Supabase INSERT INTO records → 반환된 Row → DiningRecord 엔티티로 변환
  ↓
application hook → presentation으로 DiningRecord 반환

사진 추가 (container 오케스트레이션, DEC-007):
usePhotoUpload.uploadAll() → Supabase Storage upload → PhotoRepository.savePhotos() → record_photos INSERT

사분면 참조 점 조회:
RecordRepository.findByUserId() → DiningRecord[] → QuadrantReferencePoint[] 변환 (application layer)
```

---

## 검증 체크리스트

```
□ R1 검증: grep -r "from 'react\|from '@supabase\|from 'next" src/domain/ → 결과 0건
□ 모든 DiningRecord 필드가 DATA_MODEL.md records 테이블 컬럼과 1:1 매핑 (camelCase)
□ RecordPhoto 필드가 DATA_MODEL.md record_photos 테이블 컬럼과 1:1 매핑
□ RecordTargetType: 'restaurant' | 'wine' — 2종만
□ RecordStatus: 'checked' | 'rated' | 'draft' — 3종만
□ WineStatus: 'tasted' | 'cellar' | 'wishlist' — 3종만
□ CameraMode: 'individual' | 'shelf' | 'receipt' — 3종만
□ RestaurantScene: 6종 (solo, romantic, friends, family, business, drinks)
□ WineScene: 7종 (solo, romantic, gathering, pairing, gift, tasting, decanting)
□ MealTime: 4종 (breakfast, lunch, dinner, snack)
□ PairingCategory: 8종 (red_meat ~ charcuterie)
□ AromaSectorId: 15종 (Ring1: 8 + Ring2: 4 + Ring3: 3)
□ calculateAutoScore 공식: 50 + complexityBonus(activeRingCount) + finish×0.1 + balance×0.15 → clamp(1,100)
□ getCircleRatingSize 공식: 28 + (score/100) × 92
□ getRefDotSize: 14/20/26/36/48px 5단계
□ getGaugeLevel: 1~5 단계
□ RecordRepository: 9개 메서드 (create, findById, findByUserId, findByUserAndTarget, update, delete, findPhotosByRecordId, deletePhoto, markWishlistVisited) — 사진 저장은 PhotoRepository 책임 (DEC-007)
□ companions 필드 JSDoc에 비공개 경고 명시
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any, as any, @ts-ignore, ! 단언 0개
```
