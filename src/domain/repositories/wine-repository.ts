// src/domain/repositories/wine-repository.ts
// R1: 외부 의존 0

import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { WineSearchResult } from '@/domain/entities/search'
import type { CreateWineInput } from '@/domain/entities/register'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'

export type { CreateWineInput }

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

  /** 해당 와인의 타인 공개 기록 (RLS가 is_public 필터링, dot 표시용) */
  findPublicRecordsByTarget(wineId: string, excludeUserId: string): Promise<DiningRecord[]>

  /** 기록별 사진 */
  findRecordPhotos(recordIds: string[]): Promise<Map<string, RecordPhoto[]>>

  /** 사분면 표시용: 내가 리뷰한 다른 와인의 평균 좌표 (최대 12개) */
  findQuadrantRefs(userId: string, excludeId: string): Promise<QuadrantRefDot[]>

  /** 연결된 식당 (linked_restaurant_id가 있는 기록의 식당) */
  findLinkedRestaurants(wineId: string, userId: string): Promise<LinkedRestaurantCard[]>

  /** 버블 점수 집계 */
  findBubbleScores(wineId: string, userId: string): Promise<BubbleScoreRow[]>

  /** 팔로잉 유저들의 해당 와인 기록 (satisfaction 있는 것만) */
  findFollowingRecordsByTarget(wineId: string, userId: string): Promise<DiningRecord[]>

  /** 공개 사용자의 해당 와인 satisfaction 평균 + 인원수 */
  findPublicSatisfactionAvg(wineId: string, excludeUserId?: string): Promise<{ avg: number; count: number } | null>
}
