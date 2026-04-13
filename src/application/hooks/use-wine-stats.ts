'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/shared/di/container'

interface CountryStats {
  name: string
  lat: number
  lng: number
  visitCount: number
  explored: boolean
  dots: { type: string; count: number }[]
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
  label: string
  count: number
}

interface WineStatsResult {
  countryStats: CountryStats[]
  varietalStats: VarietalStats[]
  scoreBuckets: ScoreBucket[]
  monthlyStats: MonthlyStats[]
  wineTypeStats: WineTypeStats[]
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

/** 설계 문서 bodyOrder 순 (얇은→두꺼운) 20종 */
const VARIETAL_MASTER: { name: string; nameKo: string; bodyOrder: number }[] = [
  { name: 'Muscat', nameKo: '뮈스카', bodyOrder: 1 },
  { name: 'Riesling', nameKo: '리슬링', bodyOrder: 2 },
  { name: 'Sauvignon Blanc', nameKo: '소비뇽 블랑', bodyOrder: 3 },
  { name: 'Pinot Gris', nameKo: '피노 그리', bodyOrder: 4 },
  { name: 'Pinot Noir', nameKo: '피노 누아', bodyOrder: 5 },
  { name: 'Gamay', nameKo: '가메', bodyOrder: 6 },
  { name: 'Barbera', nameKo: '바르베라', bodyOrder: 7 },
  { name: 'Chardonnay', nameKo: '샤르도네', bodyOrder: 8 },
  { name: 'Grenache', nameKo: '그르나슈', bodyOrder: 9 },
  { name: 'Merlot', nameKo: '메를로', bodyOrder: 10 },
  { name: 'Sangiovese', nameKo: '산지오베제', bodyOrder: 11 },
  { name: 'Viognier', nameKo: '비오니에', bodyOrder: 12 },
  { name: 'Tempranillo', nameKo: '템프라니요', bodyOrder: 13 },
  { name: 'Syrah', nameKo: '쉬라즈', bodyOrder: 14 },
  { name: 'Nebbiolo', nameKo: '네비올로', bodyOrder: 15 },
  { name: 'Malbec', nameKo: '말벡', bodyOrder: 16 },
  { name: 'Cabernet Sauvignon', nameKo: '카베르네 소비뇽', bodyOrder: 17 },
  { name: 'Mourvèdre', nameKo: '무르베드르', bodyOrder: 18 },
  { name: 'Tannat', nameKo: '타나', bodyOrder: 19 },
  { name: 'Petit Verdot', nameKo: '프티 베르도', bodyOrder: 20 },
]

const VARIETAL_MAP = Object.fromEntries(
  VARIETAL_MASTER.map((v) => [v.name, v])
)

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  프랑스: { lat: 46.6, lng: 2.3 },
  이탈리아: { lat: 42.5, lng: 12.5 },
  스페인: { lat: 40.0, lng: -3.7 },
  미국: { lat: 37.0, lng: -95.7 },
  호주: { lat: -25.3, lng: 133.8 },
  칠레: { lat: -33.4, lng: -70.7 },
  아르헨티나: { lat: -34.6, lng: -58.4 },
  독일: { lat: 51.2, lng: 10.4 },
  뉴질랜드: { lat: -40.9, lng: 174.9 },
  포르투갈: { lat: 39.4, lng: -8.2 },
  남아공: { lat: -30.6, lng: 22.9 },
  한국: { lat: 35.9, lng: 127.8 },
}

export { VARIETAL_MASTER }

export function useWineStats(userId: string | null, enabled = true): WineStatsResult {
  const [countryStats, setCountryStats] = useState<CountryStats[]>([])
  const [varietalStats, setVarietalStats] = useState<VarietalStats[]>([])
  const [scoreBuckets, setScoreBuckets] = useState<ScoreBucket[]>(
    SCORE_LABELS.map((label) => ({ label, count: 0 }))
  )
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [totalSpending, setTotalSpending] = useState(0)
  const [totalRecordCount, setTotalRecordCount] = useState(0)
  const [wineTypeStats, setWineTypeStats] = useState<WineTypeStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!userId || !enabled) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseClient()

      const { data: records, error: fetchError } = await supabase
        .from('records')
        .select(
          'id, satisfaction, visit_date, purchase_price, wine:wines!records_linked_wine_id_fkey(name, country, region, variety, wine_type)'
        )
        .eq('user_id', userId)
        .eq('target_type', 'wine')

      if (fetchError) throw fetchError

      if (!records || records.length === 0) return

      setTotalRecordCount(records.length)

      // Country stats with wine type dots + region data
      const countryMap = new Map<
        string,
        { count: number; dots: Map<string, number>; regions: Map<string, { count: number; dots: Map<string, number> }> }
      >()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const country = (wine?.country as string) ?? '기타'
        const region = (wine?.region as string) ?? null
        const wineType = (wine?.wine_type as string) ?? 'red'
        const existing = countryMap.get(country)
        if (existing) {
          existing.count++
          existing.dots.set(wineType, (existing.dots.get(wineType) ?? 0) + 1)
          if (region) {
            const regionEntry = existing.regions.get(region)
            if (regionEntry) {
              regionEntry.count++
              regionEntry.dots.set(wineType, (regionEntry.dots.get(wineType) ?? 0) + 1)
            } else {
              const regionDots = new Map<string, number>()
              regionDots.set(wineType, 1)
              existing.regions.set(region, { count: 1, dots: regionDots })
            }
          }
        } else {
          const dots = new Map<string, number>()
          dots.set(wineType, 1)
          const regions = new Map<string, { count: number; dots: Map<string, number> }>()
          if (region) {
            const regionDots = new Map<string, number>()
            regionDots.set(wineType, 1)
            regions.set(region, { count: 1, dots: regionDots })
          }
          countryMap.set(country, { count: 1, dots, regions })
        }
      }
      setCountryStats(
        Array.from(countryMap.entries()).map(([name, { count, dots, regions }]) => ({
          name,
          visitCount: count,
          lat: COUNTRY_COORDS[name]?.lat ?? 0,
          lng: COUNTRY_COORDS[name]?.lng ?? 0,
          explored: true,
          dots: Array.from(dots.entries()).map(([type, cnt]) => ({
            type,
            count: cnt,
          })),
          regions: Array.from(regions.entries()).map(([regionName, regionData]) => ({
            name: regionName,
            visitCount: regionData.count,
            dots: Array.from(regionData.dots.entries()).map(([type, cnt]) => ({
              type,
              count: cnt,
            })),
          })),
        }))
      )

      // Varietal stats — 20종 마스터 기준
      const varietalMap = new Map<string, number>()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const variety = (wine?.variety as string) ?? null
        if (variety) {
          varietalMap.set(variety, (varietalMap.get(variety) ?? 0) + 1)
        }
      }

      const varietalResult: VarietalStats[] = VARIETAL_MASTER.map((master) => ({
        name: master.name,
        nameKo: master.nameKo,
        count: varietalMap.get(master.name) ?? 0,
        bodyOrder: master.bodyOrder,
      }))

      for (const [name, count] of varietalMap.entries()) {
        if (!VARIETAL_MAP[name]) {
          varietalResult.push({ name, nameKo: name, count, bodyOrder: 99 })
        }
      }

      setVarietalStats(varietalResult.sort((a, b) => a.bodyOrder - b.bodyOrder))

      // Score distribution
      const scores = records
        .map((r) => r.satisfaction as number | null)
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

      let spending = 0
      for (const r of records) {
        const price = (r.purchase_price as number | null) ?? 0
        spending += price

        const visitDate = r.visit_date as string | null
        if (!visitDate) continue
        const key = visitDate.slice(0, 7)
        const entry = monthlyMap.get(key)
        if (entry) {
          entry.count++
          entry.amount += price
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

      // Wine type stats
      const WINE_TYPE_LABELS: Record<string, string> = {
        red: '레드',
        white: '화이트',
        rose: '로제',
        sparkling: '스파클링',
      }
      const typeMap = new Map<string, number>()
      for (const r of records) {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const wineType = (wine?.wine_type as string) ?? 'red'
        typeMap.set(wineType, (typeMap.get(wineType) ?? 0) + 1)
      }
      setWineTypeStats(
        Array.from(typeMap.entries())
          .map(([type, count]) => ({
            type,
            label: WINE_TYPE_LABELS[type] ?? type,
            count,
          }))
          .sort((a, b) => b.count - a.count)
      )

    } catch (err) {
      setError(
        err instanceof Error ? err.message : '와인 통계 조회에 실패했습니다'
      )
    } finally {
      setIsLoading(false)
    }
  }, [userId, enabled])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    countryStats,
    varietalStats,
    scoreBuckets,
    monthlyStats,
    wineTypeStats,
    totalSpending,
    totalRecordCount,
    isLoading,
    error,
  }
}
