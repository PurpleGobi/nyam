import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleShare } from '@/domain/entities/bubble'

export class SupabaseBubbleRepository implements BubbleRepository {
  private get supabase() { return createClient() }

  async create(input: CreateBubbleInput): Promise<Bubble> {
    const { data, error } = await this.supabase.from('bubbles').insert({
      name: input.name, description: input.description ?? null,
      focus_type: input.focusType ?? 'all', visibility: input.visibility ?? 'private',
      join_policy: input.joinPolicy ?? 'invite_only',
      min_records: input.minRecords ?? 0, min_level: input.minLevel ?? 0,
      max_members: input.maxMembers ?? null, created_by: input.createdBy,
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
}
