'use client'

// src/application/hooks/use-target-scores.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useMemo } from 'react'
import type { TargetScores, ScoreSource, BubbleScoreEntry } from '@/domain/entities/score'
import { getScoreFallback } from '@/domain/services/score-fallback'

export type QuadrantViewMode = 'visits' | 'compare'

interface ScoreCardState {
  selectedSources: ScoreSource[]
  quadrantMode: QuadrantViewMode
  expandedPanel: 'nyam' | 'bubble' | null
}

interface UseTargetScoresParams {
  myAvgScore: number | null
  myCount: number
  bubbleScoreEntries: BubbleScoreEntry[]  // 버블별 점수 목록
  nyamAvgScore: number | null
  nyamCount: number
  nyamConfidence: number | null
}

/**
 * 버블 점수 목록에서 확신도 최고 버블을 대표로 선택.
 * 기록 1건+ 있는 버블만 대상.
 */
function selectRepresentativeBubble(entries: BubbleScoreEntry[]): {
  score: number | null
  confidence: number
  count: number
} {
  const eligible = entries.filter(b => b.raterCount >= 1 && b.score !== null)
  if (eligible.length === 0) return { score: null, confidence: 0, count: 0 }

  let best = eligible[0]
  for (let i = 1; i < eligible.length; i++) {
    if (eligible[i].confidence > best.confidence) best = eligible[i]
  }
  return {
    score: best.score,
    confidence: best.confidence,
    count: eligible.length,
  }
}

export function useTargetScores(params: UseTargetScoresParams) {
  const {
    myAvgScore, myCount,
    bubbleScoreEntries,
    nyamAvgScore, nyamCount, nyamConfidence,
  } = params

  // 버블 대표 점수 (확신도 최고)
  const bubbleRepresentative = useMemo(
    () => selectRepresentativeBubble(bubbleScoreEntries),
    [bubbleScoreEntries],
  )

  const scores: TargetScores = useMemo(() => ({
    mine: myAvgScore !== null ? { avg: myAvgScore, count: myCount } : null,
    nyam: nyamAvgScore !== null ? { avg: nyamAvgScore, count: nyamCount, confidence: nyamConfidence ?? 0 } : null,
    bubble: bubbleRepresentative.score !== null
      ? { avg: bubbleRepresentative.score, count: bubbleRepresentative.count, confidence: bubbleRepresentative.confidence }
      : null,
  }), [myAvgScore, myCount, bubbleRepresentative, nyamAvgScore, nyamCount, nyamConfidence])

  const fallback = useMemo(() => getScoreFallback(scores), [scores])

  const [state, setState] = useState<ScoreCardState>({
    selectedSources: [fallback?.source ?? 'mine'],
    quadrantMode: 'visits',
    expandedPanel: null,
  })

  // 데이터 로딩 후 최초 1회 fallback 소스로 동기화 (렌더 중 setState 패턴)
  const [initialized, setInitialized] = useState(false)
  if (!initialized && fallback) {
    setInitialized(true)
    setState((prev) => ({
      ...prev,
      selectedSources: [fallback.source],
    }))
  }

  // 카드 데이터 배열 (ScoreCards 컴포넌트에 직접 전달)
  const cards = useMemo(() => [
    { source: 'mine' as const, label: '나', score: myAvgScore, subText: myCount > 0 ? `${myCount}회` : '미방문', available: myAvgScore !== null },
    { source: 'bubble' as const, label: '버블', score: bubbleRepresentative.score, subText: bubbleRepresentative.confidence > 0 ? `확신 ${Math.round(bubbleRepresentative.confidence * 100)}%` : '', available: bubbleRepresentative.score !== null, confidence: bubbleRepresentative.confidence, expandable: true },
    { source: 'nyam' as const, label: 'Nyam', score: nyamAvgScore, subText: nyamConfidence !== null ? `확신 ${Math.round(nyamConfidence * 100)}%` : '', available: nyamAvgScore !== null, confidence: nyamConfidence, expandable: true },
  ], [myAvgScore, myCount, bubbleRepresentative, nyamAvgScore, nyamConfidence])

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

  const togglePanel = (panel: 'nyam' | 'bubble') => {
    setState((prev) => ({
      ...prev,
      expandedPanel: prev.expandedPanel === panel ? null : panel,
    }))
  }

  return {
    scores,
    fallback,
    cards,
    selectedSources: state.selectedSources,
    quadrantMode: state.quadrantMode,
    expandedPanel: state.expandedPanel,
    toggleSource,
    setQuadrantMode,
    togglePanel,
    bubbleScoreEntries: bubbleScoreEntries,
    // visits 모드에서 점수 카드 토글이 활성인지
    isCardToggleActive: state.quadrantMode === 'visits',
  }
}
