import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput, BubbleFeedItem, BubbleShareForTarget, UserBubbleMembership, MutualRecordItem } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleShare, BubbleShareRead, BubbleRankingSnapshot } from '@/domain/entities/bubble'

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

function toBubbleRow(data: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue
    row[BUBBLE_FIELD_MAP[key] ?? key] = value
  }
  return row
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
    const bubble = data as unknown as Bubble
    // owner 자동 추가
    await this.addMember(bubble.id, input.createdBy, 'owner', 'active')
    return bubble
  }

  async findById(id: string): Promise<Bubble | null> {
    const { data } = await this.supabase.from('bubbles').select('*').eq('id', id).single()
    return data as unknown as Bubble | null
  }

  async findByUserId(userId: string): Promise<Bubble[]> {
    const { data } = await this.supabase.from('bubble_members').select('bubble_id').eq('user_id', userId).eq('status', 'active')
    if (!data || data.length === 0) return []
    const ids = data.map((m) => m.bubble_id)
    const { data: bubbles } = await this.supabase.from('bubbles').select('*').in('id', ids)
    return (bubbles ?? []) as unknown as Bubble[]
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
    return { data: (data ?? []) as unknown as Bubble[], total: count ?? 0 }
  }

  async update(id: string, updates: Partial<Bubble>): Promise<Bubble> {
    const row = toBubbleRow(updates as Record<string, unknown>)
    row.updated_at = new Date().toISOString()
    const { data, error } = await this.supabase.from('bubbles').update(row).eq('id', id).select().single()
    if (error) throw new Error(`Bubble 수정 실패: ${error.message}`)
    return data as unknown as Bubble
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
    return { data: (data ?? []) as unknown as BubbleMember[], total: count ?? 0 }
  }

  async getMember(bubbleId: string, userId: string): Promise<BubbleMember | null> {
    const { data } = await this.supabase
      .from('bubble_members')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('user_id', userId)
      .single()
    return (data as unknown as BubbleMember) ?? null
  }

  async getPendingMembers(bubbleId: string): Promise<BubbleMember[]> {
    const { data } = await this.supabase
      .from('bubble_members')
      .select('*')
      .eq('bubble_id', bubbleId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })
    return (data ?? []) as unknown as BubbleMember[]
  }

  async addMember(bubbleId: string, userId: string, role: string, status: string): Promise<BubbleMember> {
    const { data, error } = await this.supabase.from('bubble_members').insert({ bubble_id: bubbleId, user_id: userId, role, status }).select().single()
    if (error) throw new Error(`멤버 추가 실패: ${error.message}`)
    return data as unknown as BubbleMember
  }

  async updateMember(bubbleId: string, userId: string, updates: Partial<BubbleMember>): Promise<void> {
    await this.supabase.from('bubble_members').update(updates as Record<string, unknown>).eq('bubble_id', bubbleId).eq('user_id', userId)
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
      case 'score': query = query.order('shared_at', { ascending: false }); break
      case 'member': query = query.order('shared_by', { ascending: true }); break
      default: query = query.order('shared_at', { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)
    const { data, count } = await query
    return { data: (data ?? []) as unknown as BubbleShare[], total: count ?? 0 }
  }

  async addShare(recordId: string, bubbleId: string, sharedBy: string): Promise<BubbleShare> {
    const { data, error } = await this.supabase.from('bubble_shares').insert({ record_id: recordId, bubble_id: bubbleId, shared_by: sharedBy }).select().single()
    if (error) throw new Error(`공유 실패: ${error.message}`)
    return data as unknown as BubbleShare
  }

  async removeShare(shareId: string): Promise<void> {
    await this.supabase.from('bubble_shares').delete().eq('id', shareId)
  }

  async markShareRead(shareId: string, userId: string): Promise<void> {
    await this.supabase.from('bubble_share_reads').upsert(
      { share_id: shareId, user_id: userId },
      { onConflict: 'share_id,user_id' },
    )
  }

  async getShareReads(shareId: string): Promise<BubbleShareRead[]> {
    const { data } = await this.supabase.from('bubble_share_reads').select('*').eq('share_id', shareId)
    return (data ?? []).map((r: Record<string, unknown>) => ({
      shareId: r.share_id as string,
      userId: r.user_id as string,
      readAt: r.read_at as string,
    }))
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
    return data as unknown as Bubble | null
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
      .select('id, record_id, bubble_id, shared_by, shared_at, bubbles(name, icon), records(target_type, satisfaction, comment, visit_date, users(nickname, avatar_url, avatar_color))')
      .in('bubble_id', bubbleIds)
      .order('shared_at', { ascending: false })
    return (data ?? []).filter((s: Record<string, unknown>) => {
      const rec = s.records as Record<string, unknown> | null
      return rec && (rec as Record<string, unknown>).target_type === targetType
    }).map((s: Record<string, unknown>) => {
      const bubble = s.bubbles as Record<string, unknown> | null
      const rec = s.records as Record<string, unknown> | null
      const user = rec?.users as Record<string, unknown> | null
      return {
        id: s.id as string,
        recordId: s.record_id as string,
        bubbleId: s.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: s.shared_by as string,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        satisfaction: (rec?.satisfaction as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        sharedAt: s.shared_at as string,
      }
    })
  }

  async getFeedFromBubbles(userId: string): Promise<BubbleFeedItem[]> {
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
    return (data ?? []).map((s: Record<string, unknown>) => {
      const bubble = s.bubbles as Record<string, unknown> | null
      const rec = s.records as Record<string, unknown> | null
      const user = rec?.users as Record<string, unknown> | null
      const rest = rec?.restaurants as Record<string, unknown> | null
      const wine = rec?.wines as Record<string, unknown> | null
      const targetType = (rec?.target_type as string) ?? 'restaurant'
      return {
        id: s.id as string,
        recordId: s.record_id as string,
        bubbleId: s.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        sharedBy: s.shared_by as string,
        authorNickname: (user?.nickname as string) ?? '',
        authorAvatar: (user?.avatar_url as string) ?? null,
        authorAvatarColor: (user?.avatar_color as string) ?? null,
        targetName: targetType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: targetType as 'restaurant' | 'wine',
        satisfaction: (rec?.satisfaction as number) ?? null,
        comment: (rec?.comment as string) ?? null,
        visitDate: (rec?.visit_date as string) ?? null,
        sharedAt: s.shared_at as string,
      }
    })
  }

  async getRecentRecordsByUsers(userIds: string[]): Promise<MutualRecordItem[]> {
    if (userIds.length === 0) return []
    const { data } = await this.supabase
      .from('records')
      .select('id, target_id, target_type, satisfaction, comment, visit_date, created_at, users(nickname, avatar_url, avatar_color), restaurants(name), wines(name)')
      .in('user_id', userIds)
      .eq('status', 'rated')
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []).map((r: Record<string, unknown>) => {
      const user = r.users as Record<string, unknown> | null
      const rest = r.restaurants as Record<string, unknown> | null
      const wine = r.wines as Record<string, unknown> | null
      const targetType = (r.target_type as string) ?? 'restaurant'
      return {
        recordId: r.id as string,
        targetName: targetType === 'restaurant' ? ((rest?.name as string) ?? '') : ((wine?.name as string) ?? ''),
        targetType: targetType as 'restaurant' | 'wine',
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
      .select('bubble_id, status, bubbles(name, icon, icon_bg_color)')
      .eq('user_id', userId)
    return (data ?? []).map((m: Record<string, unknown>) => {
      const bubble = m.bubbles as Record<string, unknown> | null
      return {
        bubbleId: m.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleIcon: (bubble?.icon as string) ?? null,
        bubbleIconBgColor: (bubble?.icon_bg_color as string) ?? null,
        status: m.status as string,
      }
    })
  }

  async getRecordShares(recordId: string): Promise<BubbleShare[]> {
    const { data } = await this.supabase
      .from('bubble_shares')
      .select('*')
      .eq('record_id', recordId)
    return (data ?? []) as unknown as BubbleShare[]
  }

  async shareRecord(recordId: string, bubbleId: string, userId: string): Promise<BubbleShare> {
    return this.addShare(recordId, bubbleId, userId)
  }

  async unshareRecord(recordId: string, bubbleId: string): Promise<void> {
    await this.supabase
      .from('bubble_shares')
      .delete()
      .eq('record_id', recordId)
      .eq('bubble_id', bubbleId)
  }
}
