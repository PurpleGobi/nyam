import type {
  WineRepository,
  CreateWineInput,
  LinkedRestaurantCard,
} from '@/domain/repositories/wine-repository'
import type { Wine, GrapeVariety } from '@/domain/entities/wine'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { WineSearchResult } from '@/domain/entities/search'
import type { QuadrantRefDot, BubbleScoreRow } from '@/domain/repositories/restaurant-repository'
import type { Database } from '@/infrastructure/supabase/types'
import { createClient } from '@/infrastructure/supabase/client'

type WineInsert = Database['public']['Tables']['wines']['Insert']

function mapDbToWine(data: Record<string, unknown>): Wine {
  return {
    id: data.id as string,
    name: data.name as string,
    producer: data.producer as string | null,
    region: data.region as string | null,
    subRegion: data.sub_region as string | null,
    appellation: data.appellation as string | null,
    country: data.country as string | null,
    variety: data.variety as string | null,
    grapeVarieties: (data.grape_varieties as GrapeVariety[]) ?? [],
    wineType: data.wine_type as Wine['wineType'],
    vintage: data.vintage as number | null,
    abv: data.abv ? Number(data.abv) : null,
    labelImageUrl: data.label_image_url as string | null,
    photos: (data.photos as string[]) ?? [],
    bodyLevel: data.body_level as number | null,
    acidityLevel: data.acidity_level as number | null,
    sweetnessLevel: data.sweetness_level as number | null,
    foodPairings: (data.food_pairings as string[]) ?? [],
    servingTemp: data.serving_temp as string | null,
    decanting: data.decanting as string | null,
    referencePriceMin: data.reference_price_min as number | null,
    referencePriceMax: data.reference_price_max as number | null,
    drinkingWindowStart: data.drinking_window_start as number | null,
    drinkingWindowEnd: data.drinking_window_end as number | null,
    vivinoRating: data.vivino_rating ? Number(data.vivino_rating) : null,
    criticScores: data.critic_scores as Wine['criticScores'],
    classification: data.classification as string | null,
    tastingNotes: data.tasting_notes as string | null,
    priceReview: data.price_review as Wine['priceReview'],
    nyamScore: data.nyam_score ? Number(data.nyam_score) : null,
    nyamScoreUpdatedAt: data.nyam_score_updated_at as string | null,
    externalIds: data.external_ids as Wine['externalIds'],
    cachedAt: data.cached_at as string | null,
    nextRefreshAt: data.next_refresh_at as string | null,
    createdAt: data.created_at as string,
  }
}

function mapDbToRecord(row: Record<string, unknown>): DiningRecord {
  return {
    id: row.id as string,
    listId: (row.list_id as string) ?? '',
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

export class SupabaseWineRepository implements WineRepository {
  private get supabase() {
    return createClient()
  }

  // ─── S4: 상세 페이지 ───

  async findById(id: string): Promise<Wine | null> {
    const { data, error } = await this.supabase
      .from('wines')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return mapDbToWine(data as unknown as Record<string, unknown>)
  }

  async findMyRecords(wineId: string, userId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('target_id', wineId)
      .eq('user_id', userId)
      .eq('target_type', 'wine')
      .order('visit_date', { ascending: false, nullsFirst: false })

    if (error) throw new Error(`기록 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => mapDbToRecord(r as unknown as Record<string, unknown>))
  }

  async findPublicRecordsByTarget(wineId: string, excludeUserId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select('*')
      .eq('target_id', wineId)
      .eq('target_type', 'wine')
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
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id, axis_x, axis_y, satisfaction')
      .eq('user_id', userId)
      .eq('target_type', 'wine')
      .neq('target_id', excludeId)
      .not('axis_x', 'is', null)

    if (error) throw new Error(`사분면 참조 조회 실패: ${error.message}`)

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

    const targetIds = Array.from(grouped.keys()).slice(0, 12)
    if (targetIds.length === 0) return []

    const { data: wines } = await this.supabase
      .from('wines')
      .select('id, name')
      .in('id', targetIds)

    const nameMap = new Map((wines ?? []).map((w) => [w.id, w.name]))

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

  async findLinkedRestaurants(wineId: string, userId: string): Promise<LinkedRestaurantCard[]> {
    const { data: records, error } = await this.supabase
      .from('records')
      .select('linked_restaurant_id, satisfaction')
      .eq('target_id', wineId)
      .eq('user_id', userId)
      .eq('target_type', 'wine')
      .not('linked_restaurant_id', 'is', null)

    if (error) throw new Error(`연결 식당 조회 실패: ${error.message}`)
    if (!records || records.length === 0) return []

    const restIds = [...new Set(records.map((r) => r.linked_restaurant_id as string))]
    const { data: restaurants } = await this.supabase
      .from('restaurants')
      .select('id, name, genre, photos')
      .in('id', restIds)

    const restMap = new Map((restaurants ?? []).map((r) => [r.id, r]))

    return restIds.map((rid) => {
      const rest = restMap.get(rid)
      const rec = records.find((r) => r.linked_restaurant_id === rid)
      return {
        restaurantId: rid,
        restaurantName: rest?.name ?? '',
        genre: rest?.genre ?? null,
        photoUrl: (rest?.photos as string[] | null)?.[0] ?? null,
        satisfaction: rec?.satisfaction ?? null,
      }
    })
  }

  async findBubbleScores(wineId: string, userId: string): Promise<BubbleScoreRow[]> {
    const { data: memberships } = await this.supabase
      .from('bubble_members')
      .select('bubble_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (!memberships || memberships.length === 0) return []

    const bubbleIds = memberships.map((m) => m.bubble_id)

    const { data: bubbles } = await this.supabase
      .from('bubbles')
      .select('id, name, icon, icon_bg_color')
      .in('id', bubbleIds)

    const { data: shares } = await this.supabase
      .from('bubble_shares')
      .select('bubble_id, record_id, records!inner(satisfaction, axis_x, axis_y, user_id)')
      .in('bubble_id', bubbleIds)
      .eq('records.target_id' as string, wineId)
      .eq('records.target_type' as string, 'wine')
      .neq('records.user_id' as string, userId)

    const scoreMap = new Map<string, { total: number; count: number; dots: Array<{ axisX: number; axisY: number; satisfaction: number }> }>()
    for (const s of shares ?? []) {
      const rec = s.records as unknown as { satisfaction: number | null; axis_x: number | null; axis_y: number | null }
      const sat = rec?.satisfaction
      if (sat === null || sat === undefined) continue
      const g = scoreMap.get(s.bubble_id) ?? { total: 0, count: 0, dots: [] }
      g.total += sat
      g.count += 1
      if (rec.axis_x != null && rec.axis_y != null) {
        g.dots.push({ axisX: rec.axis_x, axisY: rec.axis_y, satisfaction: sat })
      }
      scoreMap.set(s.bubble_id, g)
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

  async search(query: string, userId: string): Promise<WineSearchResult[]> {
    const { data: wines, error } = await this.supabase
      .from('wines')
      .select('id, name, producer, vintage, wine_type, region, country')
      .or(`name.ilike.%${query}%,producer.ilike.%${query}%`)
      .order('name')
      .limit(20)

    if (error || !wines) return []

    const wineIds = (wines ?? []).map((w) => w.id)
    const { data: userRecords } = wineIds.length > 0
      ? await this.supabase
          .from('records')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', 'wine')
          .in('target_id', wineIds)
      : { data: [] }

    const recordedIds = new Set((userRecords ?? []).map((r) => r.target_id))

    return (wines ?? []).map((w) => ({
      id: w.id,
      type: 'wine' as const,
      name: w.name,
      producer: w.producer,
      vintage: w.vintage,
      wineType: w.wine_type,
      region: w.region,
      country: w.country,
      hasRecord: recordedIds.has(w.id),
    }))
  }

  async create(input: CreateWineInput): Promise<{ id: string; name: string; isExisting: boolean }> {
    let query = this.supabase
      .from('wines')
      .select('id, name')
      .ilike('name', input.name)

    if (input.vintage) {
      query = query.eq('vintage', input.vintage)
    }

    const { data: existing } = await query.limit(1).maybeSingle()

    if (existing) {
      return { id: existing.id, name: existing.name, isExisting: true }
    }

    const insertData: WineInsert = {
      name: input.name,
      wine_type: input.wineType as WineInsert['wine_type'],
      producer: input.producer ?? null,
      vintage: input.vintage ?? null,
      region: input.region ?? null,
      country: input.country ?? null,
      variety: input.variety ?? null,
      label_image_url: input.labelImageUrl ?? null,
    }

    const { data, error } = await this.supabase
      .from('wines')
      .insert(insertData)
      .select('id, name')
      .single()

    if (error) throw new Error(`와인 등록 실패: ${error.message}`)
    return { id: data.id, name: data.name, isExisting: false }
  }

  // ─── 점수 체계: 팔로잉/공개 ───

  async findFollowingRecordsByTarget(wineId: string, userId: string): Promise<DiningRecord[]> {
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
      .eq('target_id', wineId)
      .eq('target_type', 'wine')
      .in('user_id', followingIds)
      .not('satisfaction', 'is', null)
      .order('visit_date', { ascending: false })
    if (error) throw new Error(`Following records by target 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => mapDbToRecord(r as unknown as Record<string, unknown>))
  }

  async findPublicSatisfactionAvg(wineId: string, excludeUserId?: string): Promise<{ avg: number; count: number } | null> {
    let query = this.supabase
      .from('records')
      .select('satisfaction, users!inner(is_public)')
      .eq('target_id', wineId)
      .eq('target_type', 'wine')
      .eq('users.is_public', true)
      .not('satisfaction', 'is', null)
    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }
    const { data, error } = await query
    if (error) throw new Error(`Public satisfaction 조회 실패: ${error.message}`)
    if (!data || data.length === 0) return null

    const sum = data.reduce((s, r) => s + (r.satisfaction ?? 0), 0)
    return { avg: Math.round(sum / data.length), count: data.length }
  }
}
