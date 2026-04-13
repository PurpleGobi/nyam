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
    // ── Stage 1: 공유 데이터 + target_id 수집 (P1: 1회 조회, P2: 내부 체인 병렬) ──
    const shared = await this.prefetchSharedData(userId, targetType, views, socialFilter)

    const targetSourceMap = new Map<string, Set<RecordSource>>()
    for (const view of views) {
      const ids = this.collectTargetIdsFromCache(view, shared)
      const source = viewToSource(view)
      for (const id of ids) {
        const existing = targetSourceMap.get(id)
        if (existing) existing.add(source)
        else targetSourceMap.set(id, new Set([source]))
      }
    }

    const allTargetIds = [...targetSourceMap.keys()]
    if (allTargetIds.length === 0) return { targets: [], hasMore: false }

    // ── Stage 2: 메타 필터 + records 병렬 (P2) ──
    const hasDbFilters = dbFilters && Object.values(dbFilters).some((v) => v != null)
    const dbLimit = limit != null ? limit + 1 : null

    let targetMeta: Map<string, TargetMeta>
    let allRecords: (DiningRecord & { source: RecordSource })[]
    let photoMap: Map<string, string[]>

    if (hasDbFilters || dbLimit != null) {
      // 필터/페이지네이션 있음 → meta 먼저, 필터된 ID로 records 조회
      targetMeta = await this.fetchTargetMeta(allTargetIds, targetType, dbFilters, sort, dbLimit, offset)

      let hasMore = false
      if (limit != null && targetMeta.size > limit) {
        hasMore = true
        const keys = [...targetMeta.keys()]
        targetMeta.delete(keys[keys.length - 1])
      }

      const filteredTargetIds = [...targetMeta.keys()]
      if (filteredTargetIds.length === 0) return { targets: [], hasMore: false }

      const result = await this.fetchRecordsAndPhotos(userId, filteredTargetIds, targetType, views, shared)
      allRecords = result.records
      photoMap = result.photoMap

      return {
        targets: this.assembleTargets(filteredTargetIds, targetType, targetMeta, allRecords, photoMap, targetSourceMap, userId, shared.bubbleItemsByTarget),
        hasMore,
      }
    }

    // 필터 없음 → meta + records 전부 병렬 (P2: 최대 병렬화)
    const [metaResult, recordsResult] = await Promise.all([
      this.fetchTargetMeta(allTargetIds, targetType, dbFilters, sort, dbLimit, offset),
      this.fetchRecordsAndPhotos(userId, allTargetIds, targetType, views, shared),
    ])

    targetMeta = metaResult
    allRecords = recordsResult.records
    photoMap = recordsResult.photoMap

    const filteredTargetIds = [...targetMeta.keys()]
    if (filteredTargetIds.length === 0) return { targets: [], hasMore: false }

    return {
      targets: this.assembleTargets(filteredTargetIds, targetType, targetMeta, allRecords, photoMap, targetSourceMap, userId, shared.bubbleItemsByTarget),
      hasMore: false,
    }
  }

  // --- Step 0: 공유 데이터 1회 조회 (follows, memberships, bubble_items, my target_ids) ---

  private async prefetchSharedData(
    userId: string,
    targetType: RecordTargetType,
    views: HomeViewType[],
    socialFilter?: {
      followingUserIds?: string[]
      bubbleIds?: string[]
    },
  ): Promise<SharedPrefetch> {
    const needFollowing = views.includes('following')
    const needBubble = views.includes('bubble')

    // P2: 3개 체인을 동시에 시작 — 각 체인 내부만 순차 (의존성), 체인 간 병렬
    const [myTargetIds, followingChain, bubbleItemTargetIds] = await Promise.all([
      // Chain A: 내 기록 target_id (1 query)
      this.supabase
        .from('records')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .then(({ data }) => new Set((data ?? []).map((r) => r.target_id as string))),

      // Chain B: follows → following target_ids (2 queries chained)
      needFollowing
        ? this.supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)
            .eq('status', 'accepted')
            .then(async ({ data }) => {
              let ids = (data ?? []).map((f) => f.following_id as string)
              if (socialFilter?.followingUserIds && socialFilter.followingUserIds.length > 0) {
                const allowed = new Set(socialFilter.followingUserIds)
                ids = ids.filter((id) => allowed.has(id))
              }
              if (ids.length === 0) return { followingIds: [] as string[], followingTargetIds: new Set<string>() }
              const { data: recs } = await this.supabase
                .from('records')
                .select('target_id')
                .in('user_id', ids)
                .eq('target_type', targetType)
              return {
                followingIds: ids,
                followingTargetIds: new Set((recs ?? []).map((r) => r.target_id as string)),
              }
            })
        : Promise.resolve({ followingIds: [] as string[], followingTargetIds: new Set<string>() }),

      // Chain C: memberships → bubble_items + bubble meta (2 queries chained)
      needBubble
        ? this.supabase
            .from('bubble_members')
            .select('bubble_id, bubbles(name, icon, icon_bg_color)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .then(async ({ data: memberships }) => {
              if (!memberships || memberships.length === 0) {
                return { ids: new Set<string>(), byTarget: new Map<string, BubbleItemEntry[]>() }
              }
              // 버블 메타 맵 구축
              const bubbleMeta = new Map<string, { name: string; icon: string | null; iconBgColor: string | null }>()
              for (const m of memberships) {
                const b = m.bubbles as unknown as { name: string; icon: string | null; icon_bg_color: string | null } | null
                bubbleMeta.set(m.bubble_id as string, {
                  name: b?.name ?? '',
                  icon: b?.icon ?? null,
                  iconBgColor: b?.icon_bg_color ?? null,
                })
              }
              let bubbleIds = memberships.map((m) => m.bubble_id as string)
              if (socialFilter?.bubbleIds && socialFilter.bubbleIds.length > 0) {
                const allowed = new Set(socialFilter.bubbleIds)
                bubbleIds = bubbleIds.filter((id) => allowed.has(id))
              }
              if (bubbleIds.length === 0) {
                return { ids: new Set<string>(), byTarget: new Map<string, BubbleItemEntry[]>() }
              }
              const { data: items } = await this.supabase
                .from('bubble_items')
                .select('target_id, bubble_id')
                .in('bubble_id', bubbleIds)
                .eq('target_type', targetType)
              const ids = new Set((items ?? []).map((i) => i.target_id as string))
              // target별 소속 버블 맵 구축
              const byTarget = new Map<string, BubbleItemEntry[]>()
              for (const item of items ?? []) {
                const tid = item.target_id as string
                const bid = item.bubble_id as string
                const meta = bubbleMeta.get(bid)
                const entry: BubbleItemEntry = {
                  targetId: tid,
                  bubbleId: bid,
                  bubbleName: meta?.name ?? '',
                  bubbleIcon: meta?.icon ?? null,
                  bubbleIconBgColor: meta?.iconBgColor ?? null,
                }
                const arr = byTarget.get(tid)
                if (arr) arr.push(entry)
                else byTarget.set(tid, [entry])
              }
              return { ids, byTarget }
            })
        : Promise.resolve({ ids: new Set<string>(), byTarget: new Map<string, BubbleItemEntry[]>() }),
    ])

    return {
      myTargetIds,
      followingIds: followingChain.followingIds,
      followingTargetIds: followingChain.followingTargetIds,
      bubbleItemTargetIds: bubbleItemTargetIds.ids,
      bubbleItemsByTarget: bubbleItemTargetIds.byTarget,
    }
  }

  // --- 캐시된 공유 데이터로 target_id 수집 (DB 호출 없음) ---

  private collectTargetIdsFromCache(
    view: HomeViewType,
    shared: SharedPrefetch,
  ): Set<string> {
    switch (view) {
      case 'mine':
        return shared.myTargetIds
      case 'following':
        return shared.followingTargetIds
      case 'bubble':
        return shared.bubbleItemTargetIds
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

  // --- Records + Bookmarks + Photos 병렬 조회 (P1: 중복 없음, P2: 최대 병렬) ---

  /** 소셜 기록 집계에 필요한 최소 컬럼 + photos join (P3) */
  private static readonly SOCIAL_RECORD_COLS = 'id, user_id, target_id, target_type, satisfaction, axis_x, axis_y, visit_date, created_at, record_photos(url, order_index)' as const

  private async fetchRecordsAndPhotos(
    userId: string,
    targetIds: string[],
    targetType: RecordTargetType,
    views: HomeViewType[],
    shared: SharedPrefetch,
  ): Promise<{
    records: (DiningRecord & { source: RecordSource })[]
    photoMap: Map<string, string[]>
  }> {
    if (targetIds.length === 0) {
      return { records: [], photoMap: new Map() }
    }

    const targetIdSet = new Set(targetIds)

    // P2: records(3소스) 병렬, photos는 join으로 포함
    const [myRows, followingRows, bubbleRows] = await Promise.all([
      this.supabase
        .from('records')
        .select('*, record_photos(url, order_index)')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .in('target_id', targetIds)
        .order('visit_date', { ascending: false })
        .then(({ data }) => data ?? []),

      views.includes('following') && shared.followingIds.length > 0
        ? this.supabase
            .from('records')
            .select(SupabaseHomeRepository.SOCIAL_RECORD_COLS)
            .in('user_id', shared.followingIds)
            .eq('target_type', targetType)
            .in('target_id', targetIds)
            .order('visit_date', { ascending: false })
            .then(({ data }) => data ?? [])
        : Promise.resolve([]),

      views.includes('bubble') && shared.bubbleItemTargetIds.size > 0
        ? (() => {
            const filteredBubbleTargetIds = [...shared.bubbleItemTargetIds].filter((id) => targetIdSet.has(id))
            if (filteredBubbleTargetIds.length === 0) return Promise.resolve([])
            return this.supabase
              .from('records')
              .select(SupabaseHomeRepository.SOCIAL_RECORD_COLS)
              .in('target_id', filteredBubbleTargetIds)
              .eq('target_type', targetType)
              .order('visit_date', { ascending: false })
              .then(({ data }) => data ?? [])
          })()
        : Promise.resolve([]),
    ])

    // photoMap 구축
    const photoMap = new Map<string, string[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractPhotos = (rows: any[]) => {
      for (const row of rows) {
        const photos = row.record_photos as { url: string; order_index: number }[] | undefined
        if (photos && photos.length > 0) {
          const sorted = [...photos].sort((a, b) => a.order_index - b.order_index)
          photoMap.set(row.id as string, sorted.map((p) => p.url))
        }
      }
    }
    extractPhotos(myRows)
    extractPhotos(followingRows)
    extractPhotos(bubbleRows)

    const records: (DiningRecord & { source: RecordSource })[] = []
    for (const row of myRows) records.push({ ...mapDbToRecord(row), source: 'mine' })
    for (const row of followingRows) records.push({ ...mapDbToRecord(row), source: 'following' })
    for (const row of bubbleRows) records.push({ ...mapDbToRecord(row), source: 'bubble' })

    return { records, photoMap }
  }

  // --- Step 6-7: HomeTarget[] 조립 ---

  private assembleTargets(
    targetIds: string[],
    targetType: RecordTargetType,
    targetMeta: Map<string, TargetMeta>,
    allRecords: (DiningRecord & { source: RecordSource })[],
    photoMap: Map<string, string[]>,
    targetSourceMap: Map<string, Set<RecordSource>>,
    currentUserId: string,
    bubbleItemsByTarget?: Map<string, BubbleItemEntry[]>,
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

        visitCount: myRecords.length,
        sources,

        memberBubbles: (bubbleItemsByTarget?.get(targetId) ?? []).map((e) => ({
          bubbleId: e.bubbleId,
          bubbleName: e.bubbleName,
          bubbleIcon: e.bubbleIcon,
          bubbleIconBgColor: e.bubbleIconBgColor,
        })),

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

/** prefetchSharedData 결과 — collectTargetIdsFromCache와 fetchRecordsParallel에서 재사용 */
interface BubbleItemEntry {
  targetId: string
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  bubbleIconBgColor: string | null
}

interface SharedPrefetch {
  myTargetIds: Set<string>
  followingIds: string[]
  followingTargetIds: Set<string>
  bubbleItemTargetIds: Set<string>
  /** target별 소속 버블 상세 (뱃지 표시용) */
  bubbleItemsByTarget: Map<string, BubbleItemEntry[]>
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
