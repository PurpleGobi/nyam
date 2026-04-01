import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput, BubbleFeedItem, BubbleShareForTarget, UserBubbleMembership, MutualRecordItem } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleRankingSnapshot, BubbleFocusType, BubbleVisibility, BubbleContentVisibility, BubbleJoinPolicy, VisibilityOverride, BubbleShareRule } from '@/domain/entities/bubble'
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

function toEntityRow(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue
    row[fieldMap[key] ?? key] = value
  }
  return row
}

// ─── snake_case → camelCase 변환 (DB → Entity) ───

function toBubble(row: Record<string, unknown>): Bubble {
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
    recordId: row.record_id as string,
    bubbleId: row.bubble_id as string,
    sharedBy: row.shared_by as string,
    sharedAt: row.shared_at as string,
    targetId: row.target_id as string,
    targetType: row.target_type as 'restaurant' | 'wine',
  }
}

export class SupabaseBubbleRepository implements BubbleRepository {
  private get supabase() { return createClient() }

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
    }).select().single()
    if (error) throw new Error(`Bubble 생성 실패: ${error.message}`)
    const bubble = toBubble(data as Record<string, unknown>)
    // owner 자동 추가
    await this.addMember(bubble.id, input.createdBy, 'owner', 'active')
    return bubble
  }

  async findById(id: string): Promise<Bubble | null> {
    const { data } = await this.supabase.from('bubbles').select('*').eq('id', id).single()
    return data ? toBubble(data as Record<string, unknown>) : null
  }

  async findByUserId(userId: string): Promise<Bubble[]> {
    const { data } = await this.supabase.from('bubble_members').select('bubble_id').eq('user_id', userId).eq('status', 'active')
    if (!data || data.length === 0) return []
    const ids = data.map((m) => m.bubble_id)
    const { data: bubbles } = await this.supabase.from('bubbles').select('*').in('id', ids)
    return (bubbles ?? []).map((r) => toBubble(r as Record<string, unknown>))
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
    let query = this.supabase.from('bubbles').select('*', { count: 'exact' })
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
    const { data, error } = await this.supabase.from('bubbles').update(row).eq('id', id).select().single()
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
    sharedBy?: string
    period?: 'week' | 'month' | '3months' | 'all'
    minSatisfaction?: number
    sortBy?: 'newest' | 'reactions' | 'score' | 'member'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleShare[]; total: number }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    let query = this.supabase.from('bubble_shares').select('*', { count: 'exact' })
      .eq('bubble_id', bubbleId)

    if (options?.sharedBy) query = query.eq('shared_by', options.sharedBy)

    if (options?.period && options.period !== 'all') {
      const msMap = { week: 7 * 86400000, month: 30 * 86400000, '3months': 90 * 86400000 }
      const cutoff = new Date(Date.now() - msMap[options.period]).toISOString()
      query = query.gte('shared_at', cutoff)
    }

    switch (options?.sortBy) {
      case 'member': query = query.order('shared_by', { ascending: true }); break
      default: query = query.order('shared_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)
    const { data, count } = await query
    return { data: (data ?? []).map((r) => toBubbleShare(r as Record<string, unknown>)), total: count ?? 0 }
  }

  async getEnrichedShares(bubbleId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleFeedItem[]; total: number }> {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    // 1) shares 가져오기
    const { data: shareRows, count } = await this.supabase
      .from('bubble_shares')
      .select('*', { count: 'exact' })
      .eq('bubble_id', bubbleId)
      .order('shared_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const shares = ((shareRows ?? []) as unknown as Record<string, unknown>[]).map((r) => toBubbleShare(r))
    if (shares.length === 0) return { data: [], total: count ?? 0 }

    // 2) records batch 조회
    const recordIds = [...new Set(shares.map((s) => s.recordId))]
    const { data: recordRows } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, axis_x, axis_y, comment, scene, visit_date')
      .in('id', recordIds)
    const recordMap: Record<string, Record<string, unknown>> = {}
    for (const r of ((recordRows ?? []) as unknown as Record<string, unknown>[])) {
      recordMap[r.id as string] = r
    }

    // 3) authors batch 조회
    const authorIds = [...new Set(shares.map((s) => s.sharedBy))]
    const { data: userRows } = await this.supabase
      .from('users')
      .select('id, nickname, avatar_url, avatar_color, total_xp')
      .in('id', authorIds)
    const authorMap: Record<string, Record<string, unknown>> = {}
    for (const u of ((userRows ?? []) as unknown as Record<string, unknown>[])) {
      authorMap[u.id as string] = u
    }

    // 4) target 이름 batch 조회 — bubble_shares의 target_id/target_type 직접 사용 (records RLS 무관)
    const restaurantIds = [...new Set(
      shares
        .filter((s) => s.targetType === 'restaurant' && s.targetId)
        .map((s) => s.targetId),
    )]
    const wineIds = [...new Set(
      shares
        .filter((s) => s.targetType === 'wine' && s.targetId)
        .map((s) => s.targetId),
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
          photoUrl: null, // 사진은 record_photos에서 별도 조회
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

    // 4-b) record_photos batch 조회 — 각 record의 첫 번째 사진
    const { data: photoRows } = await this.supabase
      .from('record_photos')
      .select('record_id, url')
      .in('record_id', recordIds)
      .eq('order_index', 0)
    const photoMap: Record<string, string> = {}
    for (const p of ((photoRows ?? []) as unknown as Record<string, unknown>[])) {
      photoMap[p.record_id as string] = p.url as string
    }

    // 5) 조합 — bubble_shares 자체의 target_id/target_type을 우선 사용 (records RLS 우회)
    const items: BubbleFeedItem[] = shares.map((s) => {
      const rec = recordMap[s.recordId]
      const author = authorMap[s.sharedBy]
      // bubble_shares 테이블에 target_id/target_type이 직접 저장됨
      const targetId = s.targetId || (rec?.target_id as string) || ''
      const targetType = (s.targetType || (rec?.target_type as string) || 'restaurant') as 'restaurant' | 'wine'
      const targetInfo = targetInfoMap[targetId]

      return {
        id: s.id,
        recordId: s.recordId,
        bubbleId: s.bubbleId,
        sharedBy: s.sharedBy,
        sharedAt: s.sharedAt,
        targetId,
        targetType,
        targetName: targetInfo?.name ?? '',
        targetMeta: targetInfo?.meta ?? null,
        targetArea: targetInfo?.area ?? null,
        targetPhotoUrl: photoMap[s.recordId] ?? targetInfo?.photoUrl ?? null,
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
        listStatus: null,
        authorNickname: (author?.nickname as string) ?? '',
        authorAvatar: (author?.avatar_url as string) ?? null,
        authorAvatarColor: (author?.avatar_color as string) ?? null,
      }
    })

    return { data: items, total: count ?? 0 }
  }

  async addShare(recordId: string, bubbleId: string, sharedBy: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare> {
    const { data, error } = await this.supabase.from('bubble_shares').insert({ record_id: recordId, bubble_id: bubbleId, shared_by: sharedBy, target_id: targetId, target_type: targetType }).select().single()
    if (error) throw new Error(`공유 실패: ${error.message}`)
    return toBubbleShare(data as Record<string, unknown>)
  }

  async removeShare(shareId: string): Promise<void> {
    await this.supabase.from('bubble_shares').delete().eq('id', shareId)
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
    const { data } = await this.supabase.from('bubbles').select('*').eq('invite_code', code).single()
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
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('id, record_id, bubble_id, shared_by, shared_at, bubbles(name, icon, content_visibility), records(target_type, satisfaction, axis_x, axis_y, comment, scene, visit_date, users(nickname, avatar_url, avatar_color, total_xp))')
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .in('bubble_id', bubbleIds)
      .order('shared_at', { ascending: false })
    const filtered = (data ?? []).filter((s: Record<string, unknown>) => {
      const rec = s.records as Record<string, unknown> | null
      return rec != null
    })

    // 리액션/댓글 카운트 배치 조회
    const recordIds = filtered.map((s: Record<string, unknown>) => s.record_id as string)
    const [likeCounts, commentCounts] = await Promise.all([
      this.getReactionCountsBatch(recordIds),
      this.getCommentCountsBatch(recordIds),
    ])

    return filtered.map((s: Record<string, unknown>) => {
      const bubble = s.bubbles as Record<string, unknown> | null
      const rec = s.records as Record<string, unknown> | null
      const user = rec?.users as Record<string, unknown> | null
      const totalXp = (user?.total_xp as number) ?? 0
      const level = Math.max(1, Math.floor(totalXp / 100) + 1)
      const recordId = s.record_id as string
      return {
        id: s.id as string,
        recordId,
        bubbleId: s.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: s.shared_by as string,
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
        sharedAt: s.shared_at as string,
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
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('id, record_id, bubble_id, shared_by, shared_at, bubbles(name, icon), records(target_id, target_type, satisfaction, comment, visit_date, users(nickname, avatar_url, avatar_color), restaurants(name), wines(name))')
      .in('bubble_id', bubbleIds)
      .neq('shared_by', userId)
      .order('shared_at', { ascending: false })
      .limit(50)
    const items = (data ?? []).map((s: Record<string, unknown>) => {
      const bubble = s.bubbles as Record<string, unknown> | null
      const rec = s.records as Record<string, unknown> | null
      const user = rec?.users as Record<string, unknown> | null
      const rest = rec?.restaurants as Record<string, unknown> | null
      const wine = rec?.wines as Record<string, unknown> | null
      const recTargetType = (rec?.target_type as string) ?? 'restaurant'
      return {
        id: s.id as string,
        recordId: s.record_id as string,
        targetId: (rec?.target_id as string) ?? '',
        bubbleId: s.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: s.shared_by as string,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        targetName: recTargetType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: recTargetType as 'restaurant' | 'wine',
        satisfaction: (rec?.satisfaction as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        sharedAt: s.shared_at as string,
      }
    })
    if (targetType) {
      return items.filter((item) => item.targetType === targetType)
    }
    return items
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

  async getRecordShares(recordId: string): Promise<BubbleShare[]> {
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('*')
      .eq('record_id', recordId)
    return (data ?? []).map((r) => toBubbleShare(r as Record<string, unknown>))
  }

  async shareRecord(recordId: string, bubbleId: string, userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare> {
    return this.addShare(recordId, bubbleId, userId, targetId, targetType)
  }

  async unshareRecord(recordId: string, bubbleId: string): Promise<void> {
    await this.supabase
      .from('bubble_shares')
      .delete()
      .eq('record_id', recordId)
      .eq('bubble_id', bubbleId)
  }

  // ─── 자동 공유 동기화 ───

  async updateShareRule(bubbleId: string, userId: string, shareRule: BubbleShareRule | null): Promise<void> {
    await this.supabase
      .from('bubble_members')
      .update({ share_rule: shareRule })
      .eq('bubble_id', bubbleId)
      .eq('user_id', userId)
  }

  async batchUpsertAutoShares(records: Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' }>, bubbleId: string, userId: string): Promise<void> {
    if (records.length === 0) return
    const rows = records.map((r) => ({
      record_id: r.id,
      bubble_id: bubbleId,
      shared_by: userId,
      auto_synced: true,
      target_id: r.targetId,
      target_type: r.targetType,
    }))
    const { error } = await this.supabase
      .from('bubble_shares')
      .upsert(rows, { onConflict: 'record_id,bubble_id' })
    if (error) throw new Error(`자동 공유 일괄 추가 실패: ${error.message}`)
  }

  async batchDeleteAutoShares(recordIds: string[], bubbleId: string, userId: string): Promise<void> {
    if (recordIds.length === 0) return
    await this.supabase
      .from('bubble_shares')
      .delete()
      .in('record_id', recordIds)
      .eq('bubble_id', bubbleId)
      .eq('shared_by', userId)
      .eq('auto_synced', true)
  }

  async getAutoSharedRecordIds(bubbleId: string, userId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('record_id')
      .eq('bubble_id', bubbleId)
      .eq('shared_by', userId)
      .eq('auto_synced', true)
    return (data ?? []).map((r) => r.record_id as string)
  }

  async cleanManualShares(userId: string): Promise<number> {
    // 수동 공유(auto_synced=false) 중 현재 shareRule에 매칭 안 되는 것들 삭제
    // 서버에서 필터 평가가 복잡하므로, 수동 공유 전체를 삭제하는 단순 방식 사용
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('id')
      .eq('shared_by', userId)
      .eq('auto_synced', false)
    const ids = (data ?? []).map((r) => r.id as string)
    if (ids.length === 0) return 0
    await this.supabase
      .from('bubble_shares')
      .delete()
      .in('id', ids)
    return ids.length
  }
}
