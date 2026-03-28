import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { DiningRecord, CreateRecordInput, RecordTargetType, RecordWithTarget } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import type { Database } from '@/infrastructure/supabase/types'
import { createClient } from '@/infrastructure/supabase/client'

type RecordRow = Database['public']['Tables']['records']['Row']
type PhotoRow = Database['public']['Tables']['record_photos']['Row']

function mapDbToRecord(row: RecordRow): DiningRecord {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type,
    status: row.status,
    wineStatus: row.wine_status,
    cameraMode: row.camera_mode,
    ocrData: row.ocr_data as Record<string, unknown> | null,
    axisX: row.axis_x ? Number(row.axis_x) : null,
    axisY: row.axis_y ? Number(row.axis_y) : null,
    satisfaction: row.satisfaction,
    scene: row.scene,
    aromaRegions: row.aroma_regions as Record<string, unknown> | null,
    aromaLabels: row.aroma_labels,
    aromaColor: row.aroma_color,
    complexity: row.complexity,
    finish: row.finish ? Number(row.finish) : null,
    balance: row.balance ? Number(row.balance) : null,
    autoScore: row.auto_score,
    comment: row.comment,
    menuTags: row.menu_tags,
    pairingCategories: row.pairing_categories as DiningRecord['pairingCategories'],
    tips: row.tips,
    companions: row.companions,
    companionCount: row.companion_count,
    totalPrice: row.total_price,
    purchasePrice: row.purchase_price,
    visitDate: row.visit_date,
    mealTime: row.meal_time as DiningRecord['mealTime'],
    linkedRestaurantId: row.linked_restaurant_id,
    linkedWineId: row.linked_wine_id,
    hasExifGps: row.has_exif_gps,
    isExifVerified: row.is_exif_verified,
    recordQualityXp: row.record_quality_xp,
    scoreUpdatedAt: row.score_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type RecordInsert = Database['public']['Tables']['records']['Insert']

function mapRecordToDb(input: CreateRecordInput): RecordInsert {
  return {
    user_id: input.userId,
    target_id: input.targetId,
    target_type: input.targetType,
    status: input.status,
    wine_status: (input.wineStatus ?? null) as RecordInsert['wine_status'],
    camera_mode: (input.cameraMode ?? null) as RecordInsert['camera_mode'],
    axis_x: input.axisX ?? null,
    axis_y: input.axisY ?? null,
    satisfaction: input.satisfaction ?? null,
    scene: (input.scene ?? null) as RecordInsert['scene'],
    aroma_regions: (input.aromaRegions ?? null) as RecordInsert['aroma_regions'],
    aroma_labels: input.aromaLabels ?? null,
    aroma_color: input.aromaColor ?? null,
    complexity: input.complexity ?? null,
    finish: input.finish ?? null,
    balance: input.balance ?? null,
    auto_score: input.autoScore ?? null,
    comment: input.comment ?? null,
    menu_tags: input.menuTags ?? null,
    pairing_categories: input.pairingCategories ?? null,
    tips: input.tips ?? null,
    companions: input.companions ?? null,
    companion_count: input.companionCount ?? null,
    total_price: input.totalPrice ?? null,
    purchase_price: input.purchasePrice ?? null,
    visit_date: input.visitDate ?? new Date().toISOString().split('T')[0],
    meal_time: (input.mealTime ?? null) as RecordInsert['meal_time'],
    linked_restaurant_id: input.linkedRestaurantId ?? null,
    linked_wine_id: input.linkedWineId ?? null,
    has_exif_gps: input.hasExifGps ?? false,
    is_exif_verified: input.isExifVerified ?? false,
    ocr_data: null,
    record_quality_xp: 0,
    score_updated_at: null,
  }
}

function mapDbToPhoto(row: PhotoRow): RecordPhoto {
  return {
    id: row.id,
    recordId: row.record_id,
    url: row.url,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  }
}

export class SupabaseRecordRepository implements RecordRepository {
  private get supabase() {
    return createClient()
  }

  async create(input: CreateRecordInput): Promise<DiningRecord> {
    const dbData = mapRecordToDb(input)
    const { data, error } = await this.supabase
      .from('records')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      if (error.code === '42501') throw new Error('권한이 없습니다')
      if (error.code === '23505') throw new Error('이미 존재하는 기록입니다')
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
      .select('*')
      .eq('user_id', userId)
      .order('visit_date', { ascending: false })

    if (targetType) {
      query = query.eq('target_type', targetType)
    }

    const { data, error } = await query
    if (error) throw new Error(`Records+Target 조회 실패: ${error.message}`)

    const rows = data as RecordRow[]

    // target_id로 식당/와인 정보를 별도 조회
    const restaurantIds = [...new Set(rows.filter((r) => r.target_type === 'restaurant').map((r) => r.target_id))]
    const wineIds = [...new Set(rows.filter((r) => r.target_type === 'wine').map((r) => r.target_id))]

    const restaurantMap = new Map<string, { name: string; genre: string | null; area: string | null; photo_url: string | null }>()
    const wineMap = new Map<string, { name: string; variety: string | null; region: string | null; photo_url: string | null }>()

    if (restaurantIds.length > 0) {
      const { data: restaurants } = await this.supabase
        .from('restaurants')
        .select('id, name, genre, area, photos')
        .in('id', restaurantIds)
      for (const r of restaurants ?? []) {
        restaurantMap.set(r.id, { name: r.name, genre: r.genre, area: r.area, photo_url: r.photos?.[0] ?? null })
      }
    }

    if (wineIds.length > 0) {
      const { data: wines } = await this.supabase
        .from('wines')
        .select('id, name, variety, region, photos')
        .in('id', wineIds)
      for (const w of wines ?? []) {
        wineMap.set(w.id, { name: w.name, variety: w.variety, region: w.region, photo_url: w.photos?.[0] ?? null })
      }
    }

    // 팔로잉 유저들의 target_id 셋 조회 → source 태깅용
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
        targetPhotoUrl: (isRestaurant ? restaurant?.photo_url : wine?.photo_url) ?? null,
        source: followingTargetIds.has(row.target_id) ? 'following' as const : 'mine' as const,
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
    if (data.satisfaction !== undefined) updateData.satisfaction = data.satisfaction
    if (data.axisX !== undefined) updateData.axis_x = data.axisX
    if (data.axisY !== undefined) updateData.axis_y = data.axisY
    if (data.scene !== undefined) updateData.scene = data.scene
    if (data.comment !== undefined) updateData.comment = data.comment
    if (data.status !== undefined) updateData.status = data.status
    if (data.companions !== undefined) updateData.companions = data.companions
    if (data.companionCount !== undefined) updateData.companion_count = data.companionCount
    if (data.totalPrice !== undefined) updateData.total_price = data.totalPrice
    if (data.purchasePrice !== undefined) updateData.purchase_price = data.purchasePrice
    if (data.aromaRegions !== undefined) updateData.aroma_regions = data.aromaRegions
    if (data.aromaLabels !== undefined) updateData.aroma_labels = data.aromaLabels
    if (data.aromaColor !== undefined) updateData.aroma_color = data.aromaColor
    if (data.complexity !== undefined) updateData.complexity = data.complexity
    if (data.finish !== undefined) updateData.finish = data.finish
    if (data.balance !== undefined) updateData.balance = data.balance
    if (data.autoScore !== undefined) updateData.auto_score = data.autoScore
    if (data.pairingCategories !== undefined) updateData.pairing_categories = data.pairingCategories
    if (data.menuTags !== undefined) updateData.menu_tags = data.menuTags
    if (data.tips !== undefined) updateData.tips = data.tips
    if (data.linkedWineId !== undefined) updateData.linked_wine_id = data.linkedWineId
    if (data.linkedRestaurantId !== undefined) updateData.linked_restaurant_id = data.linkedRestaurantId
    if (data.mealTime !== undefined) updateData.meal_time = data.mealTime
    if (data.visitDate !== undefined) updateData.visit_date = data.visitDate
    if (data.wineStatus !== undefined) updateData.wine_status = data.wineStatus
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
