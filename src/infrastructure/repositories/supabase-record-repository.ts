import type { RecordRepository } from '@/domain/repositories/record-repository'
import type { DiningRecord, ListItem, ListStatus, CreateRecordInput, RecordTargetType, RecordWithTarget, RecordSource } from '@/domain/entities/record'
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

  /**
   * raw records 행 배열을 RecordWithTarget[]로 변환
   * restaurants/wines 메타데이터 batch 조회 + record_photos 첫 사진 + source tagging
   */
  private async enrichRecordsWithTarget(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[],
    currentUserId: string,
    source: RecordSource,
    listStatusMap?: Map<string, ListStatus>,
  ): Promise<RecordWithTarget[]> {
    if (rows.length === 0) return []

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

    return rows.map((row) => {
      const base = mapDbToRecord(row)
      const isRestaurant = row.target_type === 'restaurant'
      const restaurant = isRestaurant ? restaurantMap.get(row.target_id) : null
      const wine = !isRestaurant ? wineMap.get(row.target_id) : null
      // lists JOIN이 있는 경우(본인 records) row.lists.status 사용, 없으면 listStatusMap 또는 'visited'
      const listStatus = row.lists?.status ?? listStatusMap?.get(row.id) ?? 'visited'
      return {
        ...base,
        targetName: (isRestaurant ? restaurant?.name : wine?.name) ?? '',
        targetMeta: isRestaurant ? (restaurant?.genre ?? null) : (wine?.variety ?? null),
        targetArea: isRestaurant ? (restaurant?.district ?? restaurant?.area?.[0] ?? null) : (wine?.region ?? null),
        targetPhotoUrl: recordPhotoMap.get(row.id) ?? (isRestaurant ? restaurant?.photo_url : wine?.photo_url) ?? null,
        targetLat: isRestaurant ? (restaurant?.lat ?? null) : null,
        targetLng: isRestaurant ? (restaurant?.lng ?? null) : null,
        source,
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
        authorId: row.user_id,
        authorNickname: userMap.get(row.user_id)?.nickname ?? null,
        authorAvatarUrl: userMap.get(row.user_id)?.avatar_url ?? null,
      }
    })
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

  // ─── 보기 필터별 조회 (타인 기록) ───

  async findWishlistTargetRecords(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    // 1) 내 wishlists에서 target_id 목록 조회
    let listQuery = this.supabase
      .from('lists')
      .select('target_id')
      .eq('user_id', userId)
      .eq('status', 'wishlist')
    if (targetType) listQuery = listQuery.eq('target_type', targetType)
    const { data: myWishlists } = await listQuery
    if (!myWishlists || myWishlists.length === 0) return []

    const targetIds = myWishlists.map((w) => w.target_id)

    // 2) 해당 target에 대한 타인의 records 조회 (lists JOIN 없이 — 타인 데이터)
    let query = this.supabase
      .from('records')
      .select('*')
      .in('target_id', targetIds)
      .neq('user_id', userId)
      .order('visit_date', { ascending: false })
    if (targetType) query = query.eq('target_type', targetType)
    const { data, error } = await query
    if (error) throw new Error(`Wishlist records 조회 실패: ${error.message}`)

    return this.enrichRecordsWithTarget(data ?? [], userId, 'wishlist')
  }

  async findBubbleSharedRecords(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    // 1) 내가 속한 버블 ID 조회
    const { data: memberships } = await this.supabase
      .from('bubble_members')
      .select('bubble_id')
      .eq('user_id', userId)
      .eq('status', 'active')
    if (!memberships || memberships.length === 0) return []

    const bubbleIds = memberships.map((m) => m.bubble_id)

    // 2) 해당 버블의 shares에서 record_id 조회 (내가 공유한 것 제외)
    let shareQuery = this.supabase
      .from('bubble_shares')
      .select('record_id')
      .in('bubble_id', bubbleIds)
      .neq('shared_by', userId)
    if (targetType) shareQuery = shareQuery.eq('target_type', targetType)
    const { data: shares } = await shareQuery
    if (!shares || shares.length === 0) return []

    const recordIds = [...new Set(shares.map((s) => s.record_id))]

    // 3) records 조회 (lists JOIN 없이 — 타인 데이터)
    let query = this.supabase
      .from('records')
      .select('*')
      .in('id', recordIds)
      .order('visit_date', { ascending: false })
    if (targetType) query = query.eq('target_type', targetType)
    const { data, error } = await query
    if (error) throw new Error(`Bubble records 조회 실패: ${error.message}`)

    return this.enrichRecordsWithTarget(data ?? [], userId, 'bubble')
  }

  async findFollowingRecords(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    // 1) 내가 팔로우하는 유저 ID 조회
    const { data: followRows } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
    if (!followRows || followRows.length === 0) return []

    const followingIds = followRows.map((f) => f.following_id)

    // 2) 팔로잉 유저의 records 조회 (lists JOIN 없이 — 타인 데이터)
    let query = this.supabase
      .from('records')
      .select('*')
      .in('user_id', followingIds)
      .order('visit_date', { ascending: false })
    if (targetType) query = query.eq('target_type', targetType)
    const { data, error } = await query
    if (error) throw new Error(`Following records 조회 실패: ${error.message}`)

    return this.enrichRecordsWithTarget(data ?? [], userId, 'following')
  }

  async findPublicRecords(userId: string, targetType?: RecordTargetType): Promise<RecordWithTarget[]> {
    // 1) 공개 프로필 유저 ID 조회
    const { data: publicUsers } = await this.supabase
      .from('users')
      .select('id')
      .eq('is_public', true)
      .neq('id', userId)
    if (!publicUsers || publicUsers.length === 0) return []

    const publicUserIds = publicUsers.map((u) => u.id)

    // 2) 공개 유저의 records 조회 (최근 50개 제한으로 성능 보호, lists JOIN 없이)
    let query = this.supabase
      .from('records')
      .select('*')
      .in('user_id', publicUserIds)
      .order('visit_date', { ascending: false })
      .limit(50)
    if (targetType) query = query.eq('target_type', targetType)
    const { data, error } = await query
    if (error) throw new Error(`Public records 조회 실패: ${error.message}`)

    return this.enrichRecordsWithTarget(data ?? [], userId, 'public')
  }

  async findHomeRecords(
    userId: string,
    targetType: RecordTargetType,
    views: RecordSource[],
  ): Promise<RecordWithTarget[]> {
    // 1) 각 view별 raw rows를 병렬로 수집 (enrich 없이)
    const promises = views.map(async (view) => {
      switch (view) {
        case 'mine': {
          const query = this.supabase
            .from('records')
            .select('*, lists!inner(status)')
            .eq('user_id', userId)
            .eq('target_type', targetType)
            .order('visit_date', { ascending: false })
          const { data, error } = await query
          if (error) throw new Error(`Records+Target 조회 실패: ${error.message}`)
          return { rows: data ?? [], source: 'mine' as RecordSource }
        }
        case 'wishlist': {
          const listQuery = this.supabase
            .from('lists')
            .select('target_id')
            .eq('user_id', userId)
            .eq('status', 'wishlist')
            .eq('target_type', targetType)
          const { data: myWishlists } = await listQuery
          if (!myWishlists || myWishlists.length === 0) return { rows: [], source: 'wishlist' as RecordSource }
          const targetIds = myWishlists.map((w) => w.target_id)
          const query = this.supabase
            .from('records')
            .select('*')
            .in('target_id', targetIds)
            .neq('user_id', userId)
            .eq('target_type', targetType)
            .order('visit_date', { ascending: false })
          const { data, error } = await query
          if (error) throw new Error(`Wishlist records 조회 실패: ${error.message}`)
          return { rows: data ?? [], source: 'wishlist' as RecordSource }
        }
        case 'bubble': {
          const { data: memberships } = await this.supabase
            .from('bubble_members')
            .select('bubble_id')
            .eq('user_id', userId)
            .eq('status', 'active')
          if (!memberships || memberships.length === 0) return { rows: [], source: 'bubble' as RecordSource }
          const bubbleIds = memberships.map((m) => m.bubble_id)
          const shareQuery = this.supabase
            .from('bubble_shares')
            .select('record_id')
            .in('bubble_id', bubbleIds)
            .neq('shared_by', userId)
            .eq('target_type', targetType)
          const { data: shares } = await shareQuery
          if (!shares || shares.length === 0) return { rows: [], source: 'bubble' as RecordSource }
          const recordIds = [...new Set(shares.map((s) => s.record_id))]
          const query = this.supabase
            .from('records')
            .select('*')
            .in('id', recordIds)
            .eq('target_type', targetType)
            .order('visit_date', { ascending: false })
          const { data, error } = await query
          if (error) throw new Error(`Bubble records 조회 실패: ${error.message}`)
          return { rows: data ?? [], source: 'bubble' as RecordSource }
        }
        case 'following': {
          const { data: followRows } = await this.supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)
            .eq('status', 'accepted')
          if (!followRows || followRows.length === 0) return { rows: [], source: 'following' as RecordSource }
          const followingIds = followRows.map((f) => f.following_id)
          const query = this.supabase
            .from('records')
            .select('*')
            .in('user_id', followingIds)
            .eq('target_type', targetType)
            .order('visit_date', { ascending: false })
          const { data, error } = await query
          if (error) throw new Error(`Following records 조회 실패: ${error.message}`)
          return { rows: data ?? [], source: 'following' as RecordSource }
        }
        case 'public': {
          const { data: publicUsers } = await this.supabase
            .from('users')
            .select('id')
            .eq('is_public', true)
            .neq('id', userId)
          if (!publicUsers || publicUsers.length === 0) return { rows: [], source: 'public' as RecordSource }
          const publicUserIds = publicUsers.map((u) => u.id)
          const query = this.supabase
            .from('records')
            .select('*')
            .in('user_id', publicUserIds)
            .eq('target_type', targetType)
            .order('visit_date', { ascending: false })
            .limit(50)
          const { data, error } = await query
          if (error) throw new Error(`Public records 조회 실패: ${error.message}`)
          return { rows: data ?? [], source: 'public' as RecordSource }
        }
      }
    })

    const results = await Promise.all(promises)

    // 2) 모든 raw rows를 하나로 합침 — 중복 시 우선순위: mine > following > bubble > public > wishlist
    const SOURCE_PRIORITY: Record<string, number> = {
      mine: 0, following: 1, bubble: 2, public: 3, wishlist: 4,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rowMap: Supabase raw row, enrichRecordsWithTarget과 동일 패턴
    const rowMap = new Map<string, { row: any; source: RecordSource }>()
    for (const result of results) {
      for (const row of result.rows) {
        const existing = rowMap.get(row.id)
        if (!existing || (SOURCE_PRIORITY[result.source] ?? 99) < (SOURCE_PRIORITY[existing.source] ?? 99)) {
          rowMap.set(row.id, { row, source: result.source })
        }
      }
    }

    // 3) 통합된 rows를 한 번에 enrich
    const allEntries = Array.from(rowMap.values())
    if (allEntries.length === 0) return []

    const mergedRows = allEntries.map((e) => e.row)
    const enriched = await this.enrichRecordsWithTarget(mergedRows, userId, 'mine')

    // source 오버라이드
    const sourceMap = new Map<string, RecordSource>()
    for (const entry of allEntries) {
      sourceMap.set(entry.row.id, entry.source)
    }
    return enriched.map((r) => ({
      ...r,
      source: sourceMap.get(r.id) ?? r.source,
    }))
  }

  async findFollowingTargetIds(
    userId: string,
    targetIds: string[],
    targetType: RecordTargetType,
  ): Promise<Set<string>> {
    if (targetIds.length === 0) return new Set()

    const { data: followRows } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')

    if (!followRows || followRows.length === 0) return new Set()

    const followingUserIds = followRows.map((f) => f.following_id)
    const { data: followingRecords } = await this.supabase
      .from('records')
      .select('target_id')
      .in('user_id', followingUserIds)
      .in('target_id', targetIds)
      .eq('target_type', targetType)

    const result = new Set<string>()
    for (const fr of followingRecords ?? []) {
      result.add(fr.target_id)
    }
    return result
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
