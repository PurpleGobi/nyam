'use client'

import { useState, useEffect } from 'react'
import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { LinkedRestaurantCard } from '@/domain/repositories/wine-repository'
import { wineRepo } from '@/shared/di/container'

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
  followingAvgScore: number | null
  followingCount: number
  followingRecords: DiningRecord[]
  publicRecords: DiningRecord[]
  nyamAvgScore: number | null
  nyamCount: number
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
  const [followingRecords, setFollowingRecords] = useState<DiningRecord[]>([])
  const [publicRecords, setPublicRecords] = useState<DiningRecord[]>([])
  const [nyamData, setNyamData] = useState<{ avg: number; count: number } | null>(null)
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

        // 3. records 유무와 무관한 fetch (항상 실행)
        const [followingResult, nyamResult, scoresResult, publicResult] = await Promise.allSettled([
          repo.findFollowingRecordsByTarget(wineId, userId),
          repo.findPublicSatisfactionAvg(wineId),
          repo.findBubbleScores(wineId, userId),
          repo.findPublicRecordsByTarget(wineId, userId),
        ])
        if (scoresResult.status === 'fulfilled') setBubbleScores(scoresResult.value)
        setFollowingRecords(followingResult.status === 'fulfilled' ? followingResult.value : [])
        setPublicRecords(publicResult.status === 'fulfilled' ? publicResult.value : [])
        setNyamData(nyamResult.status === 'fulfilled' ? nyamResult.value : null)

        // 4. records가 있을 때만 추가 fetch
        if (records.length > 0) {
          const [photosRes, refsRes, linkedRes] = await Promise.allSettled([
            repo.findRecordPhotos(records.map((r) => r.id)),
            repo.findQuadrantRefs(userId, wineId),
            repo.findLinkedRestaurants(wineId, userId),
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

  const scoredFollowing = followingRecords.filter((r) => r.satisfaction !== null)
  const followingAvgScore = scoredFollowing.length > 0
    ? Math.round(scoredFollowing.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / scoredFollowing.length)
    : null
  const followingCount = scoredFollowing.length

  const nyamAvgScore = nyamData?.avg ?? null
  const nyamCount = nyamData?.count ?? 0

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
    followingRecords,
    publicRecords,
    isLoading,
    error,
    myAvgScore,
    tastingCount,
    latestTastingDate,
    nyamScoreBreakdown,
    bubbleAvgScore,
    bubbleCount,
    followingAvgScore,
    followingCount,
    nyamAvgScore,
    nyamCount,
    viewMode,
  }
}
