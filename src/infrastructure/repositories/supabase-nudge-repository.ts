import type { NudgeRepository, NudgeFatigue } from '@/domain/repositories/nudge-repository'
import type { NudgeDisplay } from '@/domain/entities/nudge'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseNudgeRepository implements NudgeRepository {
  private get supabase() {
    return createClient()
  }

  async getActiveNudge(userId: string): Promise<NudgeDisplay[]> {
    const { data, error } = await this.supabase
      .from('nudge_history')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) throw new Error(`넛지 조회 실패: ${error.message}`)

    return (data ?? []).map((row) => ({
      type: row.nudge_type,
      icon: row.icon ?? '',
      title: row.title ?? '',
      subtitle: row.subtitle ?? '',
      actionLabel: row.action_label ?? '',
      actionHref: row.action_href ?? '',
    }))
  }

  async markAsActed(nudgeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({ is_active: false, acted_at: new Date().toISOString() })
      .eq('id', nudgeId)

    if (error) throw new Error(`넛지 액션 처리 실패: ${error.message}`)
  }

  async dismiss(nudgeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('nudge_history')
      .update({ is_active: false, dismissed_at: new Date().toISOString() })
      .eq('id', nudgeId)

    if (error) throw new Error(`넛지 닫기 실패: ${error.message}`)
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
      dismissCount: data.dismiss_count,
      lastDismissedAt: data.last_dismissed_at,
    }
  }
}
