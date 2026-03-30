import { createClient } from '@/infrastructure/supabase/client'
import type { ReactionRepository } from '@/domain/repositories/reaction-repository'
import type { Reaction, ReactionType } from '@/domain/entities/reaction'

export class SupabaseReactionRepository implements ReactionRepository {
  private get supabase() { return createClient() }

  async getByTarget(targetType: string, targetId: string): Promise<Reaction[]> {
    const { data } = await this.supabase
      .from('reactions')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
    return (data ?? []).map(mapReaction)
  }

  async toggle(
    targetType: string,
    targetId: string,
    reactionType: ReactionType,
    userId: string,
  ): Promise<{ added: boolean }> {
    // ON CONFLICT (target_type, target_id, reaction_type, user_id) 활용
    const { data: existing } = await this.supabase
      .from('reactions')
      .select('id')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('reaction_type', reactionType)
      .eq('user_id', userId)
      .single()

    if (existing) {
      await this.supabase.from('reactions').delete().eq('id', existing.id)
      return { added: false }
    }

    const { error } = await this.supabase
      .from('reactions')
      .upsert(
        {
          target_type: targetType,
          target_id: targetId,
          reaction_type: reactionType,
          user_id: userId,
        },
        { onConflict: 'target_type,target_id,reaction_type,user_id' },
      )
    if (error) throw new Error(`리액션 토글 실패: ${error.message}`)
    return { added: true }
  }

  async getUserReactions(userId: string, targetType: string, targetIds: string[]): Promise<Reaction[]> {
    if (targetIds.length === 0) return []
    const { data } = await this.supabase
      .from('reactions')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .in('target_id', targetIds)
    return (data ?? []).map(mapReaction)
  }

  async getDailySocialXpCount(userId: string, date: string): Promise<number> {
    const { count } = await this.supabase
      .from('xp_log_changes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reason', 'social_like')
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59.999`)
    return count ?? 0
  }

  async getCountsByTarget(targetType: string, targetId: string): Promise<Record<ReactionType, number>> {
    const { data } = await this.supabase
      .from('reactions')
      .select('reaction_type')
      .eq('target_type', targetType)
      .eq('target_id', targetId)

    const counts: Record<string, number> = { like: 0, bookmark: 0, want: 0, check: 0, fire: 0 }
    for (const row of data ?? []) {
      const rt = row.reaction_type as string
      if (rt in counts) counts[rt]++
    }
    return counts as Record<ReactionType, number>
  }
}

function mapReaction(r: Record<string, unknown>): Reaction {
  return {
    id: r.id as string,
    targetType: r.target_type as 'record' | 'comment',
    targetId: r.target_id as string,
    reactionType: r.reaction_type as ReactionType,
    userId: r.user_id as string | null,
    createdAt: r.created_at as string,
  }
}
