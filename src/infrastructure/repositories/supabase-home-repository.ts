import type { HomeRepository, HomeViewType, HomeDbFilters, HomeTargetsResult } from '@/domain/repositories/home-repository'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import type { DiningRecord, RecordTargetType, RecordSource } from '@/domain/entities/record'
import type { SortOption } from '@/domain/entities/saved-filter'
/** 홈 피드용 RecordSource 우선순위 (score 시스템의 SOURCE_PRIORITY와 별개) */
const RECORD_SOURCE_PRIORITY: RecordSource[] = ['mine', 'following', 'bubble']
import { createClient } from '@/infrastructure/supabase/client'

// --- DB -> Domain 매핑 (records) ---

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

/** HomeViewType -> RecordSource 매핑 */
function viewToSource(view: HomeViewType): RecordSource {
  switch (view) {
    case 'mine':
      return 'mine'
    case 'following':
      return 'following'
    case 'bubble':
      return 'bubble'
  }
}

export class SupabaseHomeRepository implements HomeRepository {
  private get supabase() {
    return createClient()
  }

  async findHomeTargets(
    userId: string,
    targetType: RecordTargetType,
    views: HomeViewType[],
    socialFilter?: {
      followingUserIds?: string[]
      bubbleIds?: string[]
    },
    dbFilters?: HomeDbFilters,
    sort?: SortOption,
    limit?: number | null,
    offset?: number,
  ): Promise<HomeTargetsResult> {
    // Step 1: 각 view별 target_id 셋 병렬 수집 + source 매핑
    const viewTargetSets = await Promise.all(
      views.map(async (view) => {
        const ids = await this.collectTargetIds(userId, targetType, view, socialFilter)
        return { view, ids }
      }),
    )

    // target_id -> sources 매핑
    const targetSourceMap = new Map<string, Set<RecordSource>>()
    for (const { view, ids } of viewTargetSets) {
      const source = viewToSource(view)
      for (const id of ids) {
        const existing = targetSourceMap.get(id)
        if (existing) {
          existing.add(source)
        } else {
          targetSourceMap.set(id, new Set([source]))
        }
      }
    }

    const allTargetIds = [...targetSourceMap.keys()]
    if (allTargetIds.length === 0) return { targets: [], hasMore: false }

    // Step 2: DB 필터 + 소팅 + 페이지네이션 (LIMIT+1 패턴)
    // limit이 있으면 limit+1을 요청하여 hasMore 판별
    const dbLimit = limit != null ? limit + 1 : null
    const targetMeta = await this.fetchTargetMeta(allTargetIds, targetType, dbFilters, sort, dbLimit, offset)

    // hasMore 판별: limit+1개를 요청해서 limit보다 많으면 다음 페이지 존재
    let hasMore = false
    if (limit != null && targetMeta.size > limit) {
      hasMore = true
      // 초과분 제거 (마지막 1개)
      const keys = [...targetMeta.keys()]
      targetMeta.delete(keys[keys.length - 1])
    }

    // Step 3: 필터된 ID로만 records/bookmarks/photos 조회 (불필요한 조회 방지)
    const filteredTargetIds = [...targetMeta.keys()]
    if (filteredTargetIds.length === 0) return { targets: [], hasMore: false }

    const [allRecords, bookmarks] = await Promise.all([
      this.fetchRecords(userId, filteredTargetIds, targetType, views, socialFilter),
      this.fetchBookmarks(userId, filteredTargetIds, targetType),
    ])

    // record_photos batch 조회
    const realRecordIds = allRecords.map((r) => r.id)
    const photoMap = realRecordIds.length > 0
      ? await this.fetchRecordPhotos(realRecordIds)
      : new Map<string, string[]>()

    // Step 4: HomeTarget[] 조립
    const targets = this.assembleTargets(
      filteredTargetIds,
      targetType,
      targetMeta,
      allRecords,
      bookmarks,
      photoMap,
      targetSourceMap,
      userId,
    )

    return { targets, hasMore }
  }

  // --- Step 1: ViewType별 target_id 수집 ---

  private async collectTargetIds(
    userId: string,
    targetType: RecordTargetType,
    view: HomeViewType,
    socialFilter?: {
      followingUserIds?: string[]
      bubbleIds?: string[]
    },
  ): Promise<Set<string>> {
    switch (view) {
      case 'mine': {
        const { data } = await this.supabase
          .from('records')
          .select('target_id')
          .eq('user_id', userId)
          .eq('target_type', targetType)
        return new Set((data ?? []).map((r) => r.target_id))
      }
      case 'following': {
        const { data: followRows } = await this.supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted')
        if (!followRows || followRows.length === 0) return new Set()

        let followingIds = followRows.map((f) => f.following_id)
        if (socialFilter?.followingUserIds && socialFilter.followingUserIds.length > 0) {
          const allowed = new Set(socialFilter.followingUserIds)
          followingIds = followingIds.filter((id) => allowed.has(id))
        }
        if (followingIds.length === 0) return new Set()

        const { data } = await this.supabase
          .from('records')
          .select('target_id')
          .in('user_id', followingIds)
          .eq('target_type', targetType)
        return new Set((data ?? []).map((r) => r.target_id))
      }
      case 'bubble': {
        const { data: memberships } = await this.supabase
          .from('bubble_members')
          .select('bubble_id')
          .eq('user_id', userId)
          .eq('status', 'active')
        if (!memberships || memberships.length === 0) return new Set()

        let bubbleIds = memberships.map((m) => m.bubble_id)
        if (socialFilter?.bubbleIds && socialFilter.bubbleIds.length > 0) {
          const allowed = new Set(socialFilter.bubbleIds)
          bubbleIds = bubbleIds.filter((id) => allowed.has(id))
        }
        if (bubbleIds.length === 0) return new Set()

        // bubble_items 기반 — 본인 추가 아이템 포함 (중복은 targetSourceMap에서 병합)
        const { data: items } = await this.supabase
          .from('bubble_items')
          .select('target_id')
          .in('bubble_id', bubbleIds)
          .eq('target_type', targetType)
        if (!items || items.length === 0) return new Set()
        return new Set(items.map((i) => i.target_id))
      }
    }
  }

  // --- Step 2: Target 메타 batch 조회 ---

  private async fetchTargetMeta(
    targetIds: string[],
    targetType: RecordTargetType,
    dbFilters?: HomeDbFilters,
    sort?: SortOption,
    limit?: number | null,
    offset?: number,
  ): Promise<Map<string, TargetMeta>> {
    const map = new Map<string, TargetMeta>()
    if (targetIds.length === 0) return map

    if (targetType === 'restaurant') {
      const { data } = await this.supabase.rpc('filter_home_restaurants', {
        p_ids: targetIds,
        p_genre: dbFilters?.genre ?? null,
        p_district: dbFilters?.district ?? null,
        p_area: dbFilters?.area ?? null,
        p_prestige: dbFilters?.prestige ?? null,
        p_price_range: dbFilters?.priceRange ?? null,
        p_sort: sort === 'name' ? 'name' : 'name',
        p_limit: limit ?? null,
        p_offset: offset ?? 0,
      })
      const rows = (data ?? []) as unknown as RpcRestaurantRow[]
      for (const r of rows) {
        map.set(r.id, {
          name: r.name,
          genre: r.genre ?? null,
          city: r.city ?? null,
          district: r.district ?? null,
          area: r.area ?? null,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          priceRange: r.price_range ?? null,
          prestige: (r.prestige ?? []) as RestaurantPrestige[],
          photoUrl: r.photos?.[0] ?? null,
          wineType: null,
          variety: null,
          country: r.country ?? null,
          region: null,
          vintage: null,
        })
      }
    } else {
      const { data } = await this.supabase.rpc('filter_home_wines', {
        p_ids: targetIds,
        p_wine_type: dbFilters?.wineType ?? null,
        p_variety: dbFilters?.variety ?? null,
        p_country: dbFilters?.country ?? null,
        p_vintage: dbFilters?.vintage ?? null,
        p_vintage_op: dbFilters?.vintageOp ?? 'eq',
        p_acidity: dbFilters?.acidity ?? null,
        p_sweetness: dbFilters?.sweetness ?? null,
        p_sort: sort === 'name' ? 'name' : 'name',
        p_limit: limit ?? null,
        p_offset: offset ?? 0,
      })
      const rows = (data ?? []) as unknown as RpcWineRow[]
      for (const w of rows) {
        map.set(w.id, {
          name: w.name,
          genre: null,
          city: null,
          district: null,
          area: null,
          lat: null,
          lng: null,
          priceRange: null,
          prestige: [],
          photoUrl: w.photos?.[0] ?? null,
          wineType: w.wine_type ?? null,
          variety: w.variety ?? null,
          country: w.country ?? null,
          region: w.region ?? null,
          vintage: w.vintage ?? null,
        })
      }
    }

    return map
  }

  // --- Step 3: Records batch 조회 (내 기록 + 소셜 소스) ---

  private async fetchRecords(
    userId: string,
    targetIds: string[],
    targetType: RecordTargetType,
    views: HomeViewType[],
    socialFilter?: {
      followingUserIds?: string[]
      bubbleIds?: string[]
    },
  ): Promise<(DiningRecord & { source: RecordSource })[]> {
    if (targetIds.length === 0) return []

    const results: (DiningRecord & { source: RecordSource })[] = []

    // 내 기록 (mine)
    const { data: myRows } = await this.supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .in('target_id', targetIds)
      .order('visit_date', { ascending: false })
    for (const row of myRows ?? []) {
      results.push({ ...mapDbToRecord(row), source: 'mine' })
    }

    // 팔로잉 기록
    if (views.includes('following')) {
      const { data: followRows } = await this.supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')

      if (followRows && followRows.length > 0) {
        let followingIds = followRows.map((f) => f.following_id)
        if (socialFilter?.followingUserIds && socialFilter.followingUserIds.length > 0) {
          const allowed = new Set(socialFilter.followingUserIds)
          followingIds = followingIds.filter((id) => allowed.has(id))
        }

        if (followingIds.length > 0) {
          const { data: fRows } = await this.supabase
            .from('records')
            .select('*')
            .in('user_id', followingIds)
            .eq('target_type', targetType)
            .in('target_id', targetIds)
            .order('visit_date', { ascending: false })
          for (const row of fRows ?? []) {
            results.push({ ...mapDbToRecord(row), source: 'following' })
          }
        }
      }
    }

    // 버블 기록
    if (views.includes('bubble')) {
      const { data: memberships } = await this.supabase
        .from('bubble_members')
        .select('bubble_id')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (memberships && memberships.length > 0) {
        let bubbleIds = memberships.map((m) => m.bubble_id)
        if (socialFilter?.bubbleIds && socialFilter.bubbleIds.length > 0) {
          const allowed = new Set(socialFilter.bubbleIds)
          bubbleIds = bubbleIds.filter((id) => allowed.has(id))
        }

        if (bubbleIds.length > 0) {
          // bubble_items 기반 — 본인 추가 아이템 포함
          const { data: bItems } = await this.supabase
            .from('bubble_items')
            .select('target_id')
            .in('bubble_id', bubbleIds)
            .eq('target_type', targetType)

          if (bItems && bItems.length > 0) {
            const itemTargetIds = [...new Set(bItems.map((i) => i.target_id as string))]
            const filteredTargetIds = itemTargetIds.filter((id) => targetIds.includes(id))
            if (filteredTargetIds.length > 0) {
              const { data: bRows } = await this.supabase
                .from('records')
                .select('*')
                .in('target_id', filteredTargetIds)
                .eq('target_type', targetType)
                .order('visit_date', { ascending: false })
              for (const row of bRows ?? []) {
                results.push({ ...mapDbToRecord(row), source: 'bubble' })
              }
            }
          }
        }
      }
    }

    return results
  }

  // --- Step 4: Bookmarks batch 조회 ---

  private async fetchBookmarks(
    userId: string,
    targetIds: string[],
    targetType: RecordTargetType,
  ): Promise<Map<string, { isBookmarked: boolean; isCellar: boolean }>> {
    const map = new Map<string, { isBookmarked: boolean; isCellar: boolean }>()
    if (targetIds.length === 0) return map

    const { data } = await this.supabase
      .from('bookmarks')
      .select('target_id, type')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .in('target_id', targetIds)

    for (const row of data ?? []) {
      const existing = map.get(row.target_id) ?? { isBookmarked: false, isCellar: false }
      if (row.type === 'bookmark') existing.isBookmarked = true
      if (row.type === 'cellar') existing.isCellar = true
      map.set(row.target_id, existing)
    }

    return map
  }

  // --- Step 5: Record photos batch 조회 ---

  private async fetchRecordPhotos(
    recordIds: string[],
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    if (recordIds.length === 0) return map

    const { data } = await this.supabase
      .from('record_photos')
      .select('record_id, url')
      .in('record_id', recordIds)
      .order('order_index', { ascending: true })

    for (const p of data ?? []) {
      const existing = map.get(p.record_id)
      if (existing) existing.push(p.url)
      else map.set(p.record_id, [p.url])
    }

    return map
  }

  // --- Step 6-7: HomeTarget[] 조립 ---

  private assembleTargets(
    targetIds: string[],
    targetType: RecordTargetType,
    targetMeta: Map<string, TargetMeta>,
    allRecords: (DiningRecord & { source: RecordSource })[],
    bookmarks: Map<string, { isBookmarked: boolean; isCellar: boolean }>,
    photoMap: Map<string, string[]>,
    targetSourceMap: Map<string, Set<RecordSource>>,
    currentUserId: string,
  ): HomeTarget[] {
    const results: HomeTarget[] = []

    for (const targetId of targetIds) {
      const meta = targetMeta.get(targetId)
      if (!meta) continue

      // 이 target의 records (모든 source)
      const targetRecords = allRecords.filter((r) => r.targetId === targetId)

      // 내 기록만 (visitCount, 최신 기록 등)
      const myRecords = targetRecords
        .filter((r) => r.userId === currentUserId)
        .sort((a, b) => {
          const dateA = a.visitDate ?? ''
          const dateB = b.visitDate ?? ''
          if (dateA !== dateB) return dateB.localeCompare(dateA)
          return b.createdAt.localeCompare(a.createdAt)
        })

      const latestMine = myRecords[0] ?? null

      // 대표 점수: source 우선순위 폴백 (record-grouper.ts 로직 포팅)
      const scored = targetRecords.filter((r) => r.satisfaction != null)
      let bestSatisfaction: number | null = null
      let bestAxisX: number | null = null
      let bestAxisY: number | null = null
      let bestSource: RecordSource | null = null

      if (scored.length > 0) {
        const bySource = new Map<RecordSource, typeof scored>()
        for (const r of scored) {
          const src = r.source
          const arr = bySource.get(src)
          if (arr) arr.push(r)
          else bySource.set(src, [r])
        }
        for (const src of RECORD_SOURCE_PRIORITY) {
          const srcRecords = bySource.get(src)
          if (srcRecords && srcRecords.length > 0) {
            bestSource = src
            bestSatisfaction = Math.round(
              srcRecords.reduce((sum, r) => sum + (r.satisfaction ?? 0), 0) / srcRecords.length,
            )
            const withAxis = srcRecords.filter((r) => r.axisX != null && r.axisY != null)
            if (withAxis.length > 0) {
              bestAxisX = Math.round(withAxis.reduce((sum, r) => sum + (r.axisX ?? 0), 0) / withAxis.length)
              bestAxisY = Math.round(withAxis.reduce((sum, r) => sum + (r.axisY ?? 0), 0) / withAxis.length)
            }
            break
          }
        }
      }

      // 사진 우선순위: 내 record_photos -> 소셜 record_photos -> target.photos
      // allPhotos: 내 최신 record의 전체 사진 배열 (캘린더 사진 뷰어용)
      let photoUrl: string | null = null
      let allPhotos: string[] = []
      if (latestMine) {
        const minePhotos = photoMap.get(latestMine.id)
        if (minePhotos && minePhotos.length > 0) {
          photoUrl = minePhotos[0]
          allPhotos = minePhotos
        }
      }
      if (!photoUrl) {
        // 소셜 records의 사진 (source 우선순위 순)
        for (const src of RECORD_SOURCE_PRIORITY) {
          const srcRecords = targetRecords.filter((r) => r.source === src && r.userId !== currentUserId)
          for (const r of srcRecords) {
            const photos = photoMap.get(r.id)
            if (photos && photos.length > 0) {
              photoUrl = photos[0]
              allPhotos = photos
              break
            }
          }
          if (photoUrl) break
        }
      }
      if (!photoUrl) {
        photoUrl = meta.photoUrl
        if (meta.photoUrl) allPhotos = [meta.photoUrl]
      }

      // 내 점수 평균
      const myScoredRecords = myRecords.filter((r) => r.satisfaction != null)
      const myScoreAvg = myScoredRecords.length > 0
        ? Math.round(myScoredRecords.reduce((s, r) => s + (r.satisfaction ?? 0), 0) / myScoredRecords.length)
        : null

      // 버블 점수 평균 (source='bubble' 기록)
      const bubbleRecords = targetRecords.filter((r) => r.source === 'bubble' && r.satisfaction != null)
      const bubbleScoreAvg = bubbleRecords.length > 0
        ? Math.round(bubbleRecords.reduce((s, r) => s + (r.satisfaction ?? 0), 0) / bubbleRecords.length)
        : null

      const bookmark = bookmarks.get(targetId) ?? { isBookmarked: false, isCellar: false }
      const sources = [...(targetSourceMap.get(targetId) ?? [])]

      // 타인의 기록: companions/privateNote 비공개 처리
      const sanitizedMyRecords = myRecords.map((r) => ({
        ...r,
        // source 필드를 DiningRecord에서 제거
      }))
      // DiningRecord[] (source 제외)
      const diningRecords: DiningRecord[] = sanitizedMyRecords.map(({ source: _source, ...rest }) => rest)

      results.push({
        targetId,
        targetType,
        name: meta.name,
        photoUrl,
        allPhotos,

        genre: meta.genre,
        city: meta.city,
        district: meta.district,
        area: meta.area,
        lat: meta.lat,
        lng: meta.lng,
        priceRange: meta.priceRange,
        prestige: meta.prestige,

        wineType: meta.wineType,
        variety: meta.variety,
        country: meta.country,
        region: meta.region,
        vintage: meta.vintage,

        isBookmarked: bookmark.isBookmarked,
        isCellar: bookmark.isCellar,
        visitCount: myRecords.length,
        sources,

        satisfaction: bestSatisfaction,
        axisX: bestAxisX,
        axisY: bestAxisY,
        scoreSource: bestSource,

        myScore: myScoreAvg,
        nyamScore: null,       // application hook에서 batchPredict로 채움
        nyamConfidence: null,
        bubbleScore: bubbleScoreAvg,
        bubbleConfidence: null, // application hook에서 채움

        latestRecordId: latestMine?.id ?? null,
        latestVisitDate: latestMine?.visitDate ?? null,
        latestScene: latestMine?.scene ?? null,
        latestCreatedAt: latestMine?.createdAt ?? null,

        records: diningRecords,
      })
    }

    return results
  }
}

// --- 내부 타입 ---

/** filter_home_restaurants RPC 반환 행 */
interface RpcRestaurantRow {
  id: string
  name: string
  genre: string | null
  country: string | null
  city: string | null
  district: string | null
  area: string[] | null
  photos: string[] | null
  lat: number | null
  lng: number | null
  price_range: number | null
  prestige: unknown[]
}

/** filter_home_wines RPC 반환 행 */
interface RpcWineRow {
  id: string
  name: string
  wine_type: string | null
  variety: string | null
  country: string | null
  region: string | null
  vintage: number | null
  photos: string[] | null
}

interface TargetMeta {
  name: string
  genre: string | null
  city: string | null
  district: string | null
  area: string[] | null
  lat: number | null
  lng: number | null
  priceRange: number | null
  prestige: RestaurantPrestige[]
  photoUrl: string | null
  wineType: string | null
  variety: string | null
  country: string | null
  region: string | null
  vintage: number | null
}
