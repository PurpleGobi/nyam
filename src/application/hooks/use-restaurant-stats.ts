'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/shared/di/container'
import { SCENE_TAGS } from '@/domain/entities/scene'

interface CityStats {
  name: string
  country: string
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
  scene: string
  label: string
  count: number
  color: string
}

interface RestaurantStatsResult {
  cityStats: CityStats[]
  genreStats: GenreStats[]
  scoreBuckets: ScoreBucket[]
  monthlyStats: MonthlyStats[]
  sceneStats: SceneStats[]
  totalSpending: number
  totalRecordCount: number
  isLoading: boolean
  error: string | null
}

const SCORE_LABELS = ['~49', '50s', '60s', '70s', '80s', '90s']

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

const SCENE_MAP = Object.fromEntries(
  SCENE_TAGS.map((t) => [t.value, t])
)

export function useRestaurantStats(userId: string | null): RestaurantStatsResult {
  const [cityStats, setCityStats] = useState<CityStats[]>([])
  const [genreStats, setGenreStats] = useState<GenreStats[]>([])
  const [scoreBuckets, setScoreBuckets] = useState<ScoreBucket[]>(
    SCORE_LABELS.map((label) => ({ label, count: 0 }))
  )
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [sceneStats, setSceneStats] = useState<SceneStats[]>([])
  const [totalSpending, setTotalSpending] = useState(0)
  const [totalRecordCount, setTotalRecordCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      const { data: records, error: fetchError } = await supabase
        .from('records')
        .select(
          'id, avg_satisfaction, latest_visit_date, visits, restaurant:restaurants!records_linked_restaurant_id_fkey(name, genre, country, city, lat, lng)'
        )
        .eq('user_id', userId)
        .eq('target_type', 'restaurant')

      if (fetchError) throw fetchError

      if (!records || records.length === 0) return

      setTotalRecordCount(records.length)

      // City stats
      const cityMap = new Map<string, CityStats>()
      for (const r of records) {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        if (!rest?.city) continue
        const city = rest.city as string
        const country = (rest.country as string) ?? '한국'
        const existing = cityMap.get(city)
        if (existing) {
          existing.visitCount++
        } else {
          cityMap.set(city, {
            name: city,
            country,
            lat: (rest.lat as number) ?? 37.5665,
            lng: (rest.lng as number) ?? 126.978,
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
        .map((r) => r.avg_satisfaction as number | null)
        .filter((s): s is number => s !== null)
      setScoreBuckets(buildScoreBuckets(scores))

      // Monthly stats (last 6 months) + total spending
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

      // Extract visit-level data from visits JSONB
      let spending = 0
      for (const r of records) {
        const visits = (r.visits as Array<Record<string, unknown>>) ?? []
        for (const v of visits) {
          const price = (v.totalPrice as number | null) ?? 0
          spending += price
        }

        const visitDate = r.latest_visit_date as string | null
        if (!visitDate) continue
        const key = visitDate.slice(0, 7)
        const entry = monthlyMap.get(key)
        if (entry) {
          entry.count++
          const latestPrice = (visits[0]?.totalPrice as number | null) ?? 0
          entry.amount += latestPrice
        }
      }
      setTotalSpending(spending)

      const keys = Array.from(monthlyMap.keys())
      keys.forEach((key, idx) => {
        const entry = monthlyMap.get(key)
        if (entry && monthLabels[idx]) {
          monthLabels[idx].count = entry.count
          monthLabels[idx].amount = entry.amount
        }
      })
      setMonthlyStats(monthLabels)

      // Scene stats — visit[0].scene 기반, domain entity 색상 사용
      const sceneMap = new Map<string, number>()
      for (const r of records) {
        const visits = (r.visits as Array<Record<string, unknown>>) ?? []
        const scene = (visits[0]?.scene as string | null) ?? 'etc'
        sceneMap.set(scene, (sceneMap.get(scene) ?? 0) + 1)
      }
      setSceneStats(
        Array.from(sceneMap.entries())
          .map(([scene, count]) => {
            const meta = SCENE_MAP[scene]
            return {
              scene,
              label: meta?.label ?? scene,
              count,
              color: meta?.hex ?? '#9CA3AF',
            }
          })
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

  return {
    cityStats,
    genreStats,
    scoreBuckets,
    monthlyStats,
    sceneStats,
    totalSpending,
    totalRecordCount,
    isLoading,
    error,
  }
}
