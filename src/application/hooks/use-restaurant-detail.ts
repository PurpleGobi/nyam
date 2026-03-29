'use client'

// src/application/hooks/use-restaurant-detail.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

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
import type { NyamScoreBreakdown } from '@/domain/services/nyam-score'
import { calcNyamScore } from '@/domain/services/nyam-score'

/** 뷰 모드 */
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
  myAvgScore: number | null
  visitCount: number
  latestVisitDate: string | null
  nyamScoreBreakdown: NyamScoreBreakdown | null
  bubbleAvgScore: number | null
  bubbleCount: number
  viewMode: RestaurantViewMode
}

export function useRestaurantDetail(
  restaurantId: string,
  userId: string | null,
  repo: RestaurantRepository,
): RestaurantDetailState {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [recordPhotos, setRecordPhotos] = useState<Map<string, RecordPhoto[]>>(new Map())
  const [quadrantRefs, setQuadrantRefs] = useState<QuadrantRefDot[]>([])
  const [linkedWines, setLinkedWines] = useState<LinkedWineCard[]>([])
  const [bubbleScores, setBubbleScores] = useState<BubbleScoreRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        // 1. 식당 기본 정보
        const r = await repo.findById(restaurantId)
        if (cancelled) return
        setRestaurant(r)
        if (!r) {
          setError('식당을 찾을 수 없습니다')
          return
        }

        if (!userId) return

        // 2. 내 기록 + 버블 점수 (병렬)
        const [records, bubbles] = await Promise.all([
          repo.findMyRecords(restaurantId, userId),
          repo.findBubbleScores(restaurantId, userId),
        ])
        if (cancelled) return
        setMyRecords(records)
        setBubbleScores(bubbles)

        // 3. 기록이 있을 때만: 사진, 사분면, 연결 와인 (병렬)
        if (records.length > 0) {
          const recordIds = records.map((rec) => rec.id)
          const [photos, refs, wines] = await Promise.all([
            repo.findRecordPhotos(recordIds),
            repo.findQuadrantRefs(userId, restaurantId),
            repo.findLinkedWines(restaurantId, userId),
          ])
          if (cancelled) return
          setRecordPhotos(photos)
          setQuadrantRefs(refs)
          setLinkedWines(wines)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '데이터 로딩 실패')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [restaurantId, userId, repo])

  // 파생값 계산
  const scoredRecords = myRecords.filter((r) => r.avgSatisfaction !== null)
  const myAvgScore = scoredRecords.length > 0
    ? Math.round(
        scoredRecords.reduce((sum, r) => sum + (r.avgSatisfaction ?? 0), 0) /
          scoredRecords.length,
      )
    : null

  const visitCount = myRecords.reduce((sum, r) => sum + r.visitCount, 0)

  const latestVisitDate = myRecords.length > 0
    ? (myRecords[0].latestVisitDate ?? myRecords[0].createdAt.split('T')[0])
    : null

  const nyamScoreBreakdown = restaurant
    ? calcNyamScore(restaurant)
    : null

  const scoredBubbles = bubbleScores.filter((b) => b.avgScore !== null)
  const bubbleAvgScore = scoredBubbles.length > 0
    ? Math.round(
        scoredBubbles.reduce((sum, b) => sum + (b.avgScore ?? 0), 0) /
          scoredBubbles.length,
      )
    : null

  const bubbleCount = bubbleScores.length

  // 뷰 모드 결정
  const viewMode: RestaurantViewMode =
    myRecords.length > 0
      ? 'my_records'
      : bubbleScores.length > 0
        ? 'bubble_review'
        : 'recommend'

  return {
    restaurant,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedWines,
    bubbleScores,
    isLoading,
    error,
    myAvgScore,
    visitCount,
    latestVisitDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    viewMode,
  }
}
