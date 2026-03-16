'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface WrappedData {
  year: number
  totalRecords: number
  totalCategories: number
  topCategory: { name: string; count: number } | null
  topMenu: { name: string; count: number } | null
  topRated: { menuName: string; rating: number } | null
  monthlyDistribution: number[]
  recordTypeBreakdown: { restaurant: number; wine: number; homemade: number }
  topTags: Array<{ tag: string; count: number }>
  topFlavorTags: Array<{ tag: string; count: number }>
  averageRating: number
  uniqueRestaurants: number
  busiestMonth: { month: number; count: number } | null
  longestGap: number
  firstRecord: { menuName: string; date: string } | null
  latestRecord: { menuName: string; date: string } | null
}

interface RawRecord {
  id: string
  menu_name: string | null
  category: string | null
  record_type: string | null
  rating_overall: number | null
  created_at: string
  tags: string[] | null
  flavor_tags: string[] | null
  restaurant_id: string | null
  location_lat: number | null
  location_lng: number | null
}

function computeWrapped(records: RawRecord[], year: number): WrappedData {
  const totalRecords = records.length

  // Categories
  const categoryCounts = new Map<string, number>()
  for (const r of records) {
    if (r.category) {
      categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1)
    }
  }
  const totalCategories = categoryCounts.size
  const topCategory = getTopEntry(categoryCounts)

  // Menus
  const menuCounts = new Map<string, number>()
  for (const r of records) {
    if (r.menu_name) {
      menuCounts.set(r.menu_name, (menuCounts.get(r.menu_name) ?? 0) + 1)
    }
  }
  const topMenuEntry = getTopEntry(menuCounts)
  const topMenu = topMenuEntry ? { name: topMenuEntry.name, count: topMenuEntry.count } : null

  // Top rated
  let topRated: WrappedData['topRated'] = null
  for (const r of records) {
    if (r.rating_overall !== null && r.menu_name) {
      if (!topRated || r.rating_overall > topRated.rating) {
        topRated = { menuName: r.menu_name, rating: r.rating_overall }
      }
    }
  }

  // Monthly distribution
  const monthlyDistribution = Array.from<number>({ length: 12 }).fill(0)
  for (const r of records) {
    const month = new Date(r.created_at).getMonth()
    monthlyDistribution[month]++
  }

  // Busiest month
  let busiestMonth: WrappedData['busiestMonth'] = null
  for (let i = 0; i < 12; i++) {
    if (monthlyDistribution[i] > 0 && (!busiestMonth || monthlyDistribution[i] > busiestMonth.count)) {
      busiestMonth = { month: i + 1, count: monthlyDistribution[i] }
    }
  }

  // Record type breakdown
  const recordTypeBreakdown = { restaurant: 0, wine: 0, homemade: 0 }
  for (const r of records) {
    const rt = r.record_type ?? 'restaurant'
    if (rt === 'restaurant') recordTypeBreakdown.restaurant++
    else if (rt === 'wine') recordTypeBreakdown.wine++
    else if (rt === 'homemade') recordTypeBreakdown.homemade++
  }

  // Tags
  const tagCounts = new Map<string, number>()
  for (const r of records) {
    if (r.tags) {
      for (const t of r.tags) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
      }
    }
  }
  const topTags = getTopN(tagCounts, 5)

  // Flavor tags
  const flavorTagCounts = new Map<string, number>()
  for (const r of records) {
    if (r.flavor_tags) {
      for (const t of r.flavor_tags) {
        flavorTagCounts.set(t, (flavorTagCounts.get(t) ?? 0) + 1)
      }
    }
  }
  const topFlavorTags = getTopN(flavorTagCounts, 5)

  // Average rating
  const ratedRecords = records.filter((r) => r.rating_overall !== null)
  const averageRating =
    ratedRecords.length > 0
      ? ratedRecords.reduce((sum, r) => sum + (r.rating_overall ?? 0), 0) / ratedRecords.length
      : 0

  // Unique restaurants
  const restaurantIds = new Set<string>()
  for (const r of records) {
    if (r.restaurant_id) restaurantIds.add(r.restaurant_id)
  }
  const uniqueRestaurants = restaurantIds.size

  // Longest gap
  let longestGap = 0
  if (records.length >= 2) {
    for (let i = 1; i < records.length; i++) {
      const prev = new Date(records[i - 1].created_at).getTime()
      const curr = new Date(records[i].created_at).getTime()
      const gapDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))
      if (gapDays > longestGap) longestGap = gapDays
    }
  }

  // First and latest record
  const firstRecord =
    records.length > 0
      ? { menuName: records[0].menu_name ?? '', date: records[0].created_at }
      : null
  const latestRecord =
    records.length > 0
      ? {
          menuName: records[records.length - 1].menu_name ?? '',
          date: records[records.length - 1].created_at,
        }
      : null

  return {
    year,
    totalRecords,
    totalCategories,
    topCategory,
    topMenu,
    topRated,
    monthlyDistribution,
    recordTypeBreakdown,
    topTags,
    topFlavorTags,
    averageRating,
    uniqueRestaurants,
    busiestMonth,
    longestGap,
    firstRecord,
    latestRecord,
  }
}

function getTopEntry(map: Map<string, number>): { name: string; count: number } | null {
  let top: { name: string; count: number } | null = null
  for (const [name, count] of map) {
    if (!top || count > top.count) top = { name, count }
  }
  return top
}

function getTopN(map: Map<string, number>, n: number): Array<{ tag: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, count]) => ({ tag, count }))
}

export function useWrapped(userId: string | undefined, year?: number) {
  const targetYear = year ?? new Date().getFullYear()

  const { data, isLoading } = useSWR(
    userId ? ['wrapped', userId, targetYear] : null,
    async () => {
      const supabase = createClient()
      const startDate = `${targetYear}-01-01T00:00:00Z`
      const endDate = `${targetYear + 1}-01-01T00:00:00Z`

      const { data, error } = await supabase
        .from('records')
        .select(
          'id, menu_name, category, record_type, rating_overall, created_at, tags, flavor_tags, restaurant_id, location_lat, location_lng',
        )
        .eq('user_id', userId!)
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: true })

      if (error) throw error

      return computeWrapped((data as RawRecord[]) ?? [], targetYear)
    },
  )

  return { data: data ?? null, isLoading }
}
