'use client'

import { useState, useEffect } from 'react'
import type { Wine } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { LinkedRestaurantCard } from '@/domain/repositories/wine-repository'
import type { BubbleScoreEntry } from '@/domain/entities/score'
import type { PredictionBreakdown } from '@/domain/entities/similarity'
import type { PredictionWithBreakdown } from '@/domain/repositories/prediction-repository'
import { computeBubbleConfidence } from '@/domain/services/score-fallback'
import { wineRepo, predictionRepo } from '@/shared/di/container'

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
  bubbleScoreEntries: BubbleScoreEntry[]
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
  const [nyamPrediction, setNyamPrediction] = useState<PredictionWithBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        // 1. 와인 기본 정보
        const wineData = await repo.findById(wineId)
        if (cancelled) return
        setWine(wineData)

        if (!userId) return

        // 2. 모든 독립 데이터를 한 번에 병렬 fetch (워터폴 제거 + CF 예측 병렬화)
        const [recordsResult, publicResult, scoresResult, refsResult, linkedResult, nyamResult] = await Promise.allSettled([
          repo.findMyRecords(wineId, userId),
          repo.findPublicRecordsByTarget(wineId, userId),
          repo.findBubbleScores(wineId, userId),
          repo.findQuadrantRefs(userId, wineId),
          repo.findLinkedRestaurants(wineId, userId),
          predictionRepo.predictScore(userId, wineId, 'wine'),
        ])
        if (cancelled) return

        const records = recordsResult.status === 'fulfilled' ? recordsResult.value : []
        const fetchedPublic = publicResult.status === 'fulfilled' ? publicResult.value : []
        setMyRecords(records)
        setPublicRecords(fetchedPublic)
        if (scoresResult.status === 'fulfilled') setBubbleScores(scoresResult.value)
        if (refsResult.status === 'fulfilled') setQuadrantRefs(refsResult.value)
        if (linkedResult.status === 'fulfilled') setLinkedRestaurants(linkedResult.value)
        if (nyamResult.status === 'fulfilled') setNyamPrediction(nyamResult.value)

        // 3. 사진만 별도 (recordIds 필요)
        const allRecordIds = [
          ...records.map((r) => r.id),
          ...fetchedPublic.map((r) => r.id),
        ]
        if (allRecordIds.length > 0) {
          const photosResult = await repo.findRecordPhotos(allRecordIds)
          if (!cancelled) setRecordPhotos(photosResult)
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

  // CF 기반 Nyam 점수 파생값 — rater 0명이면 점수 없음 처리
  const hasNyamRaters = (nyamPrediction?.nRaters ?? 0) > 0
  const nyamAvgScore = hasNyamRaters ? (nyamPrediction?.satisfaction ?? null) : null
  const nyamCount = nyamPrediction?.nRaters ?? 0
  const nyamConfidence = hasNyamRaters ? (nyamPrediction?.confidence ?? null) : null
  const nyamBreakdown = hasNyamRaters ? (nyamPrediction?.breakdown ?? null) : null

  // 버블 점수 → BubbleScoreEntry 변환 (확신도 heuristic 포함)
  const bubbleScoreEntries: BubbleScoreEntry[] = bubbleScores.map((b) => ({
    bubbleId: b.bubbleId,
    bubbleName: b.bubbleName,
    icon: b.bubbleIcon ?? null,
    iconBgColor: b.bubbleColor ?? null,
    score: b.avgScore,
    confidence: computeBubbleConfidence(b.dots.length),
    memberCount: b.memberCount ?? 0,
    raterCount: b.dots.length,
  }))

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
    bubbleScoreEntries,
    viewMode,
  }
}
