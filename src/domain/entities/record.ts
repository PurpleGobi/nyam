// src/domain/entities/record.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RestaurantPrestige } from '@/domain/entities/restaurant'

// ─── 공통 타입 ───

/** target_type: 'restaurant' | 'wine' */
export type RecordTargetType = 'restaurant' | 'wine'

/** records.camera_mode */
export type CameraMode = 'individual' | 'shelf' | 'receipt'

/** records.meal_time */
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** records.pairing_categories (와인 기록 전용) */
export type PairingCategory =
  | 'red_meat' | 'white_meat' | 'seafood' | 'cheese'
  | 'vegetable' | 'spicy' | 'dessert' | 'charcuterie'

// ─── Record 엔티티 (방문/시음 1회) ───

export interface DiningRecord {
  id: string
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
  aromaPrimary: string[]
  aromaSecondary: string[]
  aromaTertiary: string[]
  complexity: number | null
  finish: number | null
  balance: number | null
  intensity: number | null
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
  targetPhotos: string[]
  targetLat: number | null
  targetLng: number | null
  source?: RecordSource
  genre?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  area?: string[] | null
  priceRange?: number | null
  prestige?: RestaurantPrestige[] | null
  wineType?: string | null
  variety?: string | null
  region?: string | null
  vintage?: number | null
  // 작성자 정보 (Viewer Context)
  authorId?: string | null
  authorNickname?: string | null
  authorAvatarUrl?: string | null
}

// ─── 기록 생성 입력 타입 ───

export interface CreateRecordInput {
  userId: string
  targetId: string
  targetType: RecordTargetType
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

