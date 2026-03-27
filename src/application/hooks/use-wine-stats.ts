'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/shared/di/container'

interface CountryStats {
  name: string
  lat: number
  lng: number
  visitCount: number
}

interface VarietalStats {
  name: string
  nameKo: string
  count: number
  bodyOrder: number
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

interface WineTypeStats {
  type: string
  count: number
  color: string
}

interface WineStatsResult {
  countryStats: CountryStats[]
  varietalStats: VarietalStats[]
  scoreBuckets: ScoreBucket[]
  monthlyStats: MonthlyStats[]
  wineTypeStats: WineTypeStats[]
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

const WINE_TYPE_COLORS: Record<string, string> = {
  '레드': '#8B1A1A',
  '화이트': '#D4A843',
  '로제': '#E8A0BF',
  '스파클링': '#C4B5A0',
  '오렌지': '#E08040',
  '내추럴': '#7BA05B',
  '디저트': '#B8860B',
  '주정강화': '#704214',
}

const VARIETAL_KO: Record<string, { nameKo: string; bodyOrder: number }> = {
  'Cabernet Sauvignon': { nameKo: '카베르네 소비뇽', bodyOrder: 1 },
  'Merlot': { nameKo: '메를로', bodyOrder: 2 },
  'Pinot Noir': { nameKo: '피노 누아', bodyOrder: 3 },
  'Syrah': { nameKo: '시라', bodyOrder: 4 },
  'Chardonnay': { nameKo: '샤르도네', bodyOrder: 5 },
  'Sauvignon Blanc': { nameKo: '소비뇽 블랑', bodyOrder: 6 },
  'Riesling': { nameKo: '리슬링', bodyOrder: 7 },
  'Sangiovese': { nameKo: '산지오베제', bodyOrder: 8 },
  'Tempranillo': { nameKo: '템프라니요', bodyOrder: 9 },
  'Nebbiolo': { nameKo: '네비올로', bodyOrder: 10 },
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  '프랑스': { lat: 46.6, lng: 2.3 },
  '이탈리아': { lat: 42.5, lng: 12.5 },
  '스페인': { lat: 40.0, lng: -3.7 },
  '미국': { lat: 37.0, lng: -95.7 },
  '호주': { lat: -25.3, lng: 133.8 },
  '칠레': { lat: -33.4, lng: -70.7 },
  '아르헨티나': { lat: -34.6, lng: -58.4 },
  '독일': { lat: 51.2, lng: 10.4 },
  '뉴질랜드': { lat: -40.9, lng: 174.9 },
  '포르투갈': { lat: 39.4, lng: -8.2 },
  '남아공': { lat: -30.6, lng: 22.9 },
  '한국': { lat: 35.9, lng: 127.8 },
}

export function useWineStats(userId: string | null): WineStatsResult {
  const [countryStats, setCountryStats] = useState<CountryStats[]>([])
  const [varietalStats, setVarietalStats] = useState<VarietalStats[]>([])
  const [scoreBuckets, setScoreBuckets] = useState<ScoreBucket[]>(
    SCORE_LABELS.map((label) => ({ label, count: 0 }))
  )
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [wineTypeStats, setWineTypeStats] = useState<WineTypeStats[]>([])
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
        .select('id, satisfaction, visit_date, amount_spent, wine:wines(name, country, region, grape_variety, wine_type)')
        .eq('user_id', userId)
        .eq('target_type', 'wine')

      if (fetchError) throw fetchError

      if (!records || records.length === 0) return

      // Country stats
      const countryMap = new Map<string, number>()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const country = (wine?.country as string) ?? '기타'
        countryMap.set(country, (countryMap.get(country) ?? 0) + 1)
      }
      setCountryStats(
        Array.from(countryMap.entries()).map(([name, visitCount]) => ({
          name,
          visitCount,
          lat: COUNTRY_COORDS[name]?.lat ?? 0,
          lng: COUNTRY_COORDS[name]?.lng ?? 0,
        }))
      )

      // Varietal stats
      const varietalMap = new Map<string, number>()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const variety = (wine?.grape_variety as string) ?? '기타'
        varietalMap.set(variety, (varietalMap.get(variety) ?? 0) + 1)
      }
      setVarietalStats(
        Array.from(varietalMap.entries())
          .map(([name, count]) => ({
            name,
            nameKo: VARIETAL_KO[name]?.nameKo ?? name,
            count,
            bodyOrder: VARIETAL_KO[name]?.bodyOrder ?? 99,
          }))
          .sort((a, b) => a.bodyOrder - b.bodyOrder)
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

      // Wine type stats
      const typeMap = new Map<string, number>()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const wineType = (wine?.wine_type as string) ?? '기타'
        typeMap.set(wineType, (typeMap.get(wineType) ?? 0) + 1)
      }
      setWineTypeStats(
        Array.from(typeMap.entries())
          .map(([type, count]) => ({
            type,
            count,
            color: WINE_TYPE_COLORS[type] ?? 'var(--text-hint)',
          }))
          .sort((a, b) => b.count - a.count)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '와인 통계 조회에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { countryStats, varietalStats, scoreBuckets, monthlyStats, wineTypeStats, isLoading, error }
}
