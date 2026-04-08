'use client'

import { useState, useEffect } from 'react'
import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { LinkedRestaurantCard } from '@/domain/repositories/wine-repository'
import type { PredictionBreakdown } from '@/domain/entities/similarity'
import { wineRepo } from '@/shared/di/container'
import { useNyamScore } from '@/application/hooks/use-nyam-score'

export interface WineNyamScoreBreakdown {
  vivinoRating: number | null
  wsScore: number | null
  classification: string | null
  baseScore: number
  prestigeBonus: number
  finalScore: number
}

export interface WineDetailState {
  wine: Wine | null
  myRecords: DiningRecord[]
  recordPhotos: Map<string, RecordPhoto[]>
  quadrantRefs: QuadrantRefDot[]
  linkedRestaurants: LinkedRestaurantCard[]
  bubbleScores: BubbleScoreRow[]
  isLoading: boolean
  error: string | null

  // 파생값
  myAvgScore: number | null
  tastingCount: number
  latestTastingDate: string | null
  nyamScoreBreakdown: WineNyamScoreBreakdown | null
  bubbleAvgScore: number | null
  bubbleCount: number
  publicRecords: DiningRecord[]
  nyamAvgScore: number | null
  nyamCount: number
  nyamConfidence: number | null
  nyamBreakdown: PredictionBreakdown | null
  viewMode: 'my_records' | 'recommend' | 'bubble_review'
}

export function useWineDetail(
  wineId: string,
  userId: string | null,
): WineDetailState {
  const repo = wineRepo
  const [wine, setWine] = useState<Wine | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [recordPhotos, setRecordPhotos] = useState<Map<string, RecordPhoto[]>>(new Map())
  const [quadrantRefs, setQuadrantRefs] = useState<QuadrantRefDot[]>([])
  const [linkedRestaurants, setLinkedRestaurants] = useState<LinkedRestaurantCard[]>([])
  const [bubbleScores, setBubbleScores] = useState<BubbleScoreRow[]>([])
  const [publicRecords, setPublicRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CF 기반 Nyam 점수
  const { prediction: nyamPrediction } = useNyamScore(wineId, 'wine', userId)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        // 1. 와인 조회
        const wineData = await repo.findById(wineId)
        setWine(wineData)

        if (!userId) return

        // 2. 내 기록
        const records = await repo.findMyRecords(wineId, userId)
        setMyRecords(records)

        // 3. records 유무와 무관한 fetch (항상 실행)
        const [scoresResult, publicResult] = await Promise.allSettled([
          repo.findBubbleScores(wineId, userId),
          repo.findPublicRecordsByTarget(wineId, userId),
        ])
        if (scoresResult.status === 'fulfilled') setBubbleScores(scoresResult.value)
        setPublicRecords(publicResult.status === 'fulfilled' ? publicResult.value : [])

        // 4. 모든 소스 기록의 사진, 사분면, 연결 식당
        const fetchedPublic = publicResult.status === 'fulfilled' ? publicResult.value : []
        const allRecordIds = [
          ...records.map((r) => r.id),
          ...fetchedPublic.map((r) => r.id),
        ]
        if (allRecordIds.length > 0) {
          const [photosRes, refsRes, linkedRes] = await Promise.allSettled([
            repo.findRecordPhotos(allRecordIds),
            records.length > 0 ? repo.findQuadrantRefs(userId, wineId) : Promise.resolve([]),
            records.length > 0 ? repo.findLinkedRestaurants(wineId, userId) : Promise.resolve([]),
          ])
          if (photosRes.status === 'fulfilled') setRecordPhotos(photosRes.value)
          if (refsRes.status === 'fulfilled') setQuadrantRefs(refsRes.value)
          if (linkedRes.status === 'fulfilled') setLinkedRestaurants(linkedRes.value)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '데이터 로딩 실패')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [wineId, userId, repo])

  // 파생값 계산
  const myAvgScore = myRecords.length > 0
    ? Math.round(myRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / myRecords.length)
    : null

  const tastingCount = myRecords.length

  const latestTastingDate = myRecords.length > 0
    ? (myRecords[0].visitDate ?? myRecords[0].createdAt.split('T')[0])
    : null

  const nyamScoreBreakdown: WineNyamScoreBreakdown | null = wine?.nyamScore != null
    ? {
        vivinoRating: wine.vivinoRating,
        wsScore: wine.criticScores?.WS ?? null,
        classification: wine.classification,
        baseScore: wine.nyamScore - (wine.classification ? 5 : 0),
        prestigeBonus: wine.classification ? 5 : 0,
        finalScore: wine.nyamScore,
      }
    : null

  const bubbleWithScores = bubbleScores.filter((b) => b.avgScore !== null)
  const bubbleAvgScore = bubbleWithScores.length > 0
    ? Math.round(bubbleWithScores.reduce((sum, b) => sum + (b.avgScore ?? 0), 0) / bubbleWithScores.length)
    : null

  const bubbleCount = bubbleScores.length

  // CF 기반 Nyam 점수 파생값
  const nyamAvgScore = nyamPrediction?.satisfaction ?? null
  const nyamCount = nyamPrediction?.nRaters ?? 0
  const nyamConfidence = nyamPrediction?.confidence ?? null
  const nyamBreakdown = nyamPrediction?.breakdown ?? null

  const viewMode: WineDetailState['viewMode'] =
    myRecords.length > 0 ? 'my_records'
    : bubbleScores.length > 0 ? 'bubble_review'
    : 'recommend'

  return {
    wine,
    myRecords,
    recordPhotos,
    quadrantRefs,
    linkedRestaurants,
    bubbleScores,
    publicRecords,
    isLoading,
    error,
    myAvgScore,
    tastingCount,
    latestTastingDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    nyamAvgScore,
    nyamCount,
    nyamConfidence,
    nyamBreakdown,
    viewMode,
  }
}
