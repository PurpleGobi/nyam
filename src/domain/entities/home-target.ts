// src/domain/entities/home-target.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

import type { RecordTargetType, DiningRecord, RecordSource } from '@/domain/entities/record'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'

/** 홈 뷰의 1급 시민: target (restaurant 또는 wine) */
export interface HomeTarget {
  // --- Target 본체 ---
  targetId: string
  targetType: RecordTargetType    // 'restaurant' | 'wine'
  name: string
  photoUrl: string | null         // record_photos 우선 -> target.photos[0] 폴백
  allPhotos: string[]             // 해당 record의 전체 사진 (사진 뷰어용)

  // 식당 메타
  genre: string | null
  city: string | null
  district: string | null
  area: string[] | null
  lat: number | null
  lng: number | null
  priceRange: number | null
  prestige: RestaurantPrestige[] | null

  // 와인 메타
  wineType: string | null
  variety: string | null
  country: string | null
  region: string | null
  vintage: number | null

  // --- 관계 상태 ---
  visitCount: number              // 내 records 수 (0 = 방문/시음 없음)
  sources: RecordSource[]         // 이 target이 어떤 경로로 내 목록에 들어왔는지

  // --- 대표 점수 (소스 우선순위 폴백) ---
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  scoreSource: RecordSource | null

  // --- 3종 점수 ---
  myScore: number | null
  nyamScore: number | null
  nyamConfidence: number | null
  bubbleScore: number | null
  bubbleConfidence: number | null

  // --- 최신 기록 요약 ---
  latestRecordId: string | null
  latestVisitDate: string | null
  latestScene: string | null
  latestCreatedAt: string | null

  // --- 전체 records ---
  records: DiningRecord[]
}
