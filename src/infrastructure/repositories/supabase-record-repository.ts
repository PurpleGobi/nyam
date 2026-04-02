import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { DiningRecord, ListItem, ListStatus, CreateRecordInput, RecordTargetType, RecordWithTarget } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { createClient } from '@/infrastructure/supabase/client'

// ─── DB → Domain 매핑 ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToRecord(row: any): DiningRecord {
  return {
    id: row.id,
    listId: row.list_id,
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
function mapDbToListItem(row: any): ListItem {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type,
    status: row.status,
    source: row.source ?? 'direct',
    sourceRecordId: row.source_record_id ?? null,
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
    createdAt: row.created_at,
  }
}

export class SupabaseRecordRepository implements RecordRepository {
  private get supabase() {
    return createClient()
  }

  // ─── List ───

  async findOrCreateList(
    userId: string,
    targetId: string,
    targetType: RecordTargetType,
    status: ListStatus,
  ): Promise<ListItem> {
    // 먼저 기존 항목 조회
    const existing = await this.findListByUserAndTarget(userId, targetId, targetType)
    if (existing) return existing

    const { data, error } = await this.supabase
      .from('lists')
      .insert({
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
        status,
        source: 'direct',
      })
      .select()
      .single()

    if (error) {
      // UNIQUE 충돌 시 재조회
      if (error.code === '23505') {
        const retry = await this.findListByUserAndTarget(userId, targetId, targetType)
        if (retry) return retry
      }
      throw new Error(`List 생성 실패: ${error.message}`)
    }
    return mapDbToListItem(data)
  }

  async updateListStatus(listId: string, status: ListStatus): Promise<void> {
    const { error } = await this.supabase
      .from('lists')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', listId)

    if (error) throw new Error(`List 상태 변경 실패: ${error.message}`)
  }

  async findListsByUser(
    userId: string,
    targetType: RecordTargetType,
    status?: ListStatus,
  ): Promise<ListItem[]> {
    let query = this.supabase
      .from('lists')
      .select()
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw new Error(`Lists 조회 실패: ${error.message}`)
    return data.map(mapDbToListItem)
  }

  async findListByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: RecordTargetType,
  ): Promise<ListItem | null> {
    const { data, error } = await this.supabase
      .from('lists')
      .select()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle()

    if (error) throw new Error(`List 조회 실패: ${error.message}`)
    return data ? mapDbToListItem(data) : null
  }

  async deleteList(listId: string): Promise<void> {
    const { error } = await this.supabase
      .from('lists')
      .delete()
      .eq('id', listId)

    if (error) throw new Error(`List 삭제 실패: ${error.message}`)
  }

  // ─── Record ───

  async create(input: CreateRecordInput): Promise<DiningRecord> {
    // 1) lists upsert
    const list = await this.findOrCreateList(
      input.userId,
      input.targetId,
      input.targetType,
      input.listStatus,
    )

    // 방문 기록 생성 시 list status를 visited/tasted로 승격
    if (list.status === 'wishlist' && (input.listStatus === 'visited' || input.listStatus === 'tasted')) {
      await this.updateListStatus(list.id, input.listStatus)
    }

    // 2) records INSERT
    const { data, error } = await this.supabase
      .from('records')
      .insert({
        list_id: list.id,
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

  async findByUserIdWithTarget(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    let query = this.supabase
      .from('records')
      .select('*, lists!inner(status)')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false })

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
      name: string; genre: string | null; country: string | null; city: string | null; district: string | null; area: string[] | null; photo_url: string | null
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
        .select('id, name, genre, country, city, district, area, photos, lat, lng, price_range, michelin_stars, has_blue_ribbon, media_appearances')
        .in('id', restaurantIds)
      for (const r of restaurants ?? []) {
        restaurantMap.set(r.id, {
          name: r.name, genre: r.genre, country: r.country ?? null, city: r.city ?? null, district: r.district ?? null, area: r.area, photo_url: r.photos?.[0] ?? null,
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
      const listStatus = row.lists?.status ?? null
      return {
        ...base,
        targetName: (isRestaurant ? restaurant?.name : wine?.name) ?? '',
        targetMeta: isRestaurant ? (restaurant?.genre ?? null) : (wine?.variety ?? null),
        targetArea: isRestaurant ? (restaurant?.district ?? restaurant?.area?.[0] ?? null) : (wine?.region ?? null),
        targetPhotoUrl: recordPhotoMap.get(row.id) ?? (isRestaurant ? restaurant?.photo_url : wine?.photo_url) ?? null,
        targetLat: isRestaurant ? (restaurant?.lat ?? null) : null,
        targetLng: isRestaurant ? (restaurant?.lng ?? null) : null,
        source: followingTargetIds.has(row.target_id) ? 'following' as const : 'mine' as const,
        genre: restaurant?.genre ?? null,
        country: isRestaurant ? (restaurant?.country ?? null) : (wine?.country ?? null),
        city: restaurant?.city ?? null,
        district: restaurant?.district ?? null,
        area: restaurant?.area ?? null,
        priceRange: restaurant?.price_range ?? null,
        michelinStars: restaurant?.michelin_stars ?? null,
        hasBlueRibbon: restaurant?.has_blue_ribbon ?? null,
        mediaAppearances: restaurant?.media_appearances ?? null,
        wineType: wine?.wine_type ?? null,
        variety: wine?.variety ?? null,
        region: wine?.region ?? null,
        vintage: wine?.vintage ?? null,
        listStatus: listStatus as ListStatus | undefined,
      }
    })
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
