import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput, BubbleFeedItem, BubbleShareForTarget, UserBubbleMembership, MutualRecordItem } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleShare } from '@/domain/entities/bubble'

export class SupabaseBubbleRepository implements BubbleRepository {
  private get supabase() { return createClient() }

  async create(input: CreateBubbleInput): Promise<Bubble> {
    const { data, error } = await this.supabase.from('bubbles').insert({
      name: input.name, description: input.description ?? null,
      focus_type: input.focusType ?? 'all', visibility: input.visibility ?? 'private',
      join_policy: input.joinPolicy ?? 'invite_only',
      min_records: input.minRecords ?? 0, min_level: input.minLevel ?? 0,
      max_members: input.maxMembers ?? null,
      icon: input.icon ?? null, icon_bg_color: input.iconBgColor ?? null,
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

  async findPublic(limit: number): Promise<Bubble[]> {
    const { data } = await this.supabase.from('bubbles').select('*').eq('visibility', 'public').eq('is_searchable', true).limit(limit)
    return (data ?? []) as unknown as Bubble[]
  }

  async update(id: string, updates: Partial<Bubble>): Promise<Bubble> {
    const { data, error } = await this.supabase.from('bubbles').update({ ...updates, updated_at: new Date().toISOString() } as Record<string, unknown>).eq('id', id).select().single()
    if (error) throw new Error(`Bubble 수정 실패: ${error.message}`)
    return data as unknown as Bubble
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('bubbles').delete().eq('id', id)
    if (error) throw new Error(`Bubble 삭제 실패: ${error.message}`)
  }

  async getMembers(bubbleId: string): Promise<BubbleMember[]> {
    const { data } = await this.supabase.from('bubble_members').select('*').eq('bubble_id', bubbleId)
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

  async getShares(bubbleId: string, limit: number): Promise<BubbleShare[]> {
    const { data } = await this.supabase.from('bubble_shares').select('*').eq('bubble_id', bubbleId).order('shared_at', { ascending: false }).limit(limit)
    return (data ?? []) as unknown as BubbleShare[]
  }

  async addShare(recordId: string, bubbleId: string, sharedBy: string): Promise<BubbleShare> {
    const { data, error } = await this.supabase.from('bubble_shares').insert({ record_id: recordId, bubble_id: bubbleId, shared_by: sharedBy }).select().single()
    if (error) throw new Error(`공유 실패: ${error.message}`)
    return data as unknown as BubbleShare
  }

  async removeShare(shareId: string): Promise<void> {
    await this.supabase.from('bubble_shares').delete().eq('id', shareId)
  }

  async findByInviteCode(code: string): Promise<Bubble | null> {
    const { data } = await this.supabase.from('bubbles').select('*').eq('invite_code', code).single()
    return data as unknown as Bubble | null
  }

  async generateInviteCode(bubbleId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    await this.supabase.from('bubbles').update({ invite_code: code, invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', bubbleId)
    return code
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
