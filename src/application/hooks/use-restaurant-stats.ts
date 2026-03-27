'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/shared/di/container'

interface CityStats {
  name: string
  lat: number
  lng: number
  visitCount: number
}

interface GenreStats {
  name: string
  count: number
}

interface ScoreBucket {
  label: string
  count: number
}

interface MonthlyStats {
  label: string
  count: number
  amount: number
  isCurrent: boolean
}

interface SceneStats {
  name: string
  count: number
  color: string
}

interface RestaurantStatsResult {
  cityStats: CityStats[]
  genreStats: GenreStats[]
  scoreBuckets: ScoreBucket[]
  monthlyStats: MonthlyStats[]
  sceneStats: SceneStats[]
  isLoading: boolean
  error: string | null
}

const SCORE_LABELS = ['~49', '50s', '60s', '70s', '80s', '90s+']

function buildScoreBuckets(scores: number[]): ScoreBucket[] {
  const counts = [0, 0, 0, 0, 0, 0]

  for (const s of scores) {
    if (s < 50) counts[0]++
    else if (s < 60) counts[1]++
    else if (s < 70) counts[2]++
    else if (s < 80) counts[3]++
    else if (s < 90) counts[4]++
    else counts[5]++
  }

  return SCORE_LABELS.map((label, i) => ({ label, count: counts[i] }))
}

export function useRestaurantStats(userId: string | null): RestaurantStatsResult {
  const [cityStats, setCityStats] = useState<CityStats[]>([])
  const [genreStats, setGenreStats] = useState<GenreStats[]>([])
  const [scoreBuckets, setScoreBuckets] = useState<ScoreBucket[]>(
    SCORE_LABELS.map((label) => ({ label, count: 0 }))
  )
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [sceneStats, setSceneStats] = useState<SceneStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      const { data: records, error: fetchError } = await supabase
        .from('dining_records')
        .select('id, satisfaction, visit_date, amount_spent, restaurant:restaurants(name, genre, city, latitude, longitude, scene)')
        .eq('user_id', userId)
        .eq('target_type', 'restaurant')

      if (fetchError) throw fetchError

      if (!records || records.length === 0) return

      // City stats
      const cityMap = new Map<string, CityStats>()
      for (const r of records) {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        if (!rest?.city) continue
        const city = rest.city as string
        const existing = cityMap.get(city)
        if (existing) {
          existing.visitCount++
        } else {
          cityMap.set(city, {
            name: city,
            lat: (rest.latitude as number) ?? 37.5665,
            lng: (rest.longitude as number) ?? 126.978,
            visitCount: 1,
          })
        }
      }
      setCityStats(Array.from(cityMap.values()))

      // Genre stats
      const genreMap = new Map<string, number>()
      for (const r of records) {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        const genre = (rest?.genre as string) ?? '기타'
        genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1)
      }
      setGenreStats(
        Array.from(genreMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      )

      // Score distribution
      const scores = records
        .map((r) => r.satisfaction as number | null)
        .filter((s): s is number => s !== null)
      setScoreBuckets(buildScoreBuckets(scores))

      // Monthly stats (last 6 months)
      const now = new Date()
      const monthlyMap = new Map<string, { count: number; amount: number }>()
      const monthLabels: MonthlyStats[] = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${d.getMonth() + 1}월`
        monthlyMap.set(key, { count: 0, amount: 0 })
        monthLabels.push({ label, count: 0, amount: 0, isCurrent: i === 0 })
      }

      for (const r of records) {
        if (!r.visit_date) continue
        const key = (r.visit_date as string).slice(0, 7)
        const entry = monthlyMap.get(key)
        if (entry) {
          entry.count++
          entry.amount += (r.amount_spent as number) ?? 0
        }
      }

      const keys = Array.from(monthlyMap.keys())
      keys.forEach((key, idx) => {
        const entry = monthlyMap.get(key)
        if (entry && monthLabels[idx]) {
          monthLabels[idx].count = entry.count
          monthLabels[idx].amount = entry.amount
        }
      })
      setMonthlyStats(monthLabels)

      // Scene stats
      const sceneMap = new Map<string, number>()
      for (const r of records) {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        const scene = (rest?.scene as string) ?? '기타'
        sceneMap.set(scene, (sceneMap.get(scene) ?? 0) + 1)
      }
      const sceneColors: Record<string, string> = {
        '데이트': '#E8637A',
        '회식': '#5B8DEF',
        '가족': '#F4A940',
        '혼밥': '#8B5CF6',
        '친구': '#10B981',
        '비즈니스': '#6B7280',
        '기타': '#9CA3AF',
      }
      setSceneStats(
        Array.from(sceneMap.entries())
          .map(([name, count]) => ({
            name,
            count,
            color: sceneColors[name] ?? 'var(--text-hint)',
          }))
          .sort((a, b) => b.count - a.count)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '통계 조회에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { cityStats, genreStats, scoreBuckets, monthlyStats, sceneStats, isLoading, error }
}
