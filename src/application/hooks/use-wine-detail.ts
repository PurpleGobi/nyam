'use client'

import { useState, useEffect } from 'react'
import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { LinkedRestaurantCard, WineRepository } from '@/domain/repositories/wine-repository'

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
  viewMode: 'my_records' | 'recommend' | 'bubble_review'
}

export function useWineDetail(
  wineId: string,
  userId: string | null,
  repo: WineRepository,
): WineDetailState {
  const [wine, setWine] = useState<Wine | null>(null)
  const [myRecords, setMyRecords] = useState<DiningRecord[]>([])
  const [recordPhotos, setRecordPhotos] = useState<Map<string, RecordPhoto[]>>(new Map())
  const [quadrantRefs, setQuadrantRefs] = useState<QuadrantRefDot[]>([])
  const [linkedRestaurants, setLinkedRestaurants] = useState<LinkedRestaurantCard[]>([])
  const [bubbleScores, setBubbleScores] = useState<BubbleScoreRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        // 3. 기록별 사진 + 사분면 + 연결식당 + 버블 (각각 독립 실행)
        if (records.length > 0) {
          const [photosRes, refsRes, linkedRes, scoresRes] = await Promise.allSettled([
            repo.findRecordPhotos(records.map((r) => r.id)),
            repo.findQuadrantRefs(userId, wineId),
            repo.findLinkedRestaurants(wineId, userId),
            repo.findBubbleScores(wineId, userId),
          ])
          if (photosRes.status === 'fulfilled') setRecordPhotos(photosRes.value)
          if (refsRes.status === 'fulfilled') setQuadrantRefs(refsRes.value)
          if (linkedRes.status === 'fulfilled') setLinkedRestaurants(linkedRes.value)
          if (scoresRes.status === 'fulfilled') setBubbleScores(scoresRes.value)
        } else {
          const scores = await repo.findBubbleScores(wineId, userId)
          setBubbleScores(scores)
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
    ? Math.round(bubbleWithScores.reduce((sum, b) => sum + b.avgScore!, 0) / bubbleWithScores.length)
    : null

  const bubbleCount = bubbleScores.length

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
    isLoading,
    error,
    myAvgScore,
    tastingCount,
    latestTastingDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    viewMode,
  }
}
