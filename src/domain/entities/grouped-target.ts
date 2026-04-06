// src/domain/entities/grouped-target.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordTargetType, ListStatus, RecordWithTarget } from '@/domain/entities/record'

/** 식당/와인별 그룹화된 데이터 (홈 카드/리스트 뷰용) */
export interface GroupedTarget {
  // 대상 식별
  targetId: string
  targetType: RecordTargetType
  targetName: string
  targetMeta: string | null
  targetArea: string | null
  targetPhotoUrl: string | null
  targetLat: number | null
  targetLng: number | null

  // 최신 방문 기록 기준
  latestRecordId: string
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  scene: string | null
  visitDate: string | null
  listStatus: ListStatus | undefined
  createdAt: string

  // 대표 평균 점수의 출처 source (나→팔로잉→버블→공개 폴백)
  averageSource?: string

  // 집계
  visitCount: number
  allRecords: RecordWithTarget[]

  // 필터 호환용 식당 메타
  genre?: string | null
  district?: string | null
  area?: string[] | null
  priceRange?: number | null
  michelinStars?: number | null
  hasBlueRibbon?: boolean | null
  mediaAppearances?: string[] | null

  // 와인 메타
  wineType?: string | null
  variety?: string | null
  country?: string | null
  region?: string | null
  vintage?: number | null
}
