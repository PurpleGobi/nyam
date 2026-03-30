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

export interface DiningRecord {
  id: string
  listId: string
  userId: string
  targetId: string
  targetType: RecordTargetType

  // 사분면 평가
  axisX: number | null
  axisY: number | null
  satisfaction: number | null

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
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  aromaColor: string | null
  complexity: number | null
  finish: number | null
  balance: number | null
  autoScore: number | null

  // 메타
  privateNote: string | null
  companionCount: number | null
  companions: string[] | null
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
  district?: string | null
  area?: string[] | null
  priceRange?: number | null
  michelinStars?: number | null
  hasBlueRibbon?: boolean | null
  mediaAppearances?: string[] | null
  wineType?: string | null
  variety?: string | null
  country?: string | null
  region?: string | null
  vintage?: number | null
  // list 정보
  listStatus?: ListStatus
}

// ─── 기록 생성 입력 타입 ───

export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
  listStatus: ListStatus
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
  aromaRegions?: Record<string, unknown> | null
  aromaLabels?: string[] | null
  aromaColor?: string | null
  complexity?: number | null
  finish?: number | null
  balance?: number | null
  autoScore?: number | null
}

// ─── 하위 호환용 (기존 코드에서 참조하는 타입) ───

/** @deprecated RecordVisit 구조는 제거됨. DiningRecord가 곧 방문 1회. */
export type RecordVisit = Pick<DiningRecord,
  'visitDate' | 'axisX' | 'axisY' | 'satisfaction' | 'scene' | 'comment' |
  'totalPrice' | 'purchasePrice' | 'mealTime' | 'companionCount' | 'companions' |
  'hasExifGps' | 'isExifVerified' | 'aromaRegions' | 'aromaLabels' | 'aromaColor' |
  'complexity' | 'finish' | 'balance' | 'autoScore'
>

/** @deprecated status 필드는 lists.status로 이전 */
export type RecordStatus = 'checked' | 'rated' | 'draft'

/** @deprecated wine_status는 lists.status로 통합 */
export type WineStatus = 'tasted' | 'cellar' | 'wishlist'

/** @deprecated AddVisitInput은 CreateRecordInput으로 대체 */
export interface AddVisitInput {
  recordId: string
  visit: RecordVisit
}

// ─── 헬퍼 ───

/** 평균 만족도 계산 (records 배열) */
export function calcAvgSatisfaction(records: DiningRecord[]): number | null {
  const rated = records.filter((r) => r.satisfaction !== null)
  if (rated.length === 0) return null
  return Math.round(rated.reduce((s, r) => s + r.satisfaction!, 0) / rated.length)
}
