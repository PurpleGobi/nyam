import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { DiningRecord, CreateRecordInput, AddVisitInput, RecordTargetType, RecordWithTarget, RecordVisit } from '@/domain/entities/record'
import { calcAvgSatisfaction } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { createClient } from '@/infrastructure/supabase/client'

// ─── DB → Domain 매핑 ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToRecord(row: any): DiningRecord {
  const rawVisits = (row.visits ?? []) as Record<string, unknown>[]
  const visits: RecordVisit[] = rawVisits.map(mapRawVisit)

  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type,
    status: row.status,
    wineStatus: row.wine_status ?? null,
    cameraMode: row.camera_mode ?? null,
    ocrData: row.ocr_data as Record<string, unknown> | null,
    menuTags: row.menu_tags ?? null,
    pairingCategories: row.pairing_categories ?? null,
    linkedRestaurantId: row.linked_restaurant_id ?? null,
    linkedWineId: row.linked_wine_id ?? null,
    visits,
    visitCount: row.visit_count ?? visits.length,
    latestVisitDate: row.latest_visit_date ?? null,
    avgSatisfaction: row.avg_satisfaction ? Number(row.avg_satisfaction) : null,
    recordQualityXp: row.record_quality_xp ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRawVisit(v: Record<string, unknown>): RecordVisit {
  return {
    date: (v.date as string) ?? new Date().toISOString().split('T')[0],
    axisX: v.axisX != null ? Number(v.axisX) : null,
    axisY: v.axisY != null ? Number(v.axisY) : null,
    satisfaction: v.satisfaction != null ? Number(v.satisfaction) : null,
    comment: (v.comment as string) ?? null,
    tips: (v.tips as string) ?? null,
    scene: (v.scene as string) ?? null,
    mealTime: (v.mealTime as RecordVisit['mealTime']) ?? null,
    companions: (v.companions as string[]) ?? null,
    companionCount: v.companionCount != null ? Number(v.companionCount) : null,
    totalPrice: v.totalPrice != null ? Number(v.totalPrice) : null,
    purchasePrice: v.purchasePrice != null ? Number(v.purchasePrice) : null,
    aromaRegions: (v.aromaRegions as Record<string, unknown>) ?? null,
    aromaLabels: (v.aromaLabels as string[]) ?? null,
    aromaColor: (v.aromaColor as string) ?? null,
    complexity: v.complexity != null ? Number(v.complexity) : null,
    finish: v.finish != null ? Number(v.finish) : null,
    balance: v.balance != null ? Number(v.balance) : null,
    autoScore: v.autoScore != null ? Number(v.autoScore) : null,
    hasExifGps: (v.hasExifGps as boolean) ?? false,
    isExifVerified: (v.isExifVerified as boolean) ?? false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToPhoto(row: any): RecordPhoto {
  return {
    id: row.id,
    recordId: row.record_id,
    url: row.url,
    orderIndex: row.order_index,
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
  }
}

// ─── Domain → DB Insert 매핑 ───

function visitToJsonb(visit: RecordVisit): Record<string, unknown> {
  const obj: Record<string, unknown> = { date: visit.date }
  if (visit.axisX != null) obj.axisX = visit.axisX
  if (visit.axisY != null) obj.axisY = visit.axisY
  if (visit.satisfaction != null) obj.satisfaction = visit.satisfaction
  if (visit.comment != null) obj.comment = visit.comment
  if (visit.tips != null) obj.tips = visit.tips
  if (visit.scene != null) obj.scene = visit.scene
  if (visit.mealTime != null) obj.mealTime = visit.mealTime
  if (visit.companions != null) obj.companions = visit.companions
  if (visit.companionCount != null) obj.companionCount = visit.companionCount
  if (visit.totalPrice != null) obj.totalPrice = visit.totalPrice
  if (visit.purchasePrice != null) obj.purchasePrice = visit.purchasePrice
  if (visit.aromaRegions != null) obj.aromaRegions = visit.aromaRegions
  if (visit.aromaLabels != null) obj.aromaLabels = visit.aromaLabels
  if (visit.aromaColor != null) obj.aromaColor = visit.aromaColor
  if (visit.complexity != null) obj.complexity = visit.complexity
  if (visit.finish != null) obj.finish = visit.finish
  if (visit.balance != null) obj.balance = visit.balance
  if (visit.autoScore != null) obj.autoScore = visit.autoScore
  if (visit.hasExifGps) obj.hasExifGps = true
  if (visit.isExifVerified) obj.isExifVerified = true
  return obj
}

export class SupabaseRecordRepository implements RecordRepository {
  private get supabase() {
    return createClient()
  }

  async create(input: CreateRecordInput): Promise<DiningRecord> {
    const visits = [visitToJsonb(input.visit)]
    const avgSat = input.visit.satisfaction

    const { data, error } = await this.supabase
      .from('records')
      .insert({
        user_id: input.userId,
        target_id: input.targetId,
        target_type: input.targetType,
        status: input.status,
        wine_status: input.wineStatus ?? null,
        camera_mode: input.cameraMode ?? null,
        ocr_data: null,
        menu_tags: input.menuTags ?? null,
        pairing_categories: input.pairingCategories ?? null,
        linked_restaurant_id: input.linkedRestaurantId ?? null,
        linked_wine_id: input.linkedWineId ?? null,
        visits,
        visit_count: 1,
        latest_visit_date: input.visit.date,
        avg_satisfaction: avgSat,
        record_quality_xp: 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42501') throw new Error('권한이 없습니다')
      if (error.code === '23505') throw new Error('이미 존재하는 기록입니다')
      throw new Error(`Record 생성 실패: ${error.message}`)
    }
    return mapDbToRecord(data)
  }

  async addVisit(input: AddVisitInput): Promise<DiningRecord> {
    // 기존 record를 먼저 로드
    const existing = await this.findById(input.recordId)
    if (!existing) throw new Error('기록을 찾을 수 없습니다')

    const newVisits = [input.visit, ...existing.visits]
    newVisits.sort((a, b) => b.date.localeCompare(a.date))
    const avg = calcAvgSatisfaction(newVisits)

    const { data, error } = await this.supabase
      .from('records')
      .update({
        visits: newVisits.map(visitToJsonb),
        visit_count: newVisits.length,
        latest_visit_date: newVisits[0].date,
        avg_satisfaction: avg,
        status: 'rated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.recordId)
      .select()
      .single()

    if (error) throw new Error(`방문 추가 실패: ${error.message}`)
    return mapDbToRecord(data)
  }

  async findById(id: string): Promise<DiningRecord | null> {
    const { data, error } = await this.supabase
      .from('records')
      .select()
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Record 조회 실패: ${error.message}`)
    }
    return mapDbToRecord(data)
  }

  async findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]> {
    let query = this.supabase
      .from('records')
      .select()
      .eq('user_id', userId)
      .order('latest_visit_date', { ascending: false })

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query
    if (error) throw new Error(`Records 조회 실패: ${error.message}`)
    return data.map(mapDbToRecord)
  }

  async findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    let query = this.supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('latest_visit_date', { ascending: false })

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query
    if (error) throw new Error(`Records+Target 조회 실패: ${error.message}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data as any[]

    const restaurantIds = [...new Set(rows.filter((r) => r.target_type === 'restaurant').map((r) => r.target_id))]
    const wineIds = [...new Set(rows.filter((r) => r.target_type === 'wine').map((r) => r.target_id))]

    const restaurantMap = new Map<string, {
      name: string; genre: string | null; area: string | null; photo_url: string | null
      lat: number | null; lng: number | null
      price_range: number | null; michelin_stars: number | null; has_blue_ribbon: boolean | null; media_appearances: string[] | null
    }>()
    const wineMap = new Map<string, {
      name: string; variety: string | null; region: string | null; country: string | null
      wine_type: string | null; vintage: number | null; photo_url: string | null
    }>()

    if (restaurantIds.length > 0) {
      const { data: restaurants } = await this.supabase
        .from('restaurants')
        .select('id, name, genre, area, photos, lat, lng, price_range, michelin_stars, has_blue_ribbon, media_appearances')
        .in('id', restaurantIds)
      for (const r of restaurants ?? []) {
        restaurantMap.set(r.id, {
          name: r.name, genre: r.genre, area: r.area, photo_url: r.photos?.[0] ?? null,
          lat: r.lat ?? null, lng: r.lng ?? null,
          price_range: r.price_range, michelin_stars: r.michelin_stars, has_blue_ribbon: r.has_blue_ribbon, media_appearances: r.media_appearances,
        })
      }
    }

    if (wineIds.length > 0) {
      const { data: wines } = await this.supabase
        .from('wines')
        .select('id, name, variety, region, country, wine_type, vintage, photos')
        .in('id', wineIds)
      for (const w of wines ?? []) {
        wineMap.set(w.id, {
          name: w.name, variety: w.variety, region: w.region, country: w.country,
          wine_type: w.wine_type, vintage: w.vintage, photo_url: w.photos?.[0] ?? null,
        })
      }
    }

    // record_photos
    const recordIds = rows.map((r) => r.id)
    const recordPhotoMap = new Map<string, string>()
    if (recordIds.length > 0) {
      const { data: photos } = await this.supabase
        .from('record_photos')
        .select('record_id, url')
        .in('record_id', recordIds)
        .order('order_index', { ascending: true })
      for (const p of photos ?? []) {
        if (!recordPhotoMap.has(p.record_id)) {
          recordPhotoMap.set(p.record_id, p.url)
        }
      }
    }

    // source 태깅
    const followingTargetIds = new Set<string>()
    const { data: followRows } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')

    if (followRows && followRows.length > 0) {
      const followingUserIds = followRows.map((f) => f.following_id)
      const allTargetIds = [...new Set(rows.map((r) => r.target_id))]
      if (allTargetIds.length > 0) {
        const { data: followingRecords } = await this.supabase
          .from('records')
          .select('target_id')
          .in('user_id', followingUserIds)
          .in('target_id', allTargetIds)
          .eq('target_type', targetType ?? 'restaurant')
        for (const fr of followingRecords ?? []) {
          followingTargetIds.add(fr.target_id)
        }
      }
    }

    return rows.map((row) => {
      const base = mapDbToRecord(row)
      const isRestaurant = row.target_type === 'restaurant'
      const restaurant = isRestaurant ? restaurantMap.get(row.target_id) : null
      const wine = !isRestaurant ? wineMap.get(row.target_id) : null
      return {
        ...base,
        targetName: (isRestaurant ? restaurant?.name : wine?.name) ?? '',
        targetMeta: isRestaurant ? (restaurant?.genre ?? null) : (wine?.variety ?? null),
        targetArea: isRestaurant ? (restaurant?.area ?? null) : (wine?.region ?? null),
        targetPhotoUrl: recordPhotoMap.get(row.id) ?? (isRestaurant ? restaurant?.photo_url : wine?.photo_url) ?? null,
        targetLat: isRestaurant ? (restaurant?.lat ?? null) : null,
        targetLng: isRestaurant ? (restaurant?.lng ?? null) : null,
        source: followingTargetIds.has(row.target_id) ? 'following' as const : 'mine' as const,
        genre: restaurant?.genre ?? null,
        area: restaurant?.area ?? null,
        priceRange: restaurant?.price_range ?? null,
        michelinStars: restaurant?.michelin_stars ?? null,
        hasBlueRibbon: restaurant?.has_blue_ribbon ?? null,
        mediaAppearances: restaurant?.media_appearances ?? null,
        wineType: wine?.wine_type ?? null,
        variety: wine?.variety ?? null,
        country: wine?.country ?? null,
        region: wine?.region ?? null,
        vintage: wine?.vintage ?? null,
      }
    })
  }

  async findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .order('latest_visit_date', { ascending: false })

    if (error) throw new Error(`Records 조회 실패: ${error.message}`)
    return data.map(mapDbToRecord)
  }

  async update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord> {
    const updateData: Record<string, unknown> = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.wineStatus !== undefined) updateData.wine_status = data.wineStatus
    if (data.menuTags !== undefined) updateData.menu_tags = data.menuTags
    if (data.pairingCategories !== undefined) updateData.pairing_categories = data.pairingCategories
    if (data.linkedWineId !== undefined) updateData.linked_wine_id = data.linkedWineId
    if (data.linkedRestaurantId !== undefined) updateData.linked_restaurant_id = data.linkedRestaurantId
    if (data.visits !== undefined) {
      updateData.visits = data.visits.map(visitToJsonb)
      updateData.visit_count = data.visits.length
      updateData.latest_visit_date = data.visits[0]?.date ?? null
      updateData.avg_satisfaction = calcAvgSatisfaction(data.visits)
    }
    updateData.updated_at = new Date().toISOString()

    const { data: updated, error } = await this.supabase
      .from('records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Record 업데이트 실패: ${error.message}`)
    return mapDbToRecord(updated)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('records')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Record 삭제 실패: ${error.message}`)
  }

  async findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]> {
    const { data, error } = await this.supabase
      .from('record_photos')
      .select()
      .eq('record_id', recordId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`사진 조회 실패: ${error.message}`)
    return data.map(mapDbToPhoto)
  }

  async deletePhoto(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('record_photos')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`사진 삭제 실패: ${error.message}`)
  }

  async markWishlistVisited(
    userId: string,
    targetId: string,
    targetType: RecordTargetType,
  ): Promise<void> {
    await this.supabase
      .from('wishlists')
      .update({ is_visited: true })
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
  }
}
