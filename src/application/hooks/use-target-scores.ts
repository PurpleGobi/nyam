'use client'

// src/application/hooks/use-target-scores.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useMemo, useEffect, useRef } from 'react'
import type { TargetScores, ScoreSource } from '@/domain/entities/score'
import { getScoreFallback } from '@/domain/services/score-fallback'
import type { DiningRecord } from '@/domain/entities/record'

export type QuadrantViewMode = 'visits' | 'compare'

interface ScoreCardState {
  selectedSources: ScoreSource[]
  quadrantMode: QuadrantViewMode
}

interface UseTargetScoresParams {
  myAvgScore: number | null
  myCount: number
  followingAvgScore: number | null
  followingCount: number
  bubbleAvgScore: number | null
  bubbleCount: number
  nyamAvgScore: number | null
  nyamCount: number
  /** visits 모드에서 그룹별 dot 데이터를 가져오기 위한 records */
  followingRecords?: DiningRecord[]
  bubbleRecords?: DiningRecord[]
}

export function useTargetScores(params: UseTargetScoresParams) {
  const {
    myAvgScore, myCount,
    followingAvgScore, followingCount,
    bubbleAvgScore, bubbleCount,
    nyamAvgScore, nyamCount,
  } = params

  const scores: TargetScores = useMemo(() => ({
    my: myAvgScore !== null ? { avg: myAvgScore, count: myCount } : null,
    following: followingAvgScore !== null ? { avg: followingAvgScore, count: followingCount } : null,
    bubble: bubbleAvgScore !== null ? { avg: bubbleAvgScore, count: bubbleCount } : null,
    nyam: nyamAvgScore !== null ? { avg: nyamAvgScore, count: nyamCount } : null,
  }), [myAvgScore, myCount, followingAvgScore, followingCount, bubbleAvgScore, bubbleCount, nyamAvgScore, nyamCount])

  const fallback = useMemo(() => getScoreFallback(scores), [scores])

  const [state, setState] = useState<ScoreCardState>({
    selectedSources: [fallback?.source ?? 'my'],
    quadrantMode: 'visits',
  })

  // 데이터 로딩 후 최초 1회 fallback 소스로 초기화
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current || !fallback) return
    initializedRef.current = true
    setState((prev) => ({
      ...prev,
      selectedSources: [fallback.source],
    }))
  }, [fallback])

  // 카드 데이터 배열 (ScoreCards 컴포넌트에 직접 전달)
  const cards = useMemo(() => [
    { source: 'my' as const, label: '나', score: myAvgScore, subText: myCount > 0 ? `${myCount}회 방문` : '미방문', available: myAvgScore !== null },
    { source: 'following' as const, label: '팔로잉', score: followingAvgScore, subText: followingCount > 0 ? `${followingCount}명 평균` : '', available: followingAvgScore !== null },
    { source: 'bubble' as const, label: '버블', score: bubbleAvgScore, subText: bubbleCount > 0 ? `${bubbleCount}명 평균` : '', available: bubbleAvgScore !== null },
    { source: 'nyam' as const, label: 'nyam', score: nyamAvgScore, subText: nyamCount > 0 ? `${nyamCount}명 평균` : '', available: nyamAvgScore !== null },
  ], [myAvgScore, myCount, followingAvgScore, followingCount, bubbleAvgScore, bubbleCount, nyamAvgScore, nyamCount])

  const toggleSource = (source: ScoreSource) => {
    // 점수가 있는 카드만 선택 가능
    if (scores[source] === null) return
    setState((prev) => {
      const current = prev.selectedSources
      const isSelected = current.includes(source)
      // 최소 1개는 선택 유지
      if (isSelected && current.length <= 1) return prev
      const next = isSelected
        ? current.filter((s) => s !== source)
        : [...current, source]
      return { ...prev, selectedSources: next }
    })
  }

  const setQuadrantMode = (mode: QuadrantViewMode) => {
    setState((prev) => ({ ...prev, quadrantMode: mode }))
  }

  return {
    scores,
    fallback,
    cards,
    selectedSources: state.selectedSources,
    quadrantMode: state.quadrantMode,
    toggleSource,
    setQuadrantMode,
    // visits 모드에서 점수 카드 토글이 활성인지
    isCardToggleActive: state.quadrantMode === 'visits',
  }
}
