import { createClient } from '@/infrastructure/supabase/client'
import type { ProfileRepository, BubblerProfileData } from '@/domain/repositories/profile-repository'
import type { ActivitySummary, HeatmapCell, RestaurantStats, WineStats, WrappedData, WrappedCategory } from '@/domain/entities/profile'

export class SupabaseProfileRepository implements ProfileRepository {
  private get supabase() {
    return createClient()
  }

  async getActivitySummary(userId: string): Promise<ActivitySummary> {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('record_count, current_streak')
      .eq('id', userId)
      .single()

    if (userError) throw new Error(`ActivitySummary user 조회 실패: ${userError.message}`)

    const { count: restaurantCount } = await this.supabase
      .from('dining_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    const { count: wineCount } = await this.supabase
      .from('dining_records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_type', 'wine')

    const { data: scores } = await this.supabase
      .from('dining_records')
      .select('satisfaction')
      .eq('user_id', userId)
      .not('satisfaction', 'is', null)

    const satisfactionValues = (scores ?? [])
      .map((s) => s.satisfaction as number)
      .filter((v) => v > 0)
    const avgSatisfaction = satisfactionValues.length > 0
      ? Math.round(satisfactionValues.reduce((a, b) => a + b, 0) / satisfactionValues.length)
      : 0

    return {
      totalRecords: user?.record_count ?? 0,
      totalRestaurants: restaurantCount ?? 0,
      totalWines: wineCount ?? 0,
      avgSatisfaction,
      currentStreak: user?.current_streak ?? 0,
    }
  }

  async getHeatmap(userId: string, weeks: number): Promise<HeatmapCell[]> {
    const totalDays = weeks * 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - totalDays)
    const startStr = startDate.toISOString().split('T')[0]

    const { data: records } = await this.supabase
      .from('dining_records')
      .select('visit_date')
      .eq('user_id', userId)
      .gte('visit_date', startStr)

    const countMap = new Map<string, number>()
    for (const r of records ?? []) {
      const date = r.visit_date as string
      if (!date) continue
      const day = date.slice(0, 10)
      countMap.set(day, (countMap.get(day) ?? 0) + 1)
    }

    const cells: HeatmapCell[] = []
    const cursor = new Date(startDate)
    const today = new Date()

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split('T')[0]
      const count = countMap.get(dateStr) ?? 0
      let intensity: HeatmapCell['intensity'] = 0
      if (count >= 4) intensity = 4
      else if (count >= 3) intensity = 3
      else if (count >= 2) intensity = 2
      else if (count >= 1) intensity = 1

      cells.push({ date: dateStr, intensity })
      cursor.setDate(cursor.getDate() + 1)
    }

    return cells
  }

  async getRestaurantStats(userId: string): Promise<RestaurantStats> {
    const { data: records, error } = await this.supabase
      .from('dining_records')
      .select('satisfaction, visit_date, restaurant:restaurants(genre, city)')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    if (error) throw new Error(`RestaurantStats 조회 실패: ${error.message}`)

    const items = records ?? []
    const scores = items
      .map((r) => r.satisfaction as number | null)
      .filter((s): s is number => s !== null && s > 0)

    const genreMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const monthMap = new Map<string, number>()

    for (const r of items) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const genre = (rest?.genre as string) ?? '기타'
      genreMap.set(genre, (genreMap.get(genre) ?? 0) + 1)
      const city = (rest?.city as string) ?? '기타'
      cityMap.set(city, (cityMap.get(city) ?? 0) + 1)
      if (r.visit_date) {
        const month = (r.visit_date as string).slice(0, 7)
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
      }
    }

    return {
      totalCount: items.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      topGenres: sortedEntries(genreMap).slice(0, 5),
      topCities: sortedEntries(cityMap).slice(0, 5),
      monthlyTrend: Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count })),
    }
  }

  async getWineStats(userId: string): Promise<WineStats> {
    const { data: records, error } = await this.supabase
      .from('dining_records')
      .select('satisfaction, visit_date, wine:wines(grape_variety, country)')
      .eq('user_id', userId)
      .eq('target_type', 'wine')

    if (error) throw new Error(`WineStats 조회 실패: ${error.message}`)

    const items = records ?? []
    const scores = items
      .map((r) => r.satisfaction as number | null)
      .filter((s): s is number => s !== null && s > 0)

    const varietalMap = new Map<string, number>()
    const countryMap = new Map<string, number>()
    const monthMap = new Map<string, number>()

    for (const r of items) {
      const wine = r.wine as unknown as Record<string, unknown> | null
      const varietal = (wine?.grape_variety as string) ?? '기타'
      varietalMap.set(varietal, (varietalMap.get(varietal) ?? 0) + 1)
      const country = (wine?.country as string) ?? '기타'
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1)
      if (r.visit_date) {
        const month = (r.visit_date as string).slice(0, 7)
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
      }
    }

    return {
      totalCount: items.length,
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      topVarietals: sortedEntries(varietalMap).slice(0, 5),
      topCountries: sortedEntries(countryMap).slice(0, 5),
      monthlyTrend: Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count })),
    }
  }

  async getWrappedData(userId: string, category: WrappedCategory): Promise<WrappedData> {
    const targetFilter = category === 'all' ? undefined : category

    let query = this.supabase
      .from('dining_records')
      .select('satisfaction, visit_date, restaurant:restaurants(genre, city), wine:wines(grape_variety, country)')
      .eq('user_id', userId)

    if (targetFilter) {
      query = query.eq('target_type', targetFilter)
    }

    const { data: records } = await query
    const items = records ?? []

    const scores = items
      .map((r) => r.satisfaction as number | null)
      .filter((s): s is number => s !== null && s > 0)

    const genreMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const varietalMap = new Map<string, number>()
    const countryMap = new Map<string, number>()
    const monthMap = new Map<string, number>()

    for (const r of items) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      if (rest?.genre) genreMap.set(rest.genre as string, (genreMap.get(rest.genre as string) ?? 0) + 1)
      if (rest?.city) cityMap.set(rest.city as string, (cityMap.get(rest.city as string) ?? 0) + 1)
      const wine = r.wine as unknown as Record<string, unknown> | null
      if (wine?.grape_variety) varietalMap.set(wine.grape_variety as string, (varietalMap.get(wine.grape_variety as string) ?? 0) + 1)
      if (wine?.country) countryMap.set(wine.country as string, (countryMap.get(wine.country as string) ?? 0) + 1)
      if (r.visit_date) {
        const month = (r.visit_date as string).slice(0, 7)
        monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
      }
    }

    const { data: user } = await this.supabase
      .from('users')
      .select('current_streak')
      .eq('id', userId)
      .single()

    return {
      totalRecords: items.length,
      topGenre: topEntry(genreMap),
      topCity: topEntry(cityMap),
      topVarietal: topEntry(varietalMap),
      topCountry: topEntry(countryMap),
      avgSatisfaction: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      streakDays: user?.current_streak ?? 0,
      mostActiveMonth: topEntry(monthMap),
    }
  }
  async getBubblerProfile(userId: string, bubbleId: string | null): Promise<BubblerProfileData | null> {
    const { data: user } = await this.supabase
      .from('users')
      .select('nickname, handle, avatar_url, avatar_color, total_xp')
      .eq('id', userId)
      .single()

    if (!user) return null

    const { data: xpData } = await this.supabase
      .from('user_experience')
      .select('level')
      .eq('user_id', userId)
      .order('level', { ascending: false })
      .limit(1)

    const level = xpData?.[0]?.level ?? 1

    const heatmap = await this.getHeatmap(userId, 13)
    const restaurantStats = await this.getRestaurantStats(userId)

    const { data: records } = await this.supabase
      .from('dining_records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, restaurant:restaurants(name, genre, photos), wine:wines(name, photos)')
      .eq('user_id', userId)
      .eq('status', 'rated')
      .order('satisfaction', { ascending: false })
      .limit(20)

    const topPicks = (records ?? []).slice(0, 6).map((r) => {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const wine = r.wine as unknown as Record<string, unknown> | null
      const tType = r.target_type as string
      return {
        id: r.target_id as string,
        name: tType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: tType as 'restaurant' | 'wine',
        satisfaction: r.satisfaction as number | null,
        thumbnailUrl: (tType === 'restaurant' ? (rest?.photos as string[])?.[0] : (wine?.photos as string[])?.[0]) ?? null,
        genre: tType === 'restaurant' ? ((rest?.genre as string) ?? null) : null,
      }
    })

    const { data: recentData } = await this.supabase
      .from('dining_records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, restaurant:restaurants(name), wine:wines(name)')
      .eq('user_id', userId)
      .eq('status', 'rated')
      .order('created_at', { ascending: false })
      .limit(10)

    const recentRecords = (recentData ?? []).map((r) => {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const wine = r.wine as unknown as Record<string, unknown> | null
      const tType = r.target_type as string
      return {
        id: r.id as string,
        targetName: tType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: tType as 'restaurant' | 'wine',
        satisfaction: r.satisfaction as number | null,
        comment: r.comment as string | null,
        visitDate: r.visit_date as string | null,
      }
    })

    let bubbleContext = null
    if (bubbleId) {
      const { data: member } = await this.supabase
        .from('bubble_members')
        .select('taste_match_pct, joined_at, bubbles(name, icon)')
        .eq('bubble_id', bubbleId)
        .eq('user_id', userId)
        .single()

      if (member) {
        const bubble = (member as Record<string, unknown>).bubbles as Record<string, unknown> | null
        bubbleContext = {
          bubbleId,
          bubbleName: (bubble?.name as string) ?? '',
          bubbleIcon: (bubble?.icon as string) ?? null,
          rank: null,
          memberSince: (member as Record<string, unknown>).joined_at as string,
          tasteMatchPct: (member as Record<string, unknown>).taste_match_pct as number | null,
        }
      }
    }

    const categories = restaurantStats.topGenres.map((g) => ({
      name: g.name,
      percentage: restaurantStats.totalCount > 0
        ? Math.round((g.count / restaurantStats.totalCount) * 100)
        : 0,
    }))

    return {
      nickname: user.nickname as string,
      handle: user.handle as string | null,
      avatarUrl: user.avatar_url as string | null,
      avatarColor: user.avatar_color as string | null,
      level,
      levelTitle: getLevelTitle(level),
      categories,
      avgSatisfaction: restaurantStats.avgScore,
      totalRecords: restaurantStats.totalCount,
      topRegions: restaurantStats.topCities.slice(0, 5).map((c) => c.name),
      topPicks,
      recentRecords,
      heatmap,
      bubbleContext,
    }
  }
}

function getLevelTitle(level: number): string {
  if (level <= 1) return '입문자'
  if (level <= 3) return '탐험가'
  if (level <= 5) return '미식가'
  if (level <= 7) return '감별사'
  if (level <= 9) return '대가'
  return '전설'
}

function sortedEntries(map: Map<string, number>): { name: string; count: number }[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

function topEntry(map: Map<string, number>): string | null {
  let best: string | null = null
  let max = 0
  for (const [key, count] of map) {
    if (count > max) {
      max = count
      best = key
    }
  }
  return best
}
