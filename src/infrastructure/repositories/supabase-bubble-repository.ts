import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput, BubbleFeedItem, BubbleShareForTarget, UserBubbleMembership, MutualRecordItem, SearchUserResult } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleRankingSnapshot, BubbleFocusType, BubbleVisibility, BubbleContentVisibility, BubbleJoinPolicy, VisibilityOverride, BubbleShareRule, BubbleExpertise, ExpertiseAxisType, BubbleItem } from '@/domain/entities/bubble'
import { getLevelTitle } from '@/domain/services/xp-calculator'

// ─── camelCase → snake_case 변환 (Entity → DB) ───

const BUBBLE_FIELD_MAP: Record<string, string> = {
  focusType: 'focus_type', contentVisibility: 'content_visibility',
  allowComments: 'allow_comments', allowExternalShare: 'allow_external_share',
  joinPolicy: 'join_policy', minRecords: 'min_records', minLevel: 'min_level',
  maxMembers: 'max_members', isSearchable: 'is_searchable', searchKeywords: 'search_keywords',
  iconBgColor: 'icon_bg_color', createdBy: 'created_by', inviteCode: 'invite_code',
  inviteExpiresAt: 'invite_expires_at', followerCount: 'follower_count',
  memberCount: 'member_count', recordCount: 'record_count', avgSatisfaction: 'avg_satisfaction',
  lastActivityAt: 'last_activity_at', uniqueTargetCount: 'unique_target_count',
  weeklyRecordCount: 'weekly_record_count', prevWeeklyRecordCount: 'prev_weekly_record_count',
  createdAt: 'created_at', updatedAt: 'updated_at',
}

const MEMBER_FIELD_MAP: Record<string, string> = {
  bubbleId: 'bubble_id', userId: 'user_id',
  shareRule: 'share_rule',
  visibilityOverride: 'visibility_override', tasteMatchPct: 'taste_match_pct',
  commonTargetCount: 'common_target_count', avgSatisfaction: 'avg_satisfaction',
  memberUniqueTargetCount: 'member_unique_target_count', weeklyShareCount: 'weekly_share_count',
  badgeLabel: 'badge_label', joinedAt: 'joined_at',
}

/** DB 컬럼이 아닌 조인 파생 필드 + id — update에서 제외 */
const READ_ONLY_FIELDS = new Set(['id', 'ownerNickname', 'ownerHandle'])

function toEntityRow(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (READ_ONLY_FIELDS.has(key)) continue
    row[fieldMap[key] ?? key] = value
  }
  return row
}

// ─── snake_case → camelCase 변환 (DB → Entity) ───

/** SELECT 표현식: bubbles + owner(users) FK 조인 (bubbles.created_by → users.id) */
const BUBBLE_SELECT_WITH_OWNER = '*, owner:users!created_by(nickname, handle), bubble_photos(url, order_index)'

function toBubble(row: Record<string, unknown>): Bubble {
  const ownerRow = row.owner as { nickname?: string; handle?: string | null } | null | undefined
  const photos = row.bubble_photos as Array<{ url: string; order_index: number }> | null | undefined
  const sortedPhotos = photos && photos.length > 0
    ? [...photos].sort((a, b) => a.order_index - b.order_index)
    : null
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    focusType: row.focus_type as BubbleFocusType,
    area: row.area as string | null,
    visibility: row.visibility as BubbleVisibility,
    contentVisibility: row.content_visibility as BubbleContentVisibility,
    allowComments: row.allow_comments as boolean,
    allowExternalShare: row.allow_external_share as boolean,
    joinPolicy: row.join_policy as BubbleJoinPolicy,
    minRecords: row.min_records as number,
    minLevel: row.min_level as number,
    maxMembers: row.max_members as number | null,
    rules: row.rules as string[] | null,
    isSearchable: row.is_searchable as boolean,
    searchKeywords: row.search_keywords as string[] | null,
    followerCount: (row.follower_count as number) ?? 0,
    memberCount: (row.member_count as number) ?? 0,
    recordCount: (row.record_count as number) ?? 0,
    avgSatisfaction: row.avg_satisfaction as number | null,
    lastActivityAt: row.last_activity_at as string | null,
    uniqueTargetCount: (row.unique_target_count as number) ?? 0,
    weeklyRecordCount: (row.weekly_record_count as number) ?? 0,
    prevWeeklyRecordCount: (row.prev_weekly_record_count as number) ?? 0,
    icon: row.icon as string | null,
    iconBgColor: row.icon_bg_color as string | null,
    createdBy: row.created_by as string | null,
    ownerNickname: ownerRow?.nickname ?? null,
    ownerHandle: ownerRow?.handle ?? null,
    coverPhotoUrl: sortedPhotos ? sortedPhotos[0].url : null,
    inviteCode: row.invite_code as string | null,
    inviteExpiresAt: row.invite_expires_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toBubbleMember(row: Record<string, unknown>): BubbleMember {
  return {
    bubbleId: row.bubble_id as string,
    userId: row.user_id as string,
    role: row.role as BubbleMemberRole,
    status: row.status as BubbleMemberStatus,
    shareRule: row.share_rule as BubbleShareRule | null,
    visibilityOverride: row.visibility_override as VisibilityOverride | null,
    tasteMatchPct: row.taste_match_pct as number | null,
    commonTargetCount: (row.common_target_count as number) ?? 0,
    avgSatisfaction: row.avg_satisfaction as number | null,
    memberUniqueTargetCount: (row.member_unique_target_count as number) ?? 0,
    weeklyShareCount: (row.weekly_share_count as number) ?? 0,
    badgeLabel: row.badge_label as string | null,
    joinedAt: row.joined_at as string,
  }
}

function toBubbleShare(row: Record<string, unknown>): BubbleShare {
  return {
    id: row.id as string,
    bubbleId: row.bubble_id as string,
    sharedBy: row.shared_by as string,
    sharedAt: row.shared_at as string,
    targetId: row.target_id as string,
    targetType: row.target_type as 'restaurant' | 'wine',
  }
}

function toBubbleItem(row: Record<string, unknown>): BubbleItem {
  return {
    id: row.id as string,
    bubbleId: row.bubble_id as string,
    targetId: row.target_id as string,
    targetType: row.target_type as 'restaurant' | 'wine',
    addedAt: row.added_at as string,
  }
}

export class SupabaseBubbleRepository implements BubbleRepository {
  private get supabase() { return createClient() }

  async searchUsers(query: string, excludeIds?: string[], limit = 10): Promise<SearchUserResult[]> {
    if (!query.trim()) return []
    const term = `%${query.trim()}%`
    let q = this.supabase
      .from('users')
      .select('id, nickname, handle, email, avatar_url, avatar_color')
      .or(`nickname.ilike.${term},handle.ilike.${term},email.ilike.${term}`)
      .limit(limit)
    if (excludeIds && excludeIds.length > 0) {
      q = q.not('id', 'in', `(${excludeIds.join(',')})`)
    }
    const { data } = await q
    return (data ?? []).map((r) => ({
      id: r.id as string,
      nickname: r.nickname as string,
      handle: r.handle as string | null,
      avatarUrl: r.avatar_url as string | null,
      avatarColor: r.avatar_color as string | null,
    }))
  }

  async create(input: CreateBubbleInput): Promise<Bubble> {
    const { data, error } = await this.supabase.from('bubbles').insert({
      name: input.name,
      description: input.description ?? null,
      focus_type: input.focusType ?? 'all',
      area: input.area ?? null,
      visibility: input.visibility ?? 'private',
      content_visibility: input.contentVisibility ?? 'rating_and_comment',
      allow_comments: input.allowComments ?? true,
      allow_external_share: input.allowExternalShare ?? false,
      join_policy: input.joinPolicy ?? 'invite_only',
      min_records: input.minRecords ?? 0,
      min_level: input.minLevel ?? 0,
      max_members: input.maxMembers ?? null,
      rules: input.rules ?? null,
      is_searchable: input.isSearchable ?? true,
      search_keywords: input.searchKeywords ?? null,
      icon: input.icon ?? null,
      icon_bg_color: input.iconBgColor ?? null,
      created_by: input.createdBy,
    }).select(BUBBLE_SELECT_WITH_OWNER).single()
    if (error) throw new Error(`Bubble 생성 실패: ${error.message}`)
    const bubble = toBubble(data as Record<string, unknown>)
    // owner 자동 추가
    await this.addMember(bubble.id, input.createdBy, 'owner', 'active')
    return bubble
  }

  async findById(id: string): Promise<Bubble | null> {
    const { data } = await this.supabase.from('bubbles').select(BUBBLE_SELECT_WITH_OWNER).eq('id', id).single()
    return data ? toBubble(data as Record<string, unknown>) : null
  }

  async findByUserId(userId: string): Promise<Bubble[]> {
    const { data } = await this.supabase.from('bubble_members').select('bubble_id').eq('user_id', userId).eq('status', 'active')
    if (!data || data.length === 0) return []
    const ids = data.map((m) => m.bubble_id)
    const { data: bubbles } = await this.supabase.from('bubbles').select(BUBBLE_SELECT_WITH_OWNER).in('id', ids)
    return (bubbles ?? []).map((r) => toBubble(r as Record<string, unknown>))
  }

  async getPendingBubbleIds(userId: string): Promise<string[]> {
    const { data } = await this.supabase.from('bubble_members').select('bubble_id').eq('user_id', userId).eq('status', 'pending')
    return (data ?? []).map((m) => m.bubble_id as string)
  }

  async findPublic(options?: {
    search?: string
    focusType?: string
    area?: string
    sortBy?: 'latest' | 'members' | 'records' | 'activity'
    limit?: number
    offset?: number
  }): Promise<{ data: Bubble[]; total: number }> {
    const limit = options?.limit ?? 20
    const offset = options?.offset ?? 0
    let query = this.supabase.from('bubbles').select(BUBBLE_SELECT_WITH_OWNER, { count: 'exact' })
      .eq('visibility', 'public').eq('is_searchable', true)

    if (options?.search) {
      const term = `%${options.search}%`
      query = query.or(`name.ilike.${term},description.ilike.${term}`)
    }
    if (options?.focusType) query = query.eq('focus_type', options.focusType)
    if (options?.area) query = query.ilike('area', `%${options.area}%`)

    switch (options?.sortBy) {
      case 'members': query = query.order('member_count', { ascending: false }); break
      case 'records': query = query.order('record_count', { ascending: false }); break
      case 'activity': query = query.order('last_activity_at', { ascending: false, nullsFirst: false }); break
      default: query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)
    const { data, count } = await query
    return { data: (data ?? []).map((r) => toBubble(r as Record<string, unknown>)), total: count ?? 0 }
  }

  async update(id: string, updates: Partial<Bubble>): Promise<Bubble> {
    const row = toEntityRow(updates as Record<string, unknown>, BUBBLE_FIELD_MAP)
    row.updated_at = new Date().toISOString()
    const { data, error } = await this.supabase.from('bubbles').update(row).eq('id', id).select(BUBBLE_SELECT_WITH_OWNER).single()
    if (error) throw new Error(`Bubble 수정 실패: ${error.message}`)
    return toBubble(data as Record<string, unknown>)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('bubbles').delete().eq('id', id)
    if (error) throw new Error(`Bubble 삭제 실패: ${error.message}`)
  }

  async getMembers(bubbleId: string, options?: {
    role?: string
    status?: string
    sortBy?: 'taste_match' | 'records' | 'level' | 'recent'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleMember[]; total: number }> {
    let query = this.supabase.from('bubble_members').select('*', { count: 'exact' })
      .eq('bubble_id', bubbleId)

    if (options?.role) query = query.eq('role', options.role)
    if (options?.status) query = query.eq('status', options.status)

    switch (options?.sortBy) {
      case 'taste_match': query = query.order('taste_match_pct', { ascending: false, nullsFirst: false }); break
      case 'records': query = query.order('member_unique_target_count', { ascending: false }); break
      case 'level': query = query.order('avg_satisfaction', { ascending: false, nullsFirst: false }); break
      case 'recent': query = query.order('joined_at', { ascending: false }); break
      default: query = query.order('joined_at', { ascending: true })
    }

    if (options?.limit) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, count } = await query
    return { data: (data ?? []).map((r) => toBubbleMember(r as Record<string, unknown>)), total: count ?? 0 }
  }

  async getMember(bubbleId: string, userId: string): Promise<BubbleMember | null> {
    const { data } = await this.supabase
      .from('bubble_members')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('user_id', userId)
      .single()
    return data ? toBubbleMember(data as Record<string, unknown>) : null
  }

  async getPendingMembers(bubbleId: string): Promise<BubbleMember[]> {
    const { data } = await this.supabase
      .from('bubble_members')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })
    return (data ?? []).map((r) => toBubbleMember(r as Record<string, unknown>))
  }

  async addMember(bubbleId: string, userId: string, role: string, status: string): Promise<BubbleMember> {
    const { data, error } = await this.supabase.from('bubble_members').insert({ bubble_id: bubbleId, user_id: userId, role, status }).select().single()
    if (error) throw new Error(`멤버 추가 실패: ${error.message}`)
    return toBubbleMember(data as Record<string, unknown>)
  }

  async updateMember(bubbleId: string, userId: string, updates: Partial<BubbleMember>): Promise<void> {
    const row = toEntityRow(updates as Record<string, unknown>, MEMBER_FIELD_MAP)
    await this.supabase.from('bubble_members').update(row).eq('bubble_id', bubbleId).eq('user_id', userId)
  }

  async removeMember(bubbleId: string, userId: string): Promise<void> {
    await this.supabase.from('bubble_members').delete().eq('bubble_id', bubbleId).eq('user_id', userId)
  }

  async getShares(bubbleId: string, options?: {
    targetType?: 'restaurant' | 'wine'
    period?: 'week' | 'month' | '3months' | 'all'
    minSatisfaction?: number
    sortBy?: 'newest' | 'reactions' | 'score'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleShare[]; total: number }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    // bubble_items 기반 (added_by 제거됨)
    let query = this.supabase.from('bubble_items').select('*', { count: 'exact' })
      .eq('bubble_id', bubbleId)

    if (options?.targetType) query = query.eq('target_type', options.targetType)

    if (options?.period && options.period !== 'all') {
      const msMap = { week: 7 * 86400000, month: 30 * 86400000, '3months': 90 * 86400000 }
      const cutoff = new Date(Date.now() - msMap[options.period]).toISOString()
      query = query.gte('added_at', cutoff)
    }

    query = query.order('added_at', { ascending: false })

    query = query.range(offset, offset + limit - 1)
    const { data, count } = await query
    return {
      data: (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        bubbleId: r.bubble_id as string,
        sharedBy: '',
        sharedAt: r.added_at as string,
        targetId: r.target_id as string,
        targetType: r.target_type as 'restaurant' | 'wine',
      })),
      total: count ?? 0,
    }
  }

  async getEnrichedShares(bubbleId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleFeedItem[]; total: number }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    // 1) bubble_items 조회 (added_by 없이)
    const { data: itemRows, count } = await this.supabase
      .from('bubble_items')
      .select('id, bubble_id, target_id, target_type, added_at', { count: 'exact' })
      .eq('bubble_id', bubbleId)
      .order('added_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const items = ((itemRows ?? []) as unknown as Record<string, unknown>[]).map((r) => toBubbleItem(r))
    if (items.length === 0) return { data: [], total: count ?? 0 }

    // 2) 버블의 활성 멤버 조회
    const { data: memberRows } = await this.supabase
      .from('bubble_members')
      .select('user_id')
      .eq('bubble_id', bubbleId)
      .eq('status', 'active')
    const memberIds = (memberRows ?? []).map((m: Record<string, unknown>) => m.user_id as string)

    // 3) records 조회 — target_id + member user_id 기반
    const targetIds = [...new Set(items.map((i) => i.targetId))]
    const { data: recordRows } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, axis_x, axis_y, comment, scene, visit_date, user_id')
      .in('target_id', targetIds)
      .in('user_id', memberIds)

    // target_id → 가장 최근 기록 매핑 (아이템별 대표 기록)
    const latestRecByTarget: Record<string, Record<string, unknown>> = {}
    for (const r of ((recordRows ?? []) as unknown as Record<string, unknown>[])) {
      const tid = r.target_id as string
      if (!latestRecByTarget[tid] || (r.visit_date as string) > (latestRecByTarget[tid].visit_date as string)) {
        latestRecByTarget[tid] = r
      }
    }

    // 4) authors 조회 (기록이 있는 유저들만)
    const authorIds = [...new Set(Object.values(latestRecByTarget).map((r) => r.user_id as string))]
    const { data: userRows } = authorIds.length > 0
      ? await this.supabase
        .from('users')
        .select('id, nickname, avatar_url, avatar_color, total_xp')
        .in('id', authorIds)
      : { data: [] }
    const authorMap: Record<string, Record<string, unknown>> = {}
    for (const u of ((userRows ?? []) as unknown as Record<string, unknown>[])) {
      authorMap[u.id as string] = u
    }

    // 5) target 이름 batch 조회
    const restaurantIds = [...new Set(
      items.filter((i) => i.targetType === 'restaurant').map((i) => i.targetId),
    )]
    const wineIds = [...new Set(
      items.filter((i) => i.targetType === 'wine').map((i) => i.targetId),
    )]
    const targetInfoMap: Record<string, {
      name: string; meta: string | null; area: string | null; photoUrl: string | null
      vintage?: number | null; wineType?: string | null; producer?: string | null; country?: string | null
    }> = {}

    if (restaurantIds.length > 0) {
      const { data: restData } = await this.supabase.from('restaurants').select('id, name, genre, area, district').in('id', restaurantIds)
      for (const r of ((restData ?? []) as unknown as Record<string, unknown>[])) {
        const areaArr = r.area as string[] | null
        const district = r.district as string | null
        targetInfoMap[r.id as string] = {
          name: r.name as string,
          meta: r.genre as string | null,
          area: areaArr?.join(', ') ?? district ?? null,
          photoUrl: null,
        }
      }
    }
    if (wineIds.length > 0) {
      const { data: wineData } = await this.supabase.from('wines').select('id, name, variety, region, country, wine_type, vintage, producer, label_image_url').in('id', wineIds)
      for (const w of ((wineData ?? []) as unknown as Record<string, unknown>[])) {
        targetInfoMap[w.id as string] = {
          name: w.name as string,
          meta: w.variety as string | null,
          area: w.region as string | null,
          photoUrl: (w.label_image_url as string | null) ?? null,
          vintage: (w.vintage as number) ?? null,
          wineType: (w.wine_type as string) ?? null,
          producer: (w.producer as string) ?? null,
          country: (w.country as string) ?? null,
        }
      }
    }

    // 5-b) record_photos batch 조회
    const recordIdsWithPhotos = items
      .map((i) => {
        const rec = latestRecByTarget[i.targetId]
        return rec?.id as string | undefined
      })
      .filter((rid): rid is string => rid != null)
    let photoMap: Record<string, string> = {}
    if (recordIdsWithPhotos.length > 0) {
      const { data: photoRows } = await this.supabase
        .from('record_photos')
        .select('record_id, url')
        .in('record_id', recordIdsWithPhotos)
        .eq('order_index', 0)
      for (const p of ((photoRows ?? []) as unknown as Record<string, unknown>[])) {
        photoMap[p.record_id as string] = p.url as string
      }
    }

    // 6) 조합 — records.user_id가 sharedBy 역할
    const feedItems: BubbleFeedItem[] = items.map((item) => {
      const rec = latestRecByTarget[item.targetId]
      const userId = rec?.user_id as string | undefined
      const author = userId ? authorMap[userId] : undefined
      const targetInfo = targetInfoMap[item.targetId]
      const recId = (rec?.id as string) ?? ''

      return {
        id: item.id,
        recordId: recId,
        bubbleId: item.bubbleId,
        sharedBy: userId ?? '',
        sharedAt: item.addedAt,
        targetId: item.targetId,
        targetType: item.targetType,
        targetName: targetInfo?.name ?? '',
        targetMeta: targetInfo?.meta ?? null,
        targetArea: targetInfo?.area ?? null,
        targetPhotoUrl: (recId ? photoMap[recId] : null) ?? targetInfo?.photoUrl ?? null,
        targetVintage: targetInfo?.vintage ?? null,
        targetWineType: targetInfo?.wineType ?? null,
        targetProducer: targetInfo?.producer ?? null,
        targetCountry: targetInfo?.country ?? null,
        satisfaction: (rec?.satisfaction as number) ?? null,
        axisX: (rec?.axis_x as number) ?? null,
        axisY: (rec?.axis_y as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        scene: (rec?.scene as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        authorNickname: (author?.nickname as string) ?? '',
        authorAvatar: (author?.avatar_url as string) ?? null,
        authorAvatarColor: (author?.avatar_color as string) ?? null,
      }
    })

    return { data: feedItems, total: count ?? 0 }
  }

  async addShare(bubbleId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare> {
    const { data, error } = await this.supabase.from('bubble_items').upsert(
      { bubble_id: bubbleId, target_id: targetId, target_type: targetType },
      { onConflict: 'bubble_id,target_id,target_type' }
    ).select().single()
    if (error) throw new Error(`공유 실패: ${error.message}`)
    const row = data as Record<string, unknown>
    return {
      id: row.id as string,
      bubbleId: row.bubble_id as string,
      sharedBy: '',
      sharedAt: row.added_at as string,
      targetId: row.target_id as string,
      targetType: row.target_type as 'restaurant' | 'wine',
    }
  }

  async removeShare(shareId: string): Promise<void> {
    await this.supabase.from('bubble_items').delete().eq('id', shareId)
  }

  async getRankings(bubbleId: string, options: {
    targetType: 'restaurant' | 'wine'
    periodStart?: string
    limit?: number
  }): Promise<BubbleRankingSnapshot[]> {
    let query = this.supabase.from('bubble_ranking_snapshots').select('*')
      .eq('bubble_id', bubbleId)
      .eq('target_type', options.targetType)
      .order('rank_position', { ascending: true })
    if (options.periodStart) query = query.eq('period_start', options.periodStart)
    if (options.limit) query = query.limit(options.limit)
    const { data } = await query
    return (data ?? []).map((r: Record<string, unknown>) => ({
      bubbleId: r.bubble_id as string,
      targetId: r.target_id as string,
      targetType: r.target_type as 'restaurant' | 'wine',
      periodStart: r.period_start as string,
      rankPosition: r.rank_position as number,
      avgSatisfaction: r.avg_satisfaction as number | null,
      recordCount: (r.record_count as number) ?? 0,
    }))
  }

  async getPreviousRankings(bubbleId: string, targetType: 'restaurant' | 'wine', periodStart: string): Promise<BubbleRankingSnapshot[]> {
    const { data } = await this.supabase.from('bubble_ranking_snapshots').select('*')
      .eq('bubble_id', bubbleId)
      .eq('target_type', targetType)
      .eq('period_start', periodStart)
      .order('rank_position', { ascending: true })
    return (data ?? []).map((r: Record<string, unknown>) => ({
      bubbleId: r.bubble_id as string,
      targetId: r.target_id as string,
      targetType: r.target_type as 'restaurant' | 'wine',
      periodStart: r.period_start as string,
      rankPosition: r.rank_position as number,
      avgSatisfaction: r.avg_satisfaction as number | null,
      recordCount: (r.record_count as number) ?? 0,
    }))
  }

  async insertRankingSnapshots(snapshots: BubbleRankingSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return
    const rows = snapshots.map((s) => ({
      bubble_id: s.bubbleId,
      target_id: s.targetId,
      target_type: s.targetType,
      period_start: s.periodStart,
      rank_position: s.rankPosition,
      avg_satisfaction: s.avgSatisfaction,
      record_count: s.recordCount,
    }))
    const { error } = await this.supabase.from('bubble_ranking_snapshots').upsert(rows, {
      onConflict: 'bubble_id,target_id,target_type,period_start',
    })
    if (error) throw new Error(`랭킹 스냅샷 저장 실패: ${error.message}`)
  }

  async findByInviteCode(code: string): Promise<Bubble | null> {
    const { data } = await this.supabase.from('bubbles').select(BUBBLE_SELECT_WITH_OWNER).eq('invite_code', code).single()
    return data ? toBubble(data as Record<string, unknown>) : null
  }

  async generateInviteCode(bubbleId: string, expiresAt?: string | null): Promise<string> {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expiry = expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await this.supabase.from('bubbles').update({ invite_code: code, invite_expires_at: expiry }).eq('id', bubbleId)
    return code
  }

  async validateInviteCode(code: string): Promise<{ valid: boolean; bubble: Bubble | null; expired: boolean }> {
    const bubble = await this.findByInviteCode(code)
    if (!bubble) return { valid: false, bubble: null, expired: false }
    if (bubble.inviteExpiresAt && new Date(bubble.inviteExpiresAt) < new Date()) {
      return { valid: false, bubble, expired: true }
    }
    return { valid: true, bubble, expired: false }
  }

  // S8 추가 메서드

  async getSharesForTarget(targetId: string, targetType: string, bubbleIds: string[]): Promise<BubbleShareForTarget[]> {
    if (bubbleIds.length === 0) return []
    // bubble_items 조회 (added_by 제거)
    const { data: itemData } = await this.supabase
      .from('bubble_items')
      .select('id, bubble_id, target_id, target_type, added_at, bubbles(name, icon, content_visibility)')
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .in('bubble_id', bubbleIds)
      .order('added_at', { ascending: false })

    if (!itemData || itemData.length === 0) return []

    // 각 버블의 활성 멤버 조회
    const uniqueBubbleIds = [...new Set((itemData as Record<string, unknown>[]).map((i) => i.bubble_id as string))]
    const { data: memberRows } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, user_id')
      .in('bubble_id', uniqueBubbleIds)
      .eq('status', 'active')
    const memberIdsByBubble: Record<string, string[]> = {}
    for (const m of ((memberRows ?? []) as unknown as Record<string, unknown>[])) {
      const bid = m.bubble_id as string
      if (!memberIdsByBubble[bid]) memberIdsByBubble[bid] = []
      memberIdsByBubble[bid].push(m.user_id as string)
    }
    const allMemberIds = [...new Set((memberRows ?? []).map((m: Record<string, unknown>) => m.user_id as string))]

    // records 조회 — 해당 target에 대해 활성 멤버의 기록
    const { data: recData } = await this.supabase
      .from('records')
      .select('id, target_id, user_id, satisfaction, axis_x, axis_y, comment, scene, visit_date')
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .in('user_id', allMemberIds)

    // user_id → record 매핑
    const recByUser: Record<string, Record<string, unknown>> = {}
    for (const r of ((recData ?? []) as unknown as Record<string, unknown>[])) {
      recByUser[r.user_id as string] = r
    }

    // users 조회
    const userIdsWithRecords = Object.keys(recByUser)
    const { data: userRows } = await this.supabase
      .from('users')
      .select('id, nickname, avatar_url, avatar_color, total_xp')
      .in('id', userIdsWithRecords.length > 0 ? userIdsWithRecords : ['__none__'])
    const userMap: Record<string, Record<string, unknown>> = {}
    for (const u of ((userRows ?? []) as unknown as Record<string, unknown>[])) {
      userMap[u.id as string] = u
    }

    // 각 bubble_item에 대해, 해당 버블의 활성 멤버 중 기록이 있는 사람의 record를 매칭
    type ItemWithAuthor = { item: Record<string, unknown>; authorUserId: string }
    const matched: ItemWithAuthor[] = []
    for (const i of (itemData as Record<string, unknown>[])) {
      const bid = i.bubble_id as string
      const members = memberIdsByBubble[bid] ?? []
      for (const memberId of members) {
        if (recByUser[memberId]) {
          matched.push({ item: i, authorUserId: memberId })
        }
      }
    }

    // 리액션/댓글 카운트 배치 조회
    const recordIds = matched.map((m) => {
      const rec = recByUser[m.authorUserId]
      return rec?.id as string
    }).filter(Boolean)
    const [likeCounts, commentCounts] = await Promise.all([
      this.getReactionCountsBatch(recordIds),
      this.getCommentCountsBatch(recordIds),
    ])

    return matched.map((m) => {
      const i = m.item
      const bubble = i.bubbles as Record<string, unknown> | null
      const rec = recByUser[m.authorUserId]
      const user = userMap[m.authorUserId]
      const totalXp = (user?.total_xp as number) ?? 0
      const level = Math.max(1, Math.floor(totalXp / 100) + 1)
      const recordId = (rec?.id as string) ?? ''
      return {
        id: i.id as string,
        recordId,
        bubbleId: i.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: m.authorUserId,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        authorLevel: level,
        authorLevelTitle: getLevelTitle(level),
        satisfaction: (rec?.satisfaction as number) ?? null,
        axisX: (rec?.axis_x as number) ?? null,
        axisY: (rec?.axis_y as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        scene: (rec?.scene as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        sharedAt: i.added_at as string,
        contentVisibility: (bubble?.content_visibility as 'rating_only' | 'rating_and_comment') ?? 'rating_and_comment',
        likeCount: likeCounts.get(recordId) ?? 0,
        commentCount: commentCounts.get(recordId) ?? 0,
      }
    })
  }

  private async getReactionCountsBatch(recordIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    if (recordIds.length === 0) return counts
    const { data } = await this.supabase
      .from('reactions')
      .select('target_id, reaction_type')
      .eq('target_type', 'record')
      .eq('reaction_type', 'like')
      .in('target_id', recordIds)
    for (const row of data ?? []) {
      const id = row.target_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }

  private async getCommentCountsBatch(recordIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    if (recordIds.length === 0) return counts
    const { data } = await this.supabase
      .from('comments')
      .select('target_id')
      .eq('target_type', 'record')
      .in('target_id', recordIds)
    for (const row of data ?? []) {
      const id = row.target_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }

  async getFeedFromBubbles(userId: string, targetType?: 'restaurant' | 'wine'): Promise<BubbleFeedItem[]> {
    const memberships = await this.getUserBubbles(userId)
    if (memberships.length === 0) return []
    const bubbleIds = memberships.map((m) => m.bubbleId)

    // bubble_items 조회 (added_by 제거)
    let itemQuery = this.supabase
      .from('bubble_items')
      .select('id, bubble_id, target_id, target_type, added_at, bubbles(name, icon)')
      .in('bubble_id', bubbleIds)
      .order('added_at', { ascending: false })
      .limit(100)
    if (targetType) itemQuery = itemQuery.eq('target_type', targetType)
    const { data } = await itemQuery
    if (!data || data.length === 0) return []

    // 각 버블의 활성 멤버 조회
    const { data: memberRows } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, user_id')
      .in('bubble_id', bubbleIds)
      .eq('status', 'active')
    const memberIdsByBubble: Record<string, string[]> = {}
    for (const m of ((memberRows ?? []) as unknown as Record<string, unknown>[])) {
      const bid = m.bubble_id as string
      if (!memberIdsByBubble[bid]) memberIdsByBubble[bid] = []
      memberIdsByBubble[bid].push(m.user_id as string)
    }

    // records, users, target 이름을 별도 조회
    const itemTargetIds = [...new Set((data as Record<string, unknown>[]).map((s) => s.target_id as string))]
    const allMemberIds = [...new Set((memberRows ?? []).map((m: Record<string, unknown>) => m.user_id as string))]

    // records 조회 — 본인 제외
    const otherMemberIds = allMemberIds.filter((id) => id !== userId)
    const { data: recRows } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, user_id')
      .in('target_id', itemTargetIds)
      .in('user_id', otherMemberIds.length > 0 ? otherMemberIds : ['__none__'])
    const recByTargetUser: Record<string, Record<string, unknown>> = {}
    for (const r of ((recRows ?? []) as unknown as Record<string, unknown>[])) {
      recByTargetUser[`${r.target_id}:${r.user_id}`] = r
    }

    // users 조회
    const { data: uRows } = await this.supabase
      .from('users')
      .select('id, nickname, avatar_url, avatar_color')
      .in('id', otherMemberIds.length > 0 ? otherMemberIds : ['__none__'])
    const userMap: Record<string, Record<string, unknown>> = {}
    for (const u of ((uRows ?? []) as unknown as Record<string, unknown>[])) {
      userMap[u.id as string] = u
    }

    // target 이름 조회
    const restIds = itemTargetIds.filter((id) => (data as Record<string, unknown>[]).some((s) => s.target_id === id && s.target_type === 'restaurant'))
    const wIds = itemTargetIds.filter((id) => (data as Record<string, unknown>[]).some((s) => s.target_id === id && s.target_type === 'wine'))
    const nameMap: Record<string, string> = {}
    if (restIds.length > 0) {
      const { data: rd } = await this.supabase.from('restaurants').select('id, name').in('id', restIds)
      for (const r of rd ?? []) nameMap[r.id as string] = r.name as string
    }
    if (wIds.length > 0) {
      const { data: wd } = await this.supabase.from('wines').select('id, name').in('id', wIds)
      for (const w of wd ?? []) nameMap[w.id as string] = w.name as string
    }

    // 각 bubble_item에 대해 본인 제외 멤버 중 기록이 있는 사람 매칭
    type FeedMatch = { item: Record<string, unknown>; authorUserId: string }
    const matched: FeedMatch[] = []
    for (const s of (data as Record<string, unknown>[])) {
      const bid = s.bubble_id as string
      const members = memberIdsByBubble[bid] ?? []
      for (const memberId of members) {
        if (memberId === userId) continue
        const key = `${s.target_id}:${memberId}`
        if (recByTargetUser[key]) {
          matched.push({ item: s, authorUserId: memberId })
        }
      }
    }

    // 최신 50개로 제한
    const limited = matched.slice(0, 50)

    return limited.map((m) => {
      const s = m.item
      const bubble = s.bubbles as Record<string, unknown> | null
      const rec = recByTargetUser[`${s.target_id}:${m.authorUserId}`]
      const user = userMap[m.authorUserId]
      return {
        id: s.id as string,
        recordId: (rec?.id as string) ?? '',
        targetId: s.target_id as string,
        bubbleId: s.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: m.authorUserId,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        targetName: nameMap[s.target_id as string] ?? '',
        targetType: s.target_type as 'restaurant' | 'wine',
        satisfaction: (rec?.satisfaction as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        sharedAt: s.added_at as string,
      }
    })
  }

  async getRecentRecordsByUsers(userIds: string[], targetType?: 'restaurant' | 'wine'): Promise<MutualRecordItem[]> {
    if (userIds.length === 0) return []
    let query = this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, created_at, users(nickname, avatar_url, avatar_color), restaurants(name), wines(name)')
      .in('user_id', userIds)
    if (targetType) {
      query = query.eq('target_type', targetType)
    }
    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []).map((r: Record<string, unknown>) => {
      const user = r.users as Record<string, unknown> | null
      const rest = r.restaurants as Record<string, unknown> | null
      const wine = r.wines as Record<string, unknown> | null
      const recTargetType = (r.target_type as string) ?? 'restaurant'
      return {
        recordId: r.id as string,
        targetId: (r.target_id as string) ?? '',
        targetName: recTargetType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: recTargetType as 'restaurant' | 'wine',
        satisfaction: (r.satisfaction as number) ?? null,
        comment: (r.comment as string) ?? null,
        visitDate: (r.visit_date as string) ?? null,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        createdAt: r.created_at as string,
      }
    })
  }

  async getUserBubbles(userId: string): Promise<UserBubbleMembership[]> {
    const { data } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, status, share_rule, bubbles(name, icon, icon_bg_color)')
      .eq('user_id', userId)
    return (data ?? []).map((m: Record<string, unknown>) => {
      const bubble = m.bubbles as Record<string, unknown> | null
      return {
        bubbleId: m.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        bubbleIconBgColor: (bubble?.icon_bg_color as string) ?? null,
        status: m.status as string,
        shareRule: m.share_rule as BubbleShareRule | null,
      }
    })
  }

  async getTargetShares(targetId: string, targetType: 'restaurant' | 'wine', userId: string): Promise<BubbleShare[]> {
    // 내가 멤버인 버블 목록 조회
    const memberships = await this.getUserBubbles(userId)
    if (memberships.length === 0) return []
    const myBubbleIds = memberships.map((m) => m.bubbleId)

    // 해당 타겟이 포함된 bubble_items 중 내가 멤버인 버블만 필터
    const { data } = await this.supabase
      .from('bubble_items')
      .select('id, bubble_id, target_id, target_type, added_at')
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .in('bubble_id', myBubbleIds)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      bubbleId: r.bubble_id as string,
      sharedBy: '',
      sharedAt: r.added_at as string,
      targetId: r.target_id as string,
      targetType: r.target_type as 'restaurant' | 'wine',
    }))
  }

  async shareRecord(bubbleId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare> {
    return this.addShare(bubbleId, targetId, targetType)
  }

  async unshareRecord(targetId: string, targetType: 'restaurant' | 'wine', bubbleId: string): Promise<void> {
    await this.supabase
      .from('bubble_items')
      .delete()
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .eq('bubble_id', bubbleId)
  }

  // ─── 전문성 집계 ───

  async getExpertise(bubbleId: string): Promise<BubbleExpertise[]> {
    const { data, error } = await this.supabase
      .from('bubble_expertise')
      .select('axis_type, axis_value, member_count, avg_level, max_level')
      .eq('bubble_id', bubbleId)
      .order('avg_level', { ascending: false })
    if (error) throw new Error(`전문성 조회 실패: ${error.message}`)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      axisType: r.axis_type as ExpertiseAxisType,
      axisValue: r.axis_value as string,
      memberCount: r.member_count as number,
      avgLevel: r.avg_level as number,
      maxLevel: r.max_level as number,
    }))
  }

  async getExpertiseForBubbles(bubbleIds: string[]): Promise<Map<string, BubbleExpertise[]>> {
    const result = new Map<string, BubbleExpertise[]>()
    if (bubbleIds.length === 0) return result

    const { data, error } = await this.supabase
      .from('bubble_expertise')
      .select('bubble_id, axis_type, axis_value, member_count, avg_level, max_level')
      .in('bubble_id', bubbleIds)
      .order('avg_level', { ascending: false })
    if (error) throw new Error(`버블 전문성 일괄 조회 실패: ${error.message}`)

    for (const r of (data ?? []) as Record<string, unknown>[]) {
      const bubbleId = r.bubble_id as string
      const expertise: BubbleExpertise = {
        axisType: r.axis_type as ExpertiseAxisType,
        axisValue: r.axis_value as string,
        memberCount: r.member_count as number,
        avgLevel: r.avg_level as number,
        maxLevel: r.max_level as number,
      }
      const list = result.get(bubbleId)
      if (list) {
        list.push(expertise)
      } else {
        result.set(bubbleId, [expertise])
      }
    }

    return result
  }

  // ─── 자동 공유 동기화 ───

  async updateShareRule(bubbleId: string, userId: string, shareRule: BubbleShareRule | null): Promise<void> {
    await this.supabase
      .from('bubble_members')
      .update({ share_rule: shareRule })
      .eq('bubble_id', bubbleId)
      .eq('user_id', userId)
  }

  // ─── 큐레이션 아이템 (bubble_items) ───

  async addItem(bubbleId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('인증 필요')
    const { error } = await this.supabase.from('bubble_items').upsert(
      { bubble_id: bubbleId, target_id: targetId, target_type: targetType },
      { onConflict: 'bubble_id,target_id,target_type' }
    )
    if (error) throw new Error(`아이템 추가 실패: ${error.message}`)
  }

  async removeItem(bubbleId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void> {
    const { error } = await this.supabase.from('bubble_items')
      .delete()
      .eq('bubble_id', bubbleId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
    if (error) throw new Error(`아이템 삭제 실패: ${error.message}`)
  }

  async getItems(bubbleId: string, targetType?: 'restaurant' | 'wine'): Promise<BubbleItem[]> {
    let query = this.supabase.from('bubble_items').select('*')
      .eq('bubble_id', bubbleId)
      .order('added_at', { ascending: false })
    if (targetType) query = query.eq('target_type', targetType)
    const { data } = await query
    return (data ?? []).map((r: Record<string, unknown>) => toBubbleItem(r))
  }

  async isItemInBubble(bubbleId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<boolean> {
    const { count } = await this.supabase.from('bubble_items')
      .select('id', { count: 'exact', head: true })
      .eq('bubble_id', bubbleId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
    return (count ?? 0) > 0
  }

  // ─── target 기반 자동 큐레이션 동기화 (bubble_items) ───

  async batchUpsertAutoItems(
    targets: Array<{ targetId: string; targetType: 'restaurant' | 'wine' }>,
    bubbleId: string,
  ): Promise<void> {
    if (targets.length === 0) return
    const rows = targets.map((t) => ({
      bubble_id: bubbleId,
      target_id: t.targetId,
      target_type: t.targetType,
    }))
    const { error } = await this.supabase
      .from('bubble_items')
      .upsert(rows, { onConflict: 'bubble_id,target_id,target_type' })
    if (error) throw new Error(`자동 아이템 일괄 추가 실패: ${error.message}`)
  }

  async batchDeleteAutoItems(
    targetIds: string[],
    targetType: 'restaurant' | 'wine',
    bubbleId: string,
  ): Promise<void> {
    if (targetIds.length === 0) return
    await this.supabase
      .from('bubble_items')
      .delete()
      .in('target_id', targetIds)
      .eq('bubble_id', bubbleId)
      .eq('target_type', targetType)
  }

  async getAutoItemTargetIds(bubbleId: string, targetType?: 'restaurant' | 'wine'): Promise<string[]> {
    let query = this.supabase
      .from('bubble_items')
      .select('target_id')
      .eq('bubble_id', bubbleId)
    if (targetType) query = query.eq('target_type', targetType)
    const { data } = await query
    return (data ?? []).map((r) => r.target_id as string)
  }
}
