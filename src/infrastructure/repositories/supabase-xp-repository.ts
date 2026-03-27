import { createClient } from '@/infrastructure/supabase/client'
import type { XpRepository } from '@/domain/repositories/xp-repository'
import type { UserExperience, XpHistory, LevelThreshold, Milestone, UserMilestone, XpReason } from '@/domain/entities/xp'

export class SupabaseXpRepository implements XpRepository {
  private get supabase() {
    return createClient()
  }

  async getExperiences(userId: string): Promise<UserExperience[]> {
    const { data, error } = await this.supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId)

    if (error) throw new Error(`XP experiences 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => ({
      id: r.id, userId: r.user_id, axisType: r.axis_type as UserExperience['axisType'],
      axisValue: r.axis_value, totalXp: r.total_xp, level: r.level, updatedAt: r.updated_at,
    }))
  }

  async getHistoriesByRecord(recordId: string): Promise<XpHistory[]> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`XP histories 조회 실패: ${error.message}`)
    return (data ?? []).map(mapHistory)
  }

  async getRecentHistories(userId: string, limit: number): Promise<XpHistory[]> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`XP recent histories 조회 실패: ${error.message}`)
    return (data ?? []).map(mapHistory)
  }

  async getLevelThresholds(): Promise<LevelThreshold[]> {
    const { data, error } = await this.supabase
      .from('level_thresholds')
      .select('*')
      .order('level', { ascending: true })

    if (error) throw new Error(`Level thresholds 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => ({
      level: r.level, requiredXp: r.required_xp, title: r.title, color: r.color,
    }))
  }

  async getMilestones(): Promise<Milestone[]> {
    const { data, error } = await this.supabase.from('milestones').select('*')
    if (error) throw new Error(`Milestones 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => ({
      id: r.id, axisType: r.axis_type as Milestone['axisType'],
      metric: r.metric, threshold: r.threshold, xpReward: r.xp_reward, label: r.label,
    }))
  }

  async getUserMilestones(userId: string): Promise<UserMilestone[]> {
    const { data, error } = await this.supabase
      .from('user_milestones')
      .select('*')
      .eq('user_id', userId)

    if (error) throw new Error(`User milestones 조회 실패: ${error.message}`)
    return (data ?? []).map((r) => ({
      userId: r.user_id, milestoneId: r.milestone_id,
      axisValue: r.axis_value, achievedAt: r.achieved_at,
    }))
  }

  async addXpHistory(params: {
    userId: string; recordId?: string; axisType?: string; axisValue?: string; xpAmount: number; reason: XpReason
  }): Promise<XpHistory> {
    const { data, error } = await this.supabase
      .from('xp_histories')
      .insert({
        user_id: params.userId,
        record_id: params.recordId ?? null,
        axis_type: params.axisType ?? null,
        axis_value: params.axisValue ?? null,
        xp_amount: params.xpAmount,
        reason: params.reason,
      })
      .select()
      .single()

    if (error) throw new Error(`XP history INSERT 실패: ${error.message}`)
    return mapHistory(data)
  }

  async upsertExperience(params: {
    userId: string; axisType: string; axisValue: string; xpDelta: number
  }): Promise<UserExperience> {
    const { data: existing } = await this.supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', params.userId)
      .eq('axis_type', params.axisType)
      .eq('axis_value', params.axisValue)
      .single()

    if (existing) {
      const { data, error } = await this.supabase
        .from('user_experiences')
        .update({ total_xp: existing.total_xp + params.xpDelta, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(`Experience UPDATE 실패: ${error.message}`)
      return mapExperience(data)
    }

    const { data, error } = await this.supabase
      .from('user_experiences')
      .insert({
        user_id: params.userId,
        axis_type: params.axisType,
        axis_value: params.axisValue,
        total_xp: params.xpDelta,
        level: 1,
      })
      .select()
      .single()
    if (error) throw new Error(`Experience INSERT 실패: ${error.message}`)
    return mapExperience(data)
  }

  async updateUserTotalXp(userId: string, xpDelta: number): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('total_xp')
      .eq('id', userId)
      .single()

    if (!user) throw new Error('User not found')

    const { error } = await this.supabase
      .from('users')
      .update({ total_xp: user.total_xp + xpDelta })
      .eq('id', userId)

    if (error) throw new Error(`User total_xp UPDATE 실패: ${error.message}`)
  }

  async achieveMilestone(userId: string, milestoneId: string, axisValue: string): Promise<void> {
    await this.supabase
      .from('user_milestones')
      .insert({ user_id: userId, milestone_id: milestoneId, axis_value: axisValue })
  }

  async getTodayRecordCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const { count, error } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)

    if (error) return 0
    return count ?? 0
  }
}

function mapHistory(r: Record<string, unknown>): XpHistory {
  return {
    id: r.id as string, userId: r.user_id as string, recordId: r.record_id as string | null,
    axisType: r.axis_type as string | null, axisValue: r.axis_value as string | null,
    xpAmount: r.xp_amount as number | null, reason: r.reason as XpHistory['reason'],
    createdAt: r.created_at as string,
  }
}

function mapExperience(r: Record<string, unknown>): UserExperience {
  return {
    id: r.id as string, userId: r.user_id as string,
    axisType: r.axis_type as UserExperience['axisType'], axisValue: r.axis_value as string,
    totalXp: r.total_xp as number, level: r.level as number, updatedAt: r.updated_at as string,
  }
}
