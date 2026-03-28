import type { NudgeRepository } from '@/domain/repositories/nudge-repository'
import type { Nudge, NudgeFatigue } from '@/domain/entities/nudge'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseNudgeRepository implements NudgeRepository {
  private get supabase() {
    return createClient()
  }

  async getRecentHistory(userId: string, hours: number): Promise<Nudge[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await this.supabase
      .from('nudge_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`넛지 이력 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      nudgeType: row.nudge_type,
      targetId: row.target_id ?? null,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async getFatigue(userId: string): Promise<NudgeFatigue | null> {
    const { data, error } = await this.supabase
      .from('nudge_fatigue')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`넛지 피로도 조회 실패: ${error.message}`)
    }

    return {
      userId: data.user_id,
      score: data.score,
      lastNudgeAt: data.last_nudge_at ?? null,
      pausedUntil: data.paused_until ?? null,
    }
  }

  async createNudge(nudge: Omit<Nudge, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .insert({
        user_id: nudge.userId,
        nudge_type: nudge.nudgeType,
        target_id: nudge.targetId,
        status: nudge.status,
      })

    if (error) throw new Error(`넛지 생성 실패: ${error.message}`)
  }

  async updateStatus(id: string, status: Nudge['status']): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({ status })
      .eq('id', id)

    if (error) throw new Error(`넛지 상태 업데이트 실패: ${error.message}`)
  }

  async incrementFatigue(userId: string): Promise<void> {
    const existing = await this.getFatigue(userId)

    if (existing) {
      const { error } = await this.supabase
        .from('nudge_fatigue')
        .update({
          score: existing.score + 1,
          last_nudge_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) throw new Error(`넛지 피로도 증가 실패: ${error.message}`)
    } else {
      const { error } = await this.supabase
        .from('nudge_fatigue')
        .insert({
          user_id: userId,
          score: 1,
          last_nudge_at: new Date().toISOString(),
        })

      if (error) throw new Error(`넛지 피로도 생성 실패: ${error.message}`)
    }
  }
}
