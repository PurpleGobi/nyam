// src/domain/repositories/restaurant-repository.ts
// R1: 외부 의존 0

import type { Restaurant } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'
import type { CreateRestaurantInput } from '@/domain/entities/register'

export type { CreateRestaurantInput }

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

  /** 해당 식당의 타인 공개 기록 (RLS가 is_public 필터링) */
  findPublicRecordsByTarget(restaurantId: string, excludeUserId: string): Promise<DiningRecord[]>

  /** 기록별 사진 (order_index ASC) */
  findRecordPhotos(recordIds: string[]): Promise<Map<string, RecordPhoto[]>>

  /** 사분면 표시용: 내가 리뷰한 다른 식당들의 평균 좌표 (최대 12개) */
  findQuadrantRefs(userId: string, excludeId: string): Promise<QuadrantRefDot[]>

  /** 연결된 와인 목록 (linked_wine_id가 있는 기록의 와인) */
  findLinkedWines(restaurantId: string, userId: string): Promise<LinkedWineCard[]>

  /** 버블 점수 집계 (유저가 속한 버블에서 이 식당의 평균점) */
  findBubbleScores(restaurantId: string, userId: string): Promise<BubbleScoreRow[]>

  /** 팔로잉 유저들의 해당 식당 기록 (satisfaction 있는 것만) */
  findFollowingRecordsByTarget(restaurantId: string, userId: string): Promise<DiningRecord[]>

  /** 공개 사용자의 해당 식당 satisfaction 평균 + 인원수 */
  findPublicSatisfactionAvg(restaurantId: string, excludeUserId?: string): Promise<{ avg: number; count: number } | null>
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
  wineType: string | null
  labelImageUrl: string | null
  satisfaction: number | null
}

/** 버블 내 개별 기록 (사분면 dot용) */
export interface BubbleRecordDot {
  axisX: number
  axisY: number
  satisfaction: number
}

/** 버블 점수 행 */
export interface BubbleScoreRow {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  bubbleColor: string | null
  memberCount: number
  avgScore: number | null
  /** 사분면 dot 표시용 개별 기록 좌표 */
  dots: BubbleRecordDot[]
}
