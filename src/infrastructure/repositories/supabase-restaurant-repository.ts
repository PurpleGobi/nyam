import type {
  RestaurantRepository,
  CreateRestaurantInput,
  QuadrantRefDot,
  LinkedWineCard,
  BubbleScoreRow,
} from '@/domain/repositories/restaurant-repository'
import type { Restaurant, RestaurantPrestige } from '@/domain/entities/restaurant'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { RestaurantSearchResult, NearbyRestaurant } from '@/domain/entities/search'
import { createClient } from '@/infrastructure/supabase/client'

function mapDbToRestaurant(data: Record<string, unknown>): Restaurant {
  return {
    id: data.id as string,
    name: data.name as string,
    address: data.address as string | null,
    country: (data.country as string) ?? '한국',
    city: (data.city as string) ?? '서울',
    area: data.area as string[] | null,
    district: data.district as string | null,
    genre: data.genre as Restaurant['genre'],
    priceRange: data.price_range as Restaurant['priceRange'],
    lat: data.lat as number | null,
    lng: data.lng as number | null,
    phone: data.phone as string | null,
    hours: data.hours as Restaurant['hours'],
    photos: data.photos as string[] | null,
    menus: data.menus as Restaurant['menus'],
    naverRating: data.naver_rating ? Number(data.naver_rating) : null,
    kakaoRating: data.kakao_rating ? Number(data.kakao_rating) : null,
    googleRating: data.google_rating ? Number(data.google_rating) : null,
    prestige: (data.prestige ?? []) as RestaurantPrestige[],
    nyamScore: data.nyam_score ? Number(data.nyam_score) : null,
    nyamScoreUpdatedAt: data.nyam_score_updated_at as string | null,
    externalIdKakao: data.external_id_kakao as string | null,
    externalIdGoogle: data.external_id_google as string | null,
    externalIdNaver: data.external_id_naver as string | null,
    cachedAt: data.cached_at as string | null,
    nextRefreshAt: data.next_refresh_at as string | null,
    createdAt: data.created_at as string,
  }
}

function mapDbToRecord(row: Record<string, unknown>): DiningRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targetId: row.target_id as string,
    targetType: row.target_type as DiningRecord['targetType'],
    axisX: row.axis_x != null ? Number(row.axis_x) : null,
    axisY: row.axis_y != null ? Number(row.axis_y) : null,
    satisfaction: row.satisfaction != null ? Number(row.satisfaction) : null,
    scene: (row.scene as string) ?? null,
    comment: (row.comment as string) ?? null,
    totalPrice: row.total_price != null ? Number(row.total_price) : null,
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
    visitDate: (row.visit_date as string) ?? null,
    mealTime: (row.meal_time as DiningRecord['mealTime']) ?? null,
    menuTags: row.menu_tags as string[] | null,
    pairingCategories: row.pairing_categories as DiningRecord['pairingCategories'],
    hasExifGps: (row.has_exif_gps as boolean) ?? false,
    isExifVerified: (row.is_exif_verified as boolean) ?? false,
    cameraMode: row.camera_mode as DiningRecord['cameraMode'],
    ocrData: row.ocr_data as Record<string, unknown> | null,
    aromaPrimary: (row.aroma_primary as string[]) ?? [],
    aromaSecondary: (row.aroma_secondary as string[]) ?? [],
    aromaTertiary: (row.aroma_tertiary as string[]) ?? [],
    complexity: row.complexity != null ? Number(row.complexity) : null,
    finish: row.finish != null ? Number(row.finish) : null,
    balance: row.balance != null ? Number(row.balance) : null,
    intensity: row.intensity != null ? Number(row.intensity) : null,
    autoScore: row.auto_score != null ? Number(row.auto_score) : null,
    privateNote: (row.private_note as string) ?? null,
    companionCount: row.companion_count != null ? Number(row.companion_count) : null,
    companions: (row.companions as string[]) ?? null,
    linkedRestaurantId: row.linked_restaurant_id as string | null,
    linkedWineId: row.linked_wine_id as string | null,
    recordQualityXp: (row.record_quality_xp as number) ?? 0,
    scoreUpdatedAt: (row.score_updated_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseRestaurantRepository implements RestaurantRepository {
  private get supabase() {
    return createClient()
  }

  // ─── S4: 상세 페이지 ───

  async findById(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return mapDbToRestaurant(data as unknown as Record<string, unknown>)
  }

  async findMyRecords(restaurantId: string, userId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('target_id', restaurantId)
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')
      .order('visit_date', { ascending: false, nullsFirst: false })

    if (error) throw new Error(`기록 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => mapDbToRecord(r as unknown as Record<string, unknown>))
  }

  async findPublicRecordsByTarget(restaurantId: string, excludeUserId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')
      .neq('user_id', excludeUserId)
      .order('visit_date', { ascending: false, nullsFirst: false })

    if (error) throw new Error(`공개 기록 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => mapDbToRecord(r as unknown as Record<string, unknown>))
  }

  async findRecordPhotos(recordIds: string[]): Promise<Map<string, RecordPhoto[]>> {
    const result = new Map<string, RecordPhoto[]>()
    if (recordIds.length === 0) return result

    const { data, error } = await this.supabase
      .from('record_photos')
      .select('*')
      .in('record_id', recordIds)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`사진 조회 실패: ${error.message}`)

    for (const row of data ?? []) {
      const photos = result.get(row.record_id) ?? []
      photos.push({
        id: row.id,
        recordId: row.record_id,
        url: row.url,
        orderIndex: row.order_index,
        isPublic: (row as Record<string, unknown>).is_public as boolean ?? false,
        exifLat: (row as Record<string, unknown>).exif_lat as number | null ?? null,
        exifLng: (row as Record<string, unknown>).exif_lng as number | null ?? null,
        capturedAt: (row as Record<string, unknown>).captured_at as string | null ?? null,
        createdAt: row.created_at,
      })
      result.set(row.record_id, photos)
    }
    return result
  }

  async findQuadrantRefs(userId: string, excludeId: string): Promise<QuadrantRefDot[]> {
    // 내가 리뷰한 다른 식당들의 평균 좌표 (최대 12개)
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id, axis_x, axis_y, satisfaction')
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')
      .neq('target_id', excludeId)
      .not('axis_x', 'is', null)

    if (error) throw new Error(`사분면 참조 조회 실패: ${error.message}`)

    // target_id별 평균 집계
    const grouped = new Map<string, { sumX: number; sumY: number; sumS: number; count: number }>()
    for (const row of data ?? []) {
      if (row.axis_x == null || row.axis_y == null || row.satisfaction == null) continue
      const g = grouped.get(row.target_id) ?? { sumX: 0, sumY: 0, sumS: 0, count: 0 }
      g.sumX += Number(row.axis_x)
      g.sumY += Number(row.axis_y)
      g.sumS += Number(row.satisfaction)
      g.count += 1
      grouped.set(row.target_id, g)
    }

    // 식당명 조회
    const targetIds = Array.from(grouped.keys()).slice(0, 12)
    if (targetIds.length === 0) return []

    const { data: restaurants } = await this.supabase
      .from('restaurants')
      .select('id, name')
      .in('id', targetIds)

    const nameMap = new Map((restaurants ?? []).map((r) => [r.id, r.name]))

    return targetIds.map((tid) => {
      const g = grouped.get(tid)!
      return {
        targetId: tid,
        targetName: nameMap.get(tid) ?? '',
        avgAxisX: Math.round(g.sumX / g.count),
        avgAxisY: Math.round(g.sumY / g.count),
        avgSatisfaction: Math.round(g.sumS / g.count),
      }
    })
  }

  async findLinkedWines(restaurantId: string, userId: string): Promise<LinkedWineCard[]> {
    // 이 식당 기록 중 linked_wine_id가 있는 것
    const { data: records, error } = await this.supabase
      .from('records')
      .select('linked_wine_id, satisfaction')
      .eq('target_id', restaurantId)
      .eq('user_id', userId)
      .eq('target_type', 'restaurant')
      .not('linked_wine_id', 'is', null)

    if (error) throw new Error(`연결 와인 조회 실패: ${error.message}`)
    if (!records || records.length === 0) return []

    const wineIds = [...new Set(records.map((r) => r.linked_wine_id as string))]
    const { data: wines } = await this.supabase
      .from('wines')
      .select('id, name, wine_type, label_image_url')
      .in('id', wineIds)

    const wineMap = new Map((wines ?? []).map((w) => [w.id, w]))

    return wineIds.map((wid) => {
      const wine = wineMap.get(wid)
      const rec = records.find((r) => r.linked_wine_id === wid)
      return {
        wineId: wid,
        wineName: wine?.name ?? '',
        wineType: wine?.wine_type ?? null,
        labelImageUrl: wine?.label_image_url ?? null,
        satisfaction: rec?.satisfaction ?? null,
      }
    })
  }

  async findBubbleScores(restaurantId: string, userId: string): Promise<BubbleScoreRow[]> {
    // 유저가 속한 버블 목록
    const { data: memberships } = await this.supabase
      .from('bubble_members')
      .select('bubble_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (!memberships || memberships.length === 0) return []

    const bubbleIds = memberships.map((m) => m.bubble_id)

    // 버블 정보
    const { data: bubbles } = await this.supabase
      .from('bubbles')
      .select('id, name, icon, icon_bg_color')
      .in('id', bubbleIds)

    // bubble_items 기반으로 해당 식당 포함 버블 조회
    const { data: items } = await this.supabase
      .from('bubble_items')
      .select('bubble_id, target_id, added_by')
      .in('bubble_id', bubbleIds)
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')

    if (!items || items.length === 0) return []

    // 해당 식당의 기록을 별도 조회 (본인 제외)
    const itemUserIds = [...new Set(items.map((i) => i.added_by as string).filter((uid) => uid !== userId))]
    const { data: recData } = await this.supabase
      .from('records')
      .select('satisfaction, axis_x, axis_y, user_id')
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')
      .in('user_id', itemUserIds)

    // user_id → bubble_id 매핑 (한 유저가 여러 버블에 있을 수 있음)
    const userBubbleMap = new Map<string, Set<string>>()
    for (const item of items) {
      const uid = item.added_by as string
      if (uid === userId) continue
      const bids = userBubbleMap.get(uid) ?? new Set()
      bids.add(item.bubble_id as string)
      userBubbleMap.set(uid, bids)
    }

    // 버블별 집계 + 개별 dot 수집
    const scoreMap = new Map<string, { total: number; count: number; dots: Array<{ axisX: number; axisY: number; satisfaction: number }> }>()
    for (const r of recData ?? []) {
      const rec = r as unknown as { satisfaction: number | null; axis_x: number | null; axis_y: number | null; user_id: string }
      const sat = rec?.satisfaction
      if (sat === null || sat === undefined) continue
      const bids = userBubbleMap.get(rec.user_id)
      if (!bids) continue
      for (const bid of bids) {
        const g = scoreMap.get(bid) ?? { total: 0, count: 0, dots: [] }
        g.total += sat
        g.count += 1
        if (rec.axis_x != null && rec.axis_y != null) {
          g.dots.push({ axisX: rec.axis_x, axisY: rec.axis_y, satisfaction: sat })
        }
        scoreMap.set(bid, g)
      }
    }

    return (bubbles ?? [])
      .map((b) => {
        const g = scoreMap.get(b.id)
        return {
          bubbleId: b.id,
          bubbleName: b.name,
          bubbleIcon: b.icon,
          bubbleColor: b.icon_bg_color,
          memberCount: g?.count ?? 0,
          avgScore: g ? Math.round(g.total / g.count) : null,
          dots: g?.dots ?? [],
        }
      })
      .filter((b) => b.memberCount > 0)
  }

  // ─── S3: 검색/등록 ───

  async search(query: string, userId: string): Promise<RestaurantSearchResult[]> {
    const { data, error } = await this.supabase
      .from('restaurants')
      .select('id, name, genre, area, address, lat, lng, phone, kakao_map_url, prestige')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
      .limit(20)

    if (error) throw new Error(`식당 검색 실패: ${error.message}`)

    const restaurantIds = (data ?? []).map((r) => r.id)
    const { data: userRecords } = restaurantIds.length > 0
      ? await this.supabase
          .from('records')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'restaurant')
          .in('target_id', restaurantIds)
      : { data: [] }

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (data ?? []).map((r) => ({
      id: r.id,
      type: 'restaurant' as const,
      name: r.name,
      genre: r.genre,
      genreDisplay: r.genre,
      categoryPath: null,
      area: r.area,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone ?? null,
      kakaoMapUrl: r.kakao_map_url ?? null,
      prestige: (r.prestige ?? []) as RestaurantPrestige[],
      distance: null,
      hasRecord: recordedIds.has(r.id),
    }))
  }

  async findNearby(lat: number, lng: number, radiusMeters: number, userId: string): Promise<NearbyRestaurant[]> {
    const { data, error } = await this.supabase.rpc('restaurants_within_radius', {
      lat,
      lng,
      radius_meters: radiusMeters,
    })

    if (error) throw new Error(`근처 식당 조회 실패: ${error.message}`)

    const nearbyIds = ((data as Array<{ id: string }>) ?? []).map((r) => r.id)
    const { data: userRecords } = nearbyIds.length > 0
      ? await this.supabase
          .from('records')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'restaurant')
          .in('target_id', nearbyIds)
      : { data: [] }

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (
      (data as Array<{ id: string; name: string; genre: string | null; area: string | null; address: string | null; lat: number | null; lng: number | null; prestige: unknown; distance: number }>) ?? []
    ).map((r) => ({
      id: r.id,
      name: r.name,
      genre: r.genre,
      area: r.area,
      address: r.address ?? null,
      categoryPath: null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      prestige: (r.prestige ?? []) as RestaurantPrestige[],
      distance: r.distance,
      hasRecord: recordedIds.has(r.id),
    }))
  }

  async create(input: CreateRestaurantInput): Promise<{ id: string; name: string; isExisting: boolean }> {
    const { data: existing } = await this.supabase
      .from('restaurants')
      .select('id, name')
      .ilike('name', input.name)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { id: existing.id, name: existing.name, isExisting: true }
    }

    const now = new Date().toISOString()
    const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await this.supabase
      .from('restaurants')
      .insert({
        name: input.name,
        address: input.address ?? null,
        area: input.area ?? null,
        genre: input.genre ?? null,
        price_range: input.priceRange ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        phone: input.phone ?? null,
        external_id_kakao: input.externalIdKakao ?? null,
        external_id_google: input.externalIdGoogle ?? null,
        external_id_naver: input.externalIdNaver ?? null,
        cached_at: now,
        next_refresh_at: twoWeeksLater,
      })
      .select('id, name')
      .single()

    if (error) throw new Error(`식당 등록 실패: ${error.message}`)
    return { id: data.id, name: data.name, isExisting: false }
  }

  // ─── 점수 체계: 팔로잉/공개 ───

  async findFollowingRecordsByTarget(restaurantId: string, userId: string): Promise<DiningRecord[]> {
    const { data: followRows } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
    if (!followRows || followRows.length === 0) return []
    const followingIds = followRows.map((f) => f.following_id)

    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')
      .in('user_id', followingIds)
      .not('satisfaction', 'is', null)
      .order('visit_date', { ascending: false })
    if (error) throw new Error(`Following records by target 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => mapDbToRecord(r as unknown as Record<string, unknown>))
  }

}
