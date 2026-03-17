"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"

export interface WrappedStats {
  totalRecords: number
  mostVisitedRestaurant: { name: string; visitCount: number } | null
  topGenre: { genre: string; count: number } | null
  tasteDnaAverages: {
    spicy: number
    sweet: number
    salty: number
    sour: number
    umami: number
    rich: number
  } | null
  recordStreak: number
}

/**
 * Fetches yearly summary stats for the "Wrapped" feature.
 */
export function useWrapped(userId: string | null, year: number) {
  const supabase = createClient()

  const { data, error, isLoading } = useSWR<WrappedStats | null>(
    userId ? `wrapped/${userId}/${year}` : null,
    async () => {
      if (!userId) return null

      const startDate = `${year}-01-01T00:00:00Z`
      const endDate = `${year + 1}-01-01T00:00:00Z`

      // Total records count
      const { count: totalRecords } = await supabase
        .from("records")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startDate)
        .lt("created_at", endDate)

      // Records with restaurant for most-visited calculation
      const { data: recordsWithRestaurant } = await supabase
        .from("records")
        .select("restaurant_id, restaurants(name)")
        .eq("user_id", userId)
        .not("restaurant_id", "is", null)
        .gte("created_at", startDate)
        .lt("created_at", endDate)

      // Calculate most visited restaurant
      const restaurantCounts = new Map<string, { name: string; count: number }>()
      for (const record of recordsWithRestaurant ?? []) {
        const rid = record.restaurant_id as string
        const name = (record.restaurants as unknown as Record<string, unknown>)?.name as string
        if (!rid || !name) continue
        const existing = restaurantCounts.get(rid)
        restaurantCounts.set(rid, {
          name,
          count: (existing?.count ?? 0) + 1,
        })
      }

      let mostVisitedRestaurant: WrappedStats["mostVisitedRestaurant"] = null
      let maxVisits = 0
      for (const entry of restaurantCounts.values()) {
        if (entry.count > maxVisits) {
          maxVisits = entry.count
          mostVisitedRestaurant = { name: entry.name, visitCount: entry.count }
        }
      }

      // Top genre
      const { data: genreRecords } = await supabase
        .from("records")
        .select("genre")
        .eq("user_id", userId)
        .not("genre", "is", null)
        .gte("created_at", startDate)
        .lt("created_at", endDate)

      const genreCounts = new Map<string, number>()
      for (const record of genreRecords ?? []) {
        const genre = record.genre as string
        if (!genre) continue
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)
      }

      let topGenre: WrappedStats["topGenre"] = null
      let maxGenreCount = 0
      for (const [genre, count] of genreCounts.entries()) {
        if (count > maxGenreCount) {
          maxGenreCount = count
          topGenre = { genre, count }
        }
      }

      // Taste DNA averages
      const { data: tasteDna } = await supabase
        .from("taste_dna_restaurant")
        .select("flavor_spicy, flavor_sweet, flavor_salty, flavor_sour, flavor_umami, flavor_rich")
        .eq("user_id", userId)
        .single()

      const tasteDnaAverages = tasteDna
        ? {
            spicy: tasteDna.flavor_spicy,
            sweet: tasteDna.flavor_sweet,
            salty: tasteDna.flavor_salty,
            sour: tasteDna.flavor_sour,
            umami: tasteDna.flavor_umami,
            rich: tasteDna.flavor_rich,
          }
        : null

      // Record streak: consecutive days with records
      const { data: streakRecords } = await supabase
        .from("records")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("created_at", { ascending: false })

      const recordStreak = calculateStreak(
        (streakRecords ?? []).map((r) => r.created_at as string),
      )

      return {
        totalRecords: totalRecords ?? 0,
        mostVisitedRestaurant,
        topGenre,
        tasteDnaAverages,
        recordStreak,
      }
    },
  )

  return {
    stats: data ?? null,
    isLoading,
    error: error ? String(error) : null,
  }
}

/**
 * Calculates the longest streak of consecutive days with records.
 */
function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const uniqueDays = new Set(
    dates.map((d) => new Date(d).toISOString().slice(0, 10)),
  )
  const sortedDays = Array.from(uniqueDays).sort()

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1])
    const curr = new Date(sortedDays[i])
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}
