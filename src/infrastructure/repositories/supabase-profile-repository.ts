import { createClient } from '@/infrastructure/supabase/client'
import { formatRelativeDate } from '@/shared/utils/date-format'
import type { ProfileRepository, BubblerProfileData } from '@/domain/repositories/profile-repository'
import type {
  UserProfile, ActivitySummary, HeatmapCell, RestaurantStats, WineStats,
  BarChartItem, ScoreDistribution, MonthlySpending, MapMarker,
  WineRegionMapData, SceneVisit, WineTypeDistribution, WrappedData,
  WrappedCategory,
} from '@/domain/entities/profile'

export class SupabaseProfileRepository implements ProfileRepository {
  private get supabase() {
    return createClient()
  }

  // ── 유저 프로필 ──

  async getUserProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw new Error(`UserProfile 조회 실패: ${error.message}`)

    return {
      id: data.id as string,
      nickname: data.nickname as string,
      handle: data.handle as string | null,
      avatarUrl: data.avatar_url as string | null,
      avatarColor: data.avatar_color as string | null,
      bio: data.bio as string | null,
      tasteSummary: data.taste_summary as string | null,
      tasteTags: (data.taste_tags as string[]) ?? [],
      totalXp: (data.total_xp as number) ?? 0,
      activeXp: (data.active_xp as number) ?? 0,
      activeVerified: (data.active_verified as number) ?? 0,
      recordCount: (data.record_count as number) ?? 0,
      currentStreak: (data.current_streak as number) ?? 0,
      preferredAreas: (data.preferred_areas as string[] | null) ?? null,
      createdAt: data.created_at as string,
    }
  }

  async getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
    if (userIds.length === 0) return new Map()
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .in('id', userIds)
    if (error) throw new Error(`UserProfiles 배치 조회 실패: ${error.message}`)
    const map = new Map<string, UserProfile>()
    for (const d of data ?? []) {
      map.set(d.id as string, {
        id: d.id as string,
        nickname: d.nickname as string,
        handle: d.handle as string | null,
        avatarUrl: d.avatar_url as string | null,
        avatarColor: d.avatar_color as string | null,
        bio: d.bio as string | null,
        tasteSummary: d.taste_summary as string | null,
        tasteTags: (d.taste_tags as string[]) ?? [],
        totalXp: (d.total_xp as number) ?? 0,
        activeXp: (d.active_xp as number) ?? 0,
        activeVerified: (d.active_verified as number) ?? 0,
        recordCount: (d.record_count as number) ?? 0,
        currentStreak: (d.current_streak as number) ?? 0,
        preferredAreas: (d.preferred_areas as string[] | null) ?? null,
        createdAt: d.created_at as string,
      })
    }
    return map
  }

  // ── 활동 요약 ──

  async getActivitySummary(userId: string): Promise<ActivitySummary> {
    const { count: restaurantCount } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')

    const { count: wineCount } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_type', 'wine')

    const { data: scores } = await this.supabase
      .from('records')
      .select('satisfaction')
      .eq('user_id', userId)
      .not('satisfaction', 'is', null)

    const vals = (scores ?? []).map((s) => s.satisfaction as number).filter((v) => v > 0)
    const avgSatisfaction = vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0

    const thisMonth = new Date().toISOString().slice(0, 7)
    const { count: restThisMonth } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .gte('created_at', `${thisMonth}-01`)

    const { count: wineThisMonth } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'wine')
      .gte('created_at', `${thisMonth}-01`)

    const { data: xpData } = await this.supabase
      .from('xp_log_changes')
      .select('xp_amount')
      .eq('user_id', userId)
      .gte('created_at', `${thisMonth}-01`)

    const monthlyXp = (xpData ?? []).reduce((sum, r) => sum + ((r.xp_amount as number) ?? 0), 0)

    return {
      restaurantVisits: restaurantCount ?? 0,
      wineTastings: wineCount ?? 0,
      avgSatisfaction,
      monthlyXp,
      restaurantThisMonth: restThisMonth ?? 0,
      wineThisMonth: wineThisMonth ?? 0,
    }
  }

  // ── 히트맵 ──

  async getHeatmapData(userId: string, weeks: number): Promise<HeatmapCell[]> {
    const totalDays = weeks * 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - totalDays)
    const startStr = startDate.toISOString().split('T')[0]

    const { data: records } = await this.supabase
      .from('records')
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

      cells.push({ date: dateStr, count, intensity })
      cursor.setDate(cursor.getDate() + 1)
    }

    return cells
  }

  // ── 식당 통계 ──

  async getRestaurantStats(userId: string): Promise<RestaurantStats> {
    const { count: totalVisits } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'restaurant')

    const { data: scores } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .not('satisfaction', 'is', null)

    const vals = (scores ?? []).map((s) => s.satisfaction as number).filter((v) => v > 0)
    const avgScore = vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0

    const { data: areas } = await this.supabase
      .from('records').select('restaurant:restaurants!records_linked_restaurant_id_fkey(city)')
      .eq('user_id', userId).eq('target_type', 'restaurant')

    const areaSet = new Set<string>()
    for (const r of areas ?? []) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      if (rest?.city) areaSet.add(rest.city as string)
    }

    const thisMonth = new Date().toISOString().slice(0, 7)
    const { count: thisMonthVisits } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .gte('created_at', `${thisMonth}-01`)

    return {
      totalVisits: totalVisits ?? 0,
      avgScore,
      visitedAreas: areaSet.size,
      thisMonthVisits: thisMonthVisits ?? 0,
      thisMonthNewAreas: await this.getThisMonthNewAreas(userId, thisMonth, areaSet),
      scoreDelta: await this.getScoreDelta(userId, 'restaurant'),
    }
  }

  async getGenreDistribution(userId: string): Promise<BarChartItem[]> {
    const { data } = await this.supabase
      .from('records').select('restaurant:restaurants!records_linked_restaurant_id_fkey(genre)')
      .eq('user_id', userId).eq('target_type', 'restaurant')

    const map = new Map<string, number>()
    for (const r of data ?? []) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const genre = (rest?.genre as string) ?? '기타'
      map.set(genre, (map.get(genre) ?? 0) + 1)
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
  }

  async getRestaurantScoreDistribution(userId: string): Promise<ScoreDistribution[]> {
    const { data } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .not('satisfaction', 'is', null)

    return buildScoreDistribution((data ?? []).map((r) => r.satisfaction as number))
  }

  async getRestaurantMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const { data } = await this.supabase
      .from('records').select('total_price, visit_date')
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .gte('visit_date', startDate.toISOString().split('T')[0])
      .not('total_price', 'is', null)

    const map = new Map<string, number>()
    for (const r of data ?? []) {
      const month = (r.visit_date as string).slice(0, 7)
      map.set(month, (map.get(month) ?? 0) + ((r.total_price as number) ?? 0))
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        label: `${parseInt(month.split('-')[1])}월`,
        amount,
      }))
  }

  async getRestaurantMapMarkers(userId: string): Promise<MapMarker[]> {
    const { data } = await this.supabase
      .from('records')
      .select('restaurant:restaurants!records_linked_restaurant_id_fkey(country, city, latitude, longitude)')
      .eq('user_id', userId).eq('target_type', 'restaurant')

    const map = new Map<string, { country: string; city: string; lat: number; lng: number; count: number }>()
    for (const r of data ?? []) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      if (!rest?.city) continue
      const key = `${rest.country}_${rest.city}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, {
          country: (rest.country as string) ?? '',
          city: rest.city as string,
          lat: (rest.latitude as number) ?? 0,
          lng: (rest.longitude as number) ?? 0,
          count: 1,
        })
      }
    }

    return Array.from(map.values())
  }

  async getSceneDistribution(userId: string): Promise<SceneVisit[]> {
    const { data } = await this.supabase
      .from('records').select('scene')
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .not('scene', 'is', null)

    const map = new Map<string, number>()
    for (const r of data ?? []) {
      const scene = (r.scene as string) ?? 'etc'
      map.set(scene, (map.get(scene) ?? 0) + 1)
    }

    const SCENE_COLORS: Record<string, string> = {
      solo: '#7A9BAE', romantic: '#B8879B',
      friends: '#7EAE8B', family: '#C9A96E',
      business: '#8B7396', drinks: '#B87272',
    }
    const SCENE_LABELS: Record<string, string> = {
      solo: '혼밥', romantic: '데이트',
      friends: '친구', family: '가족',
      business: '회식/접대', drinks: '술자리',
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([scene, count]) => ({
        scene,
        label: SCENE_LABELS[scene] ?? scene,
        count,
        color: SCENE_COLORS[scene] ?? 'var(--text-hint)',
      }))
  }

  // ── 와인 통계 ──

  async getWineStats(userId: string): Promise<WineStats> {
    const { count: totalTastings } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'wine')

    const { data: scores } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', 'wine')
      .not('satisfaction', 'is', null)

    const vals = (scores ?? []).map((s) => s.satisfaction as number).filter((v) => v > 0)
    const avgScore = vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0

    const { count: cellarCount } = await this.supabase
      .from('bookmarks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'wine').eq('type', 'cellar')

    const thisMonth = new Date().toISOString().slice(0, 7)
    const { count: thisMonthTastings } = await this.supabase
      .from('records').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'wine')
      .gte('created_at', `${thisMonth}-01`)

    return {
      totalTastings: totalTastings ?? 0,
      avgScore,
      cellarCount: cellarCount ?? 0,
      thisMonthTastings: thisMonthTastings ?? 0,
      thisMonthNewCellar: await this.getThisMonthNewCellar(userId, thisMonth),
      scoreDelta: await this.getScoreDelta(userId, 'wine'),
    }
  }

  async getVarietyDistribution(userId: string): Promise<BarChartItem[]> {
    const { data } = await this.supabase
      .from('records').select('wine:wines!records_linked_wine_id_fkey(grape_variety)')
      .eq('user_id', userId).eq('target_type', 'wine')

    const map = new Map<string, number>()
    for (const r of data ?? []) {
      const wine = r.wine as unknown as Record<string, unknown> | null
      const variety = (wine?.grape_variety as string) ?? '기타'
      map.set(variety, (map.get(variety) ?? 0) + 1)
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
  }

  async getWineScoreDistribution(userId: string): Promise<ScoreDistribution[]> {
    const { data } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', 'wine')
      .not('satisfaction', 'is', null)

    return buildScoreDistribution((data ?? []).map((r) => r.satisfaction as number))
  }

  async getWineMonthlySpending(userId: string, months: number): Promise<MonthlySpending[]> {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const { data } = await this.supabase
      .from('records').select('purchase_price, visit_date')
      .eq('user_id', userId).eq('target_type', 'wine')
      .gte('visit_date', startDate.toISOString().split('T')[0])
      .not('purchase_price', 'is', null)

    const map = new Map<string, { amount: number; count: number }>()
    for (const r of data ?? []) {
      const month = (r.visit_date as string).slice(0, 7)
      const existing = map.get(month) ?? { amount: 0, count: 0 }
      existing.amount += ((r.purchase_price as number) ?? 0)
      existing.count++
      map.set(month, existing)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { amount, count }]) => ({
        month,
        label: `${parseInt(month.split('-')[1])}월`,
        amount,
        count,
      }))
  }

  async getWineRegionMapData(userId: string): Promise<WineRegionMapData[]> {
    const { data } = await this.supabase
      .from('records').select('wine:wines!records_linked_wine_id_fkey(country, region, sub_region, wine_type)')
      .eq('user_id', userId).eq('target_type', 'wine')

    const countryMap = new Map<string, {
      totalWines: number
      typeBreakdown: { red: number; white: number; rose: number; sparkling: number }
      regions: Map<string, { count: number; subRegions: Map<string, number> }>
    }>()

    for (const r of data ?? []) {
      const wine = r.wine as unknown as Record<string, unknown> | null
      if (!wine?.country) continue

      const country = wine.country as string
      if (!countryMap.has(country)) {
        countryMap.set(country, {
          totalWines: 0,
          typeBreakdown: { red: 0, white: 0, rose: 0, sparkling: 0 },
          regions: new Map(),
        })
      }
      const c = countryMap.get(country)!
      c.totalWines++

      const wineType = (wine.wine_type as string) ?? ''
      if (wineType in c.typeBreakdown) {
        (c.typeBreakdown as Record<string, number>)[wineType]++
      }

      const region = (wine.region as string) ?? '기타'
      if (!c.regions.has(region)) {
        c.regions.set(region, { count: 0, subRegions: new Map() })
      }
      const reg = c.regions.get(region)!
      reg.count++

      const subRegion = wine.sub_region as string | null
      if (subRegion) {
        reg.subRegions.set(subRegion, (reg.subRegions.get(subRegion) ?? 0) + 1)
      }
    }

    return Array.from(countryMap.entries()).map(([country, c]) => ({
      country,
      countryCode: COUNTRY_CODE_MAP[country] ?? '',
      totalWines: c.totalWines,
      typeBreakdown: c.typeBreakdown,
      regions: Array.from(c.regions.entries()).map(([region, r]) => ({
        region,
        wineCount: r.count,
        subRegions: Array.from(r.subRegions.entries()).map(([name, count]) => ({ name, count })),
      })),
    }))
  }

  async getWineTypeDistribution(userId: string): Promise<WineTypeDistribution[]> {
    const { data } = await this.supabase
      .from('records').select('wine:wines!records_linked_wine_id_fkey(wine_type)')
      .eq('user_id', userId).eq('target_type', 'wine')

    const map = new Map<string, number>()
    for (const r of data ?? []) {
      const wine = r.wine as unknown as Record<string, unknown> | null
      const wt = (wine?.wine_type as string) ?? '기타'
      map.set(wt, (map.get(wt) ?? 0) + 1)
    }

    const TYPE_LABELS: Record<string, string> = {
      red: '레드', white: '화이트', rose: '로제', sparkling: '스파클링',
    }
    const TYPE_COLORS: Record<string, string> = {
      red: 'var(--accent-wine)', white: 'var(--caution)',
      rose: '#E8A0B8', sparkling: 'var(--accent-social)',
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type] ?? type,
        count,
        color: TYPE_COLORS[type] ?? 'var(--text-hint)',
      }))
  }

  // ── Wrapped ──

  async getWrappedData(userId: string, category: WrappedCategory): Promise<WrappedData> {
    const targetFilter = category === 'all' ? undefined : category

    // 1. 기록 조회
    let query = this.supabase
      .from('records')
      .select('satisfaction, visit_date, comment, total_price, scene, target_type, restaurant:restaurants!records_linked_restaurant_id_fkey(name, genre, city), wine:wines!records_linked_wine_id_fkey(name, grape_variety, country)')
      .eq('user_id', userId)

    if (targetFilter) {
      query = query.eq('target_type', targetFilter)
    }

    const { data: records } = await query
    const items = records ?? []

    // 2. stats 집계
    const stats: { label: string; value: string }[] = [
      { label: '총 기록', value: `${items.length}개` },
    ]

    const scores = items.map((r) => r.satisfaction as number | null).filter((s): s is number => s !== null && s > 0)
    if (scores.length > 0) {
      stats.push({ label: '평균 만족도', value: `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}` })
    }

    // 유저 정보 (taste_tags, total_xp, current_streak)
    const { data: user } = await this.supabase
      .from('users')
      .select('taste_tags, total_xp, current_streak')
      .eq('id', userId)
      .single()

    if (user?.total_xp) {
      stats.push({ label: '총 XP', value: `${user.total_xp as number}` })
    }
    if (user?.current_streak && (user.current_streak as number) > 0) {
      stats.push({ label: '연속 기록', value: `${user.current_streak as number}일` })
    }

    // 식당/와인 카운트 (all 카테고리일 때 세분화)
    if (category === 'all' && items.length > 0) {
      const restCount = items.filter((r) => r.target_type === 'restaurant').length
      const wineCount = items.filter((r) => r.target_type === 'wine').length
      if (restCount > 0) stats.push({ label: '식당 방문', value: `${restCount}곳` })
      if (wineCount > 0) stats.push({ label: '와인 시음', value: `${wineCount}잔` })
    }

    // 3. tags (users.taste_tags)
    const tags: string[] = (user?.taste_tags as string[]) ?? []

    // 4. topItems (만족도 상위 6개)
    const topItems: WrappedData['topItems'] = []
    const scored = items
      .filter((r) => r.satisfaction !== null && (r.satisfaction as number) > 0)
      .sort((a, b) => (b.satisfaction as number) - (a.satisfaction as number))
      .slice(0, 6)

    scored.forEach((r, i) => {
      const restaurant = r.restaurant as unknown as Record<string, unknown> | null
      const wine = r.wine as unknown as Record<string, unknown> | null
      const name = (restaurant?.name as string) ?? (wine?.name as string) ?? '알 수 없음'
      const meta = r.target_type === 'restaurant'
        ? (restaurant?.genre as string) ?? ''
        : (wine?.grape_variety as string) ?? ''
      topItems.push({
        rank: i + 1,
        name,
        meta,
        score: r.satisfaction as number,
      })
    })

    // 5. level (최고 XP 축)
    const { data: xpData } = await this.supabase
      .from('xp_totals').select('axis_type, axis_value, level, total_xp')
      .eq('user_id', userId)
      .order('total_xp', { ascending: false })
      .limit(1)

    const topExp = xpData?.[0]
    const levelData = {
      level: (topExp?.level as number) ?? 1,
      title: getLevelTitle((topExp?.level as number) ?? 1),
      axisLabel: (topExp?.axis_value as string) ?? '',
    }

    // 6. bubbles (사용자가 속한 버블 목록)
    const { data: memberData } = await this.supabase
      .from('bubble_members')
      .select('bubble:bubbles(name, icon_bg_color)')
      .eq('user_id', userId)

    const bubbles: WrappedData['bubbles'] = (memberData ?? [])
      .map((m) => {
        const bubble = m.bubble as unknown as Record<string, unknown> | null
        return {
          name: (bubble?.name as string) ?? '',
          avatarColor: (bubble?.icon_bg_color as string) ?? '#7A9BAE',
        }
      })
      .filter((b) => b.name.length > 0)

    return {
      category,
      stats,
      tags,
      level: levelData,
      topItems,
      bubbles,
    }
  }

  // ── 통계 헬퍼 ──

  private async getThisMonthNewAreas(userId: string, thisMonth: string, existingAreas: Set<string>): Promise<number> {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = lastMonth.toISOString().slice(0, 7)

    const { data: prevRecords } = await this.supabase
      .from('records').select('restaurant:restaurants!records_linked_restaurant_id_fkey(city)')
      .eq('user_id', userId).eq('target_type', 'restaurant')
      .lt('created_at', `${thisMonth}-01`)

    const prevAreas = new Set<string>()
    for (const r of prevRecords ?? []) {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      if (rest?.city) prevAreas.add(rest.city as string)
    }

    let newCount = 0
    for (const area of existingAreas) {
      if (!prevAreas.has(area)) newCount++
    }
    return newCount
  }

  private async getThisMonthNewCellar(userId: string, thisMonth: string): Promise<number> {
    const { count } = await this.supabase
      .from('bookmarks').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('target_type', 'wine').eq('type', 'cellar')
      .gte('created_at', `${thisMonth}-01`)

    return count ?? 0
  }

  private async getScoreDelta(userId: string, targetType: string): Promise<number> {
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStr = lastMonth.toISOString().slice(0, 7)
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const { data: thisData } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', targetType)
      .not('satisfaction', 'is', null)
      .gte('created_at', `${thisMonth}-01`)

    const { data: lastData } = await this.supabase
      .from('records').select('satisfaction')
      .eq('user_id', userId).eq('target_type', targetType)
      .not('satisfaction', 'is', null)
      .gte('created_at', `${lastMonthStr}-01`)
      .lt('created_at', `${thisMonth}-01`)

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    const thisAvg = avg((thisData ?? []).map((r) => r.satisfaction as number))
    const lastAvg = avg((lastData ?? []).map((r) => r.satisfaction as number))

    if (thisAvg === 0 || lastAvg === 0) return 0
    return thisAvg - lastAvg
  }

  // ── 버블러 프로필 ──

  async getBubblerProfile(userId: string, bubbleId: string | null, targetType: 'restaurant' | 'wine' = 'restaurant'): Promise<BubblerProfileData | null> {
    const { data: user } = await this.supabase
      .from('users')
      .select('nickname, handle, avatar_url, avatar_color, total_xp, taste_tags, bio')
      .eq('id', userId)
      .single()

    if (!user) return null

    const [{ data: xpData }, { data: streakUser }, heatmap] = await Promise.all([
      this.supabase.from('xp_totals').select('level').eq('user_id', userId).order('level', { ascending: false }).limit(1),
      this.supabase.from('users').select('current_streak, created_at').eq('id', userId).single(),
      this.getHeatmapData(userId, 13),
    ])

    const level = (xpData?.[0]?.level as number) ?? 1
    const currentStreak = (streakUser?.current_streak as number) ?? 0

    // 활동 기간 계산
    const createdAt = streakUser?.created_at as string | null
    let activeDuration = '-'
    if (createdAt) {
      const diffMs = Date.now() - new Date(createdAt).getTime()
      const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
      activeDuration = months < 1 ? '1개월 미만' : `${months}개월`
    }

    const { data: records } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, total_price, purchase_price, scene, restaurant:restaurants!records_linked_restaurant_id_fkey(name, genre, area, photos), wine:wines!records_linked_wine_id_fkey(name, type, region, photos)')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('satisfaction', { ascending: false })
      .limit(20)

    const topPicks = (records ?? []).slice(0, 6).map((r) => {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const wine = r.wine as unknown as Record<string, unknown> | null
      const tType = r.target_type as string
      const name = tType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? '')
      const genre = tType === 'restaurant' ? ((rest?.genre as string) ?? null) : ((wine?.type as string) ?? null)
      const area = tType === 'restaurant' ? ((rest?.area as string) ?? null) : ((wine?.region as string) ?? null)
      const metaParts = [genre, area].filter(Boolean)
      return {
        id: r.id as string,
        targetId: r.target_id as string,
        targetType: tType as 'restaurant' | 'wine',
        name,
        meta: metaParts.join(' · ') || '',
        satisfaction: r.satisfaction as number | null,
        photoUrl: (tType === 'restaurant' ? (rest?.photos as string[])?.[0] : (wine?.photos as string[])?.[0]) ?? null,
        genre,
      }
    })

    const { data: recentData } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, created_at, restaurant:restaurants!records_linked_restaurant_id_fkey(name, genre, area, photos), wine:wines!records_linked_wine_id_fkey(name, type, region, photos)')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('created_at', { ascending: false })
      .limit(10)

    const recentRecords = (recentData ?? []).map((r) => {
      const rest = r.restaurant as unknown as Record<string, unknown> | null
      const wine = r.wine as unknown as Record<string, unknown> | null
      const tType = r.target_type as string
      const targetName = tType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? '')
      const genre = tType === 'restaurant' ? ((rest?.genre as string) ?? null) : ((wine?.type as string) ?? null)
      const area = tType === 'restaurant' ? ((rest?.area as string) ?? null) : ((wine?.region as string) ?? null)
      const dateStr = r.visit_date as string | null
      const relativeDate = dateStr ? formatRelativeDate(dateStr) : null
      const metaParts = [genre, area, relativeDate].filter(Boolean)
      const photoUrl = (tType === 'restaurant' ? (rest?.photos as string[])?.[0] : (wine?.photos as string[])?.[0]) ?? null
      return {
        id: r.id as string,
        targetId: r.target_id as string,
        targetType: tType as 'restaurant' | 'wine',
        targetName,
        meta: metaParts.join(' · ') || '',
        satisfaction: r.satisfaction as number | null,
        comment: (r.comment as string) ?? null,
        photoUrl,
        visitDate: dateStr,
      }
    })

    let bubbleContext = null
    if (bubbleId) {
      const { data: member } = await this.supabase
        .from('bubble_members')
        .select('taste_match_pct, common_target_count, joined_at, bubbles(name, icon)')
        .eq('bubble_id', bubbleId).eq('user_id', userId)
        .single()

      if (member) {
        const bubble = (member as Record<string, unknown>).bubbles as Record<string, unknown> | null

        // 주간 랭킹 계산: 이번 주 버블 공유 수 기준
        let weeklyRank: number | null = null
        let weeklyTotal: number | null = null
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekStartIso = weekStart.toISOString()

        const { data: allMembers } = await this.supabase
          .from('bubble_members')
          .select('user_id')
          .eq('bubble_id', bubbleId)
          .eq('status', 'active')

        if (allMembers && allMembers.length > 0) {
          const memberUserIds = allMembers.map((m: Record<string, unknown>) => m.user_id as string)
          weeklyTotal = memberUserIds.length

          const { data: weekShares } = await this.supabase
            .from('bubble_items')
            .select('added_by')
            .eq('bubble_id', bubbleId)
            .gte('added_at', weekStartIso)

          const shareCounts = new Map<string, number>()
          for (const uid of memberUserIds) {
            shareCounts.set(uid, 0)
          }
          for (const s of weekShares ?? []) {
            const uid = s.added_by as string
            shareCounts.set(uid, (shareCounts.get(uid) ?? 0) + 1)
          }

          const sorted = [...shareCounts.entries()].sort((a, b) => b[1] - a[1])
          const myIndex = sorted.findIndex(([uid]) => uid === userId)
          weeklyRank = myIndex >= 0 ? myIndex + 1 : null
        }

        const matchPct = (member as Record<string, unknown>).taste_match_pct as number | null
        const matchCount = (member as Record<string, unknown>).common_target_count as number | null
        const commonCount = (matchCount as number) ?? 0

        bubbleContext = {
          bubbleId,
          bubbleName: (bubble?.name as string) ?? '',
          bubbleIcon: (bubble?.icon as string) ?? null,
          rank: weeklyRank,
          rankTotal: weeklyTotal,
          memberSince: (member as Record<string, unknown>).joined_at as string,
          tasteMatchPct: matchPct,
          tasteMatchCount: matchCount,
          tasteMatchDetail: matchPct !== null && commonCount >= 3
            ? `${matchPct}% (${commonCount}곳 일치)`
            : null,
          commonTargetCount: commonCount,
        }
      }
    }

    // 카테고리 비율 계산 (장르/타입 기준)
    const allRecords = records ?? []
    const categoryMap = new Map<string, number>()
    for (const r of allRecords) {
      const tType = r.target_type as string
      if (tType === 'restaurant') {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        const genre = (rest?.genre as string) ?? '기타'
        categoryMap.set(genre, (categoryMap.get(genre) ?? 0) + 1)
      } else {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const wType = (wine?.type as string) ?? '기타'
        categoryMap.set(wType, (categoryMap.get(wType) ?? 0) + 1)
      }
    }
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        percentage: allRecords.length > 0 ? Math.round((count / allRecords.length) * 100) : 0,
      }))

    // 평균 만족도
    const satisfactions = allRecords
      .map((r) => r.satisfaction as number | null)
      .filter((s): s is number => s !== null)
    const avgSatisfaction = satisfactions.length > 0
      ? Math.round(satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length)
      : 0

    // 평점 성향 라벨
    const scoreTendencyLabel = getScoreTendencyLabel(avgSatisfaction)

    // 지역 태그 (식당: area, 와인: region 기준 상위 3개)
    const regionMap = new Map<string, number>()
    for (const r of allRecords) {
      if (targetType === 'restaurant') {
        const rest = r.restaurant as unknown as Record<string, unknown> | null
        const area = rest?.area as string | null
        if (area) regionMap.set(area, (regionMap.get(area) ?? 0) + 1)
      } else {
        const wine = r.wine as unknown as Record<string, unknown> | null
        const region = wine?.region as string | null
        if (region) regionMap.set(region, (regionMap.get(region) ?? 0) + 1)
      }
    }
    const topRegions = Array.from(regionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)

    return {
      nickname: user.nickname as string,
      handle: user.handle as string | null,
      avatarUrl: user.avatar_url as string | null,
      avatarColor: user.avatar_color as string | null,
      bio: (user.bio as string) ?? null,
      level,
      levelTitle: getLevelTitle(level),
      tasteTags: (user.taste_tags as string[]) ?? [],
      categories,
      avgSatisfaction,
      scoreTendencyLabel,
      totalRecords: allRecords.length,
      topRegions,
      topPicks,
      recentRecords,
      heatmap,
      bubbleContext,
      currentStreak,
      activeDuration,
    }
  }
}

// ── 유틸 ──


function getScoreTendencyLabel(avgSatisfaction: number): string {
  if (avgSatisfaction === 0) return '-'
  if (avgSatisfaction >= 85) return '후한 편'
  if (avgSatisfaction >= 75) return '조금 후한 편'
  if (avgSatisfaction >= 65) return '보통'
  if (avgSatisfaction >= 55) return '조금 까다로운 편'
  return '까다로운 편'
}

function getLevelTitle(level: number): string {
  if (level <= 3) return '입문자'
  if (level <= 5) return '초보 미식가'
  if (level <= 7) return '탐식가'
  if (level <= 9) return '미식가'
  return '식도락 마스터'
}

const COUNTRY_CODE_MAP: Record<string, string> = {
  '프랑스': 'FR', '이탈리아': 'IT', '스페인': 'ES', '독일': 'DE',
  '포르투갈': 'PT', '미국': 'US', '호주': 'AU', '뉴질랜드': 'NZ',
  '칠레': 'CL', '아르헨티나': 'AR', '남아프리카공화국': 'ZA',
  '오스트리아': 'AT', '그리스': 'GR', '헝가리': 'HU', '조지아': 'GE',
  '일본': 'JP', '한국': 'KR', '중국': 'CN', '레바논': 'LB',
  France: 'FR', Italy: 'IT', Spain: 'ES', Germany: 'DE',
  Portugal: 'PT', USA: 'US', Australia: 'AU', 'New Zealand': 'NZ',
  Chile: 'CL', Argentina: 'AR', 'South Africa': 'ZA',
  Austria: 'AT', Greece: 'GR', Hungary: 'HU', Georgia: 'GE',
  Japan: 'JP', Korea: 'KR', China: 'CN', Lebanon: 'LB',
}

function buildScoreDistribution(scores: number[]): ScoreDistribution[] {
  const ranges = [
    { range: '~49', min: 0, max: 49 },
    { range: '50s', min: 50, max: 59 },
    { range: '60s', min: 60, max: 69 },
    { range: '70s', min: 70, max: 79 },
    { range: '80s', min: 80, max: 89 },
    { range: '90s', min: 90, max: 100 },
  ]

  return ranges.map(({ range, min, max }) => ({
    range,
    count: scores.filter((s) => s >= min && s <= max).length,
  }))
}
