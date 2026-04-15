import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { DiningRecord, CreateRecordInput, RecordTargetType, RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { createClient } from '@/infrastructure/supabase/client'
import type { Database } from '@/infrastructure/supabase/types'

type RecordRow = Database['public']['Tables']['records']['Row']

// --- DB -> Domain 매핑 ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToRecord(row: any): DiningRecord {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type,
    axisX: row.axis_x ?? null,
    axisY: row.axis_y ?? null,
    satisfaction: row.satisfaction ?? null,
    scene: row.scene ?? null,
    comment: row.comment ?? null,
    totalPrice: row.total_price ?? null,
    purchasePrice: row.purchase_price ?? null,
    visitDate: row.visit_date ?? null,
    mealTime: row.meal_time ?? null,
    menuTags: row.menu_tags ?? null,
    pairingCategories: row.pairing_categories ?? null,
    hasExifGps: row.has_exif_gps ?? false,
    isExifVerified: row.is_exif_verified ?? false,
    cameraMode: row.camera_mode ?? null,
    ocrData: row.ocr_data as Record<string, unknown> | null,
    aromaPrimary: (row.aroma_primary as string[]) ?? [],
    aromaSecondary: (row.aroma_secondary as string[]) ?? [],
    aromaTertiary: (row.aroma_tertiary as string[]) ?? [],
    complexity: row.complexity ?? null,
    finish: row.finish ?? null,
    balance: row.balance ?? null,
    intensity: row.intensity ?? null,
    autoScore: row.auto_score ?? null,
    privateNote: row.private_note ?? null,
    companionCount: row.companion_count ?? null,
    companions: row.companions ?? null,
    linkedRestaurantId: row.linked_restaurant_id ?? null,
    linkedWineId: row.linked_wine_id ?? null,
    recordQualityXp: row.record_quality_xp ?? 0,
    scoreUpdatedAt: row.score_updated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    exifLat: row.exif_lat ?? null,
    exifLng: row.exif_lng ?? null,
    capturedAt: row.captured_at ?? null,
    createdAt: row.created_at,
  }
}

export class SupabaseRecordRepository implements RecordRepository {
  private get supabase() {
    return createClient()
  }

  // --- Record ---

  async create(input: CreateRecordInput): Promise<DiningRecord> {
    const { data, error } = await this.supabase
      .from('records')
      .insert({
        user_id: input.userId,
        target_id: input.targetId,
        target_type: input.targetType,
        axis_x: input.axisX ?? null,
        axis_y: input.axisY ?? null,
        satisfaction: input.satisfaction ?? null,
        scene: input.scene ?? null,
        comment: input.comment ?? null,
        total_price: input.totalPrice ?? null,
        purchase_price: input.purchasePrice ?? null,
        visit_date: input.visitDate ?? null,
        meal_time: input.mealTime ?? null,
        menu_tags: input.menuTags ?? null,
        pairing_categories: input.pairingCategories ?? null,
        has_exif_gps: input.hasExifGps ?? false,
        is_exif_verified: input.isExifVerified ?? false,
        camera_mode: input.cameraMode ?? null,
        aroma_primary: input.aromaPrimary ?? [],
        aroma_secondary: input.aromaSecondary ?? [],
        aroma_tertiary: input.aromaTertiary ?? [],
        complexity: input.complexity ?? null,
        finish: input.finish ?? null,
        balance: input.balance ?? null,
        intensity: input.intensity ?? null,
        auto_score: input.autoScore ?? null,
        private_note: input.privateNote ?? null,
        companion_count: input.companionCount ?? null,
        companions: input.companions ?? null,
        linked_restaurant_id: input.linkedRestaurantId ?? null,
        linked_wine_id: input.linkedWineId ?? null,
        record_quality_xp: 0,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42501') throw new Error('권한이 없습니다')
      throw new Error(`Record 생성 실패: ${error.message}`)
    }
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
      .order('visit_date', { ascending: false })

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query
    if (error) throw new Error(`Records 조회 실패: ${error.message}`)
    return data.map(mapDbToRecord)
  }

  /**
   * raw records 행 배열을 RecordWithTarget[]로 변환
   * restaurants/wines 메타데이터 batch 조회 + record_photos 첫 사진 + source tagging
   */
  private async enrichRecordsWithTarget(
    rows: RecordRow[],
    currentUserId: string,
    source: RecordSource,
  ): Promise<RecordWithTarget[]> {
    if (rows.length === 0) return []

    const restaurantIds = [...new Set(rows.filter((r) => r.target_type === 'restaurant').map((r) => r.target_id))]
    const wineIds = [...new Set(rows.filter((r) => r.target_type === 'wine').map((r) => r.target_id))]

    const restaurantMap = new Map<string, {
      name: string; genre: string | null; country: string | null; city: string | null; district: string | null; area: string[] | null; photo_url: string | null
      lat: number | null; lng: number | null
      price_range: number | null; prestige: RestaurantPrestige[]
    }>()
    const wineMap = new Map<string, {
      name: string; variety: string | null; region: string | null; country: string | null
      wine_type: string | null; vintage: number | null; photo_url: string | null
    }>()

    if (restaurantIds.length > 0) {
      const { data: restaurants } = await this.supabase
        .from('restaurants')
        .select('id, name, genre, country, city, district, area, photos, lat, lng, price_range, prestige')
        .in('id', restaurantIds)
      for (const r of restaurants ?? []) {
        restaurantMap.set(r.id, {
          name: r.name, genre: r.genre, country: r.country ?? null, city: r.city ?? null, district: r.district ?? null, area: r.area, photo_url: r.photos?.[0] ?? null,
          lat: r.lat ?? null, lng: r.lng ?? null,
          price_range: r.price_range, prestige: ((r as Record<string, unknown>).prestige ?? []) as RestaurantPrestige[],
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

    // users 정보 (author)
    const userIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id))]
    const userMap = new Map<string, { nickname: string | null; avatar_url: string | null }>()
    if (userIds.length > 0) {
      const { data: users } = await this.supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      for (const u of users ?? []) {
        userMap.set(u.id, { nickname: u.nickname, avatar_url: u.avatar_url })
      }
    }

    // record_photos — 기록별 모든 사진 URL 수집
    const realRecordIds = rows.map((r: { id: string }) => r.id)
    const recordPhotosMap = new Map<string, string[]>()
    if (realRecordIds.length > 0) {
      const { data: photos } = await this.supabase
        .from('record_photos')
        .select('record_id, url')
        .in('record_id', realRecordIds)
        .order('order_index', { ascending: true })
      for (const p of photos ?? []) {
        const existing = recordPhotosMap.get(p.record_id)
        if (existing) existing.push(p.url)
        else recordPhotosMap.set(p.record_id, [p.url])
      }
    }

    return rows.map((row) => {
      const base = mapDbToRecord(row)
      const isRestaurant = row.target_type === 'restaurant'
      const restaurant = isRestaurant ? restaurantMap.get(row.target_id) : null
      const wine = !isRestaurant ? wineMap.get(row.target_id) : null

      // 타인의 기록: companions/privateNote는 항상 비공개
      const isOwner = row.user_id === currentUserId
      const companions = isOwner ? base.companions : null
      const privateNote = isOwner ? base.privateNote : null

      return {
        ...base,
        companions,
        privateNote,
        targetName: (isRestaurant ? restaurant?.name : wine?.name) ?? '',
        targetMeta: isRestaurant ? (restaurant?.genre ?? null) : (wine?.variety ?? null),
        targetArea: isRestaurant ? (restaurant?.district ?? restaurant?.area?.[0] ?? null) : (wine?.region ?? null),
        targetPhotoUrl: recordPhotosMap.get(row.id)?.[0] ?? (isRestaurant ? restaurant?.photo_url : wine?.photo_url) ?? null,
        targetPhotos: recordPhotosMap.get(row.id) ?? [],
        targetLat: isRestaurant ? (restaurant?.lat ?? null) : null,
        targetLng: isRestaurant ? (restaurant?.lng ?? null) : null,
        source,
        genre: restaurant?.genre ?? null,
        country: isRestaurant ? (restaurant?.country ?? null) : (wine?.country ?? null),
        city: restaurant?.city ?? null,
        district: restaurant?.district ?? null,
        area: restaurant?.area ?? null,
        priceRange: restaurant?.price_range ?? null,
        prestige: restaurant?.prestige ?? null,
        wineType: wine?.wine_type ?? null,
        variety: wine?.variety ?? null,
        region: wine?.region ?? null,
        vintage: wine?.vintage ?? null,
        authorId: row.user_id,
        authorNickname: userMap.get(row.user_id)?.nickname ?? null,
        authorAvatarUrl: userMap.get(row.user_id)?.avatar_url ?? null,
      }
    })
  }

  async findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    let query = this.supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false })

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query
    if (error) throw new Error(`Records+Target 조회 실패: ${error.message}`)

    const rows = data

    // source 태깅을 위해 팔로잉 대상 target_id 수집
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

    const enriched = await this.enrichRecordsWithTarget(rows, userId, 'mine')
    // 팔로잉 대상 target에 대한 source 오버라이드
    return enriched.map((r) => ({
      ...r,
      source: followingTargetIds.has(r.targetId) ? 'following' as const : 'mine' as const,
    }))
  }

  async getAvgSatisfactionByType(userId: string, targetType: 'restaurant' | 'wine'): Promise<number | null> {
    const { data } = await this.supabase
      .from('records')
      .select('satisfaction')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .not('satisfaction', 'is', null)
    if (!data || data.length === 0) return null
    const vals = data.map((r) => r.satisfaction as number)
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  async findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]> {
    const { data, error } = await this.supabase
      .from('records')
      .select()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .order('visit_date', { ascending: false })

    if (error) throw new Error(`Records 조회 실패: ${error.message}`)
    return data.map(mapDbToRecord)
  }

  async update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord> {
    const updateData: Record<string, unknown> = {}
    if (data.axisX !== undefined) updateData.axis_x = data.axisX
    if (data.axisY !== undefined) updateData.axis_y = data.axisY
    if (data.satisfaction !== undefined) updateData.satisfaction = data.satisfaction
    if (data.scene !== undefined) updateData.scene = data.scene
    if (data.comment !== undefined) updateData.comment = data.comment
    if (data.totalPrice !== undefined) updateData.total_price = data.totalPrice
    if (data.purchasePrice !== undefined) updateData.purchase_price = data.purchasePrice
    if (data.visitDate !== undefined) updateData.visit_date = data.visitDate
    if (data.mealTime !== undefined) updateData.meal_time = data.mealTime
    if (data.menuTags !== undefined) updateData.menu_tags = data.menuTags
    if (data.pairingCategories !== undefined) updateData.pairing_categories = data.pairingCategories
    if (data.linkedWineId !== undefined) updateData.linked_wine_id = data.linkedWineId
    if (data.linkedRestaurantId !== undefined) updateData.linked_restaurant_id = data.linkedRestaurantId
    if (data.companionCount !== undefined) updateData.companion_count = data.companionCount
    if (data.companions !== undefined) updateData.companions = data.companions
    if (data.privateNote !== undefined) updateData.private_note = data.privateNote
    if (data.cameraMode !== undefined) updateData.camera_mode = data.cameraMode
    if (data.aromaPrimary !== undefined) updateData.aroma_primary = data.aromaPrimary
    if (data.aromaSecondary !== undefined) updateData.aroma_secondary = data.aromaSecondary
    if (data.aromaTertiary !== undefined) updateData.aroma_tertiary = data.aromaTertiary
    if (data.complexity !== undefined) updateData.complexity = data.complexity
    if (data.finish !== undefined) updateData.finish = data.finish
    if (data.balance !== undefined) updateData.balance = data.balance
    if (data.intensity !== undefined) updateData.intensity = data.intensity
    if (data.autoScore !== undefined) updateData.auto_score = data.autoScore
    if (data.hasExifGps !== undefined) updateData.has_exif_gps = data.hasExifGps
    if (data.isExifVerified !== undefined) updateData.is_exif_verified = data.isExifVerified
    if (data.recordQualityXp !== undefined) updateData.record_quality_xp = data.recordQualityXp
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
}
