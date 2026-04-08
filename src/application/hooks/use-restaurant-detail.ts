'use client'

// src/application/hooks/use-restaurant-detail.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect } from 'react'
import type { Restaurant } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type {
  QuadrantRefDot,
  LinkedWineCard,
  BubbleScoreRow,
} from '@/domain/repositories/restaurant-repository'
import type { PredictionBreakdown } from '@/domain/entities/similarity'
import { restaurantRepo } from '@/shared/di/container'
import { useNyamScore } from '@/application/hooks/use-nyam-score'

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
  publicRecords: DiningRecord[]
  isLoading: boolean
  error: string | null

  // 파생값
  myAvgScore: number | null
  visitCount: number
  latestVisitDate: string | null
  bubbleAvgScore: number | null
  bubbleCount: number
  nyamAvgScore: number | null
  nyamCount: number
  nyamConfidence: number | null
  nyamBreakdown: PredictionBreakdown | null
  viewMode: RestaurantViewMode
}

export function useRestaurantDetail(
  restaurantId: string,
  userId: string | null,
): RestaurantDetailState {
  const repo = restaurantRepo
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [recordPhotos, setRecordPhotos] = useState<Map<string, RecordPhoto[]>>(new Map())
  const [quadrantRefs, setQuadrantRefs] = useState<QuadrantRefDot[]>([])
  const [linkedWines, setLinkedWines] = useState<LinkedWineCard[]>([])
  const [bubbleScores, setBubbleScores] = useState<BubbleScoreRow[]>([])
  const [publicRecords, setPublicRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CF 기반 Nyam 점수
  const { prediction: nyamPrediction } = useNyamScore(restaurantId, 'restaurant', userId)

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

        // 2. 내 기록 + 타인 공개 기록 + 버블 점수 (각각 독립)
        const [recordsResult, publicRecordsResult, bubblesResult] = await Promise.allSettled([
          repo.findMyRecords(restaurantId, userId),
          repo.findPublicRecordsByTarget(restaurantId, userId),
          repo.findBubbleScores(restaurantId, userId),
        ])
        if (cancelled) return
        const records = recordsResult.status === 'fulfilled' ? recordsResult.value : []
        const fetchedPublicRecords = publicRecordsResult.status === 'fulfilled' ? publicRecordsResult.value : []
        setMyRecords(records)
        setPublicRecords(fetchedPublicRecords)
        if (bubblesResult.status === 'fulfilled') setBubbleScores(bubblesResult.value)

        // 3. 모든 소스 기록의 사진, 사분면, 연결 와인
        const allRecordIds = [
          ...records.map((rec) => rec.id),
          ...fetchedPublicRecords.map((rec) => rec.id),
        ]
        if (allRecordIds.length > 0) {
          const [photosResult, refsResult, winesResult] = await Promise.allSettled([
            repo.findRecordPhotos(allRecordIds),
            records.length > 0 ? repo.findQuadrantRefs(userId, restaurantId) : Promise.resolve([]),
            records.length > 0 ? repo.findLinkedWines(restaurantId, userId) : Promise.resolve([]),
          ])
          if (cancelled) return
          if (photosResult.status === 'fulfilled') setRecordPhotos(photosResult.value)
          if (refsResult.status === 'fulfilled') setQuadrantRefs(refsResult.value)
          if (winesResult.status === 'fulfilled') setLinkedWines(winesResult.value)
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
  const scoredRecords = myRecords.filter((r) => r.satisfaction !== null)
  const myAvgScore = scoredRecords.length > 0
    ? Math.round(
        scoredRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) /
          scoredRecords.length,
      )
    : null

  const visitCount = myRecords.length

  const latestVisitDate = myRecords.length > 0
    ? (myRecords[0].visitDate ?? myRecords[0].createdAt.split('T')[0])
    : null

  const scoredBubbles = bubbleScores.filter((b) => b.avgScore !== null)
  const bubbleAvgScore = scoredBubbles.length > 0
    ? Math.round(
        scoredBubbles.reduce((sum, b) => sum + (b.avgScore ?? 0), 0) /
          scoredBubbles.length,
      )
    : null

  const bubbleCount = bubbleScores.length

  // CF 기반 Nyam 점수 파생값
  const nyamAvgScore = nyamPrediction?.satisfaction ?? null
  const nyamCount = nyamPrediction?.nRaters ?? 0
  const nyamConfidence = nyamPrediction?.confidence ?? null
  const nyamBreakdown = nyamPrediction?.breakdown ?? null

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
    publicRecords,
    isLoading,
    error,
    myAvgScore,
    visitCount,
    latestVisitDate,
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
    nyamConfidence,
    nyamBreakdown,
    viewMode,
  }
}
