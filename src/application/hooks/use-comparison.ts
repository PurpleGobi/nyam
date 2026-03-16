'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import type { ComparisonAspect } from '@/domain/entities/comparison'

interface ComparisonRecord {
  id: string
  menuName: string
  category: string
  ratingOverall: number
}

interface CategoryInfo {
  category: string
  count: number
}

interface Matchup {
  recordA: ComparisonRecord
  recordB: ComparisonRecord
  aspect: ComparisonAspect
  round: number
  matchIndex: number
}

interface MatchResult {
  recordAId: string
  recordBId: string
  winnerId: string
  aspect: ComparisonAspect
  round: number
}

interface RankingEntry {
  id: string
  menuName: string
  category: string
  ratingOverall: number
  wins: number
  total: number
}

interface AspectWinner {
  aspect: string
  menuName: string
}

interface ComparisonResults {
  rankings: RankingEntry[]
  aspectWinners: AspectWinner[]
}

type ComparisonStep = 'category-select' | 'playing' | 'result'

const ASPECTS: ComparisonAspect[] = ['taste', 'atmosphere', 'value', 'revisit']
const ASPECT_LABELS: Record<ComparisonAspect, string> = {
  taste: '맛',
  atmosphere: '분위기',
  value: '가성비',
  revisit: '재방문',
  overall: '종합',
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function useComparison(userId: string | undefined) {
  const [step, setStep] = useState<ComparisonStep>('category-select')
  const [availableCategories, setAvailableCategories] = useState<CategoryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Tournament state
  const [bracketRecords, setBracketRecords] = useState<ComparisonRecord[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [roundContestants, setRoundContestants] = useState<ComparisonRecord[]>([])
  const [roundWinners, setRoundWinners] = useState<ComparisonRecord[]>([])
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [results, setResults] = useState<ComparisonResults | null>(null)
  const [comparisonId, setComparisonId] = useState<string | null>(null)

  // Fetch categories with 4+ records
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchCategories = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('records')
        .select('category')
        .eq('user_id', userId)
        .not('category', 'is', null)
        .neq('category', '')

      if (error || !data) {
        setLoading(false)
        return
      }

      const counts: Record<string, number> = {}
      for (const row of data) {
        const cat = (row as Record<string, unknown>).category as string
        if (cat) {
          counts[cat] = (counts[cat] ?? 0) + 1
        }
      }

      const categories = Object.entries(counts)
        .filter(([, count]) => count >= 4)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)

      setAvailableCategories(categories)
      setLoading(false)
    }

    fetchCategories()
  }, [userId])

  // Compute current matchup
  const currentMatchup: Matchup | null = useMemo(() => {
    if (step !== 'playing' || roundContestants.length < 2) return null

    const matchPairIndex = currentMatchIndex * 2
    if (matchPairIndex + 1 >= roundContestants.length) return null

    const aspectIndex = matchResults.length % ASPECTS.length
    const aspect = ASPECTS[aspectIndex]

    return {
      recordA: roundContestants[matchPairIndex],
      recordB: roundContestants[matchPairIndex + 1],
      aspect,
      round: currentRound,
      matchIndex: currentMatchIndex,
    }
  }, [step, roundContestants, currentMatchIndex, currentRound, matchResults.length])

  // Total and completed matches
  const totalMatches = useMemo(() => {
    const n = bracketRecords.length
    if (n < 2) return 0
    return n - 1 // total matches in single-elimination
  }, [bracketRecords.length])

  const completedMatches = matchResults.length

  const startComparison = useCallback(async (category: string) => {
    if (!userId) return

    const supabase = createClient()

    // Fetch top records by ratingOverall
    const { data, error } = await supabase
      .from('records')
      .select('id, menu_name, category, rating_overall')
      .eq('user_id', userId)
      .eq('category', category)
      .not('category', 'is', null)
      .order('rating_overall', { ascending: false })
      .limit(8)

    if (error || !data || data.length < 4) return

    const records: ComparisonRecord[] = data.map((row) => ({
      id: row.id,
      menuName: (row as Record<string, unknown>).menu_name as string ?? '',
      category: (row as Record<string, unknown>).category as string ?? '',
      ratingOverall: (row as Record<string, unknown>).rating_overall as number ?? 0,
    }))

    // Determine bracket size: 4 or 8
    const bracketSize = records.length >= 8 ? 8 : 4
    const bracketEntries = shuffle(records.slice(0, bracketSize))

    // Save comparison to DB
    const { data: compData } = await supabase
      .from('comparisons' as never)
      .insert({
        user_id: userId,
        category,
        bracket_size: bracketSize,
        status: 'in_progress',
      } as never)
      .select()
      .single()

    const newComparisonId = compData ? (compData as Record<string, unknown>).id as string : null

    setSelectedCategory(category)
    setBracketRecords(bracketEntries)
    setRoundContestants(bracketEntries)
    setRoundWinners([])
    setCurrentRound(1)
    setCurrentMatchIndex(0)
    setMatchResults([])
    setResults(null)
    setComparisonId(newComparisonId)
    setStep('playing')
  }, [userId])

  const pickWinner = useCallback(async (winnerId: string) => {
    if (!currentMatchup) return

    const { recordA, recordB, aspect, round } = currentMatchup
    const loserId = winnerId === recordA.id ? recordB.id : recordA.id

    // Record this match result
    const result: MatchResult = {
      recordAId: recordA.id,
      recordBId: recordB.id,
      winnerId,
      aspect,
      round,
    }

    const newResults = [...matchResults, result]
    setMatchResults(newResults)

    // Save matchup to DB
    if (comparisonId) {
      const supabase = createClient()
      try {
        await supabase
          .from('comparison_matchups' as never)
          .insert({
            comparison_id: comparisonId,
            round,
            aspect,
            record_a_id: recordA.id,
            record_b_id: recordB.id,
            winner_id: winnerId,
          } as never)
      } catch {
        // fire-and-forget
      }
    }

    // Find the winner record object
    const winnerRecord = winnerId === recordA.id ? recordA : recordB
    const newRoundWinners = [...roundWinners, winnerRecord]

    const matchesInRound = Math.floor(roundContestants.length / 2)
    const nextMatchIndex = currentMatchIndex + 1

    if (nextMatchIndex < matchesInRound) {
      // More matches in this round
      setRoundWinners(newRoundWinners)
      setCurrentMatchIndex(nextMatchIndex)
    } else {
      // Round complete
      if (newRoundWinners.length === 1) {
        // Tournament complete - calculate results
        const winCounts: Record<string, number> = {}
        const totalCounts: Record<string, number> = {}
        const aspectWins: Record<string, Record<string, number>> = {}

        for (const r of newResults) {
          winCounts[r.winnerId] = (winCounts[r.winnerId] ?? 0) + 1
          totalCounts[r.recordAId] = (totalCounts[r.recordAId] ?? 0) + 1
          totalCounts[r.recordBId] = (totalCounts[r.recordBId] ?? 0) + 1

          if (!aspectWins[r.aspect]) aspectWins[r.aspect] = {}
          aspectWins[r.aspect][r.winnerId] = (aspectWins[r.aspect][r.winnerId] ?? 0) + 1
        }

        // Build rankings from all bracket records
        const rankings: RankingEntry[] = bracketRecords
          .map((rec) => ({
            ...rec,
            wins: winCounts[rec.id] ?? 0,
            total: totalCounts[rec.id] ?? 0,
          }))
          .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins
            return b.ratingOverall - a.ratingOverall
          })

        // Find aspect winners
        const aspectWinnersList: AspectWinner[] = ASPECTS.map((asp) => {
          const wins = aspectWins[asp] ?? {}
          let bestId = ''
          let bestCount = 0
          for (const [id, count] of Object.entries(wins)) {
            if (count > bestCount) {
              bestId = id
              bestCount = count
            }
          }
          const record = bracketRecords.find((r) => r.id === bestId)
          return {
            aspect: ASPECT_LABELS[asp],
            menuName: record?.menuName ?? '',
          }
        }).filter((aw) => aw.menuName !== '')

        // Score scaling: adjust ratings based on user picks
        // If user picked A over B for "taste" but A.rating_taste < B.rating_taste,
        // nudge both toward alignment with the pick
        const supabase = createClient()
        const K = 8 // adjustment factor (gentle nudge per comparison)

        const ASPECT_TO_COLUMN: Record<string, string> = {
          taste: 'rating_taste',
          atmosphere: 'rating_atmosphere',
          value: 'rating_value',
          revisit: 'rating_overall',
        }

        for (const r of newResults) {
          const col = ASPECT_TO_COLUMN[r.aspect]
          if (!col) continue

          const loserId = r.winnerId === r.recordAId ? r.recordBId : r.recordAId

          // Fetch current scores
          const { data: scores } = await supabase
            .from('records')
            .select('*')
            .in('id', [r.winnerId, loserId])

          if (!scores || scores.length !== 2) continue

          const rows = scores as unknown as Record<string, unknown>[]
          const winnerRow = rows.find(s => s.id === r.winnerId)
          const loserRow = rows.find(s => s.id === loserId)
          if (!winnerRow || !loserRow) continue

          const winnerScore = winnerRow[col] as number ?? 0
          const loserScore = loserRow[col] as number ?? 0

          // Only adjust if winner has lower or equal score (contradicts user pick)
          if (winnerScore <= loserScore) {
            const newWinner = Math.min(100, winnerScore + K)
            const newLoser = Math.max(0, loserScore - K)

            const winnerCompCount = (winnerRow.comparison_count as number ?? 0) + 1
            const loserCompCount = (loserRow.comparison_count as number ?? 0) + 1

            await supabase
              .from('records')
              .update({ [col]: newWinner, comparison_count: winnerCompCount } as never)
              .eq('id', r.winnerId)

            await supabase
              .from('records')
              .update({ [col]: newLoser, comparison_count: loserCompCount } as never)
              .eq('id', loserId)
          } else {
            // Scores already align, just increment comparison_count
            const winnerCompCount = (winnerRow.comparison_count as number ?? 0) + 1
            const loserCompCount = (loserRow.comparison_count as number ?? 0) + 1

            await supabase
              .from('records')
              .update({ comparison_count: winnerCompCount } as never)
              .eq('id', r.winnerId)

            await supabase
              .from('records')
              .update({ comparison_count: loserCompCount } as never)
              .eq('id', loserId)
          }
        }

        // Update comparison in DB
        if (comparisonId) {
          try {
            await supabase
              .from('comparisons' as never)
              .update({
                status: 'completed',
                winner_record_id: rankings[0]?.id ?? null,
                completed_at: new Date().toISOString(),
              } as never)
              .eq('id' as never, comparisonId as never)
          } catch {
            // fire-and-forget
          }
        }

        // Award XP
        try {
          await supabase.from('phase_completions' as never).insert({
            user_id: userId,
            record_id: null,
            phase: 3,
            xp_earned: 5,
          } as never)
        } catch {
          // fire-and-forget
        }

        setResults({ rankings, aspectWinners: aspectWinnersList })
        setStep('result')
      } else {
        // Advance to next round
        setRoundContestants(newRoundWinners)
        setRoundWinners([])
        setCurrentRound((prev) => prev + 1)
        setCurrentMatchIndex(0)
      }
    }
  }, [currentMatchup, matchResults, roundWinners, roundContestants, currentMatchIndex, bracketRecords, comparisonId])

  const reset = useCallback(() => {
    setStep('category-select')
    setSelectedCategory(null)
    setBracketRecords([])
    setRoundContestants([])
    setRoundWinners([])
    setCurrentRound(0)
    setCurrentMatchIndex(0)
    setMatchResults([])
    setResults(null)
    setComparisonId(null)
  }, [])

  return {
    step,
    loading,
    availableCategories,
    selectedCategory,
    currentMatchup,
    results,
    totalMatches,
    completedMatches,
    startComparison,
    pickWinner,
    reset,
  }
}

export { ASPECT_LABELS }
export type { ComparisonRecord, RankingEntry, AspectWinner, ComparisonResults, Matchup }
