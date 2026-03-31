import type { XpRepository } from '@/domain/repositories/xp-repository'
import type {
  UserExperience, XpHistory, LevelThreshold, Milestone,
  UserMilestone, AxisType, DailySocialCounts, BonusType,
} from '@/domain/entities/xp'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseXpRepository implements XpRepository {
  private get supabase() {
    return createClient()
  }

  // ── 경험치 조회 ──

  async getUserExperiences(userId: string): Promise<UserExperience[]> {
    const { data, error } = await this.supabase
      .from('xp_totals')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(mapUserExperience)
  }

  async getUserExperiencesByAxisType(userId: string, axisType: AxisType): Promise<UserExperience[]> {
    const { data, error } = await this.supabase
      .from('xp_totals')
      .select('*')
      .eq('user_id', userId)
      .eq('axis_type', axisType)
    if (error) throw error
    return (data ?? []).map(mapUserExperience)
  }

  async getUserExperience(userId: string, axisType: AxisType, axisValue: string): Promise<UserExperience | null> {
    const { data, error } = await this.supabase
      .from('xp_totals')
      .select('*')
      .eq('user_id', userId)
      .eq('axis_type', axisType)
      .eq('axis_value', axisValue)
      .maybeSingle()
    if (error) throw error
    return data ? mapUserExperience(data) : null
  }

  // ── 종합 XP 조회 ──

  async getUserTotalXp(userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('users')
      .select('total_xp')
      .eq('id', userId)
      .single()
    if (error) throw error
    return (data?.total_xp as number) ?? 0
  }

  // ── 경험치 갱신 ──

  async upsertUserExperience(
    userId: string, axisType: AxisType, axisValue: string,
    xpDelta: number, newLevel: number,
  ): Promise<UserExperience> {
    const { data, error } = await this.supabase.rpc('upsert_user_experience', {
      p_user_id: userId,
      p_axis_type: axisType,
      p_axis_value: axisValue,
      p_xp_delta: xpDelta,
      p_new_level: newLevel,
    })
    if (error) throw error
    return mapUserExperience(data)
  }

  async updateUserTotalXp(userId: string, xpDelta: number): Promise<void> {
    const { error } = await this.supabase.rpc('increment_user_total_xp', {
      p_user_id: userId,
      p_xp_delta: xpDelta,
    })
    if (error) throw error
  }

  // ── XP 이력 ──

  async getRecentXpHistories(userId: string, limit: number): Promise<XpHistory[]> {
    const { data, error } = await this.supabase
      .from('xp_log_changes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(mapXpHistory)
  }

  async getHistoriesByRecord(recordId: string): Promise<XpHistory[]> {
    const { data, error } = await this.supabase
      .from('xp_log_changes')
      .select('*')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapXpHistory)
  }

  async createXpHistory(history: Omit<XpHistory, 'id' | 'createdAt'>): Promise<XpHistory> {
    const { data, error } = await this.supabase
      .from('xp_log_changes')
      .insert({
        user_id: history.userId,
        record_id: history.recordId,
        axis_type: history.axisType,
        axis_value: history.axisValue,
        xp_amount: history.xpAmount,
        reason: history.reason,
      })
      .select()
      .single()
    if (error) throw error
    return mapXpHistory(data)
  }

  async deleteByRecordId(recordId: string): Promise<void> {
    const { error } = await this.supabase
      .from('xp_log_changes')
      .delete()
      .eq('record_id', recordId)
    if (error) throw error
  }

  // ── 레벨 테이블 ──

  async getLevelThresholds(): Promise<LevelThreshold[]> {
    const { data, error } = await this.supabase
      .from('xp_seed_levels')
      .select('*')
      .order('level', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapLevelThreshold)
  }

  // ── 마일스톤 ──

  async getMilestonesByAxisType(axisType: string): Promise<Milestone[]> {
    const { data, error } = await this.supabase
      .from('xp_seed_milestones')
      .select('*')
      .eq('axis_type', axisType)
    if (error) throw error
    return (data ?? []).map(mapMilestone)
  }

  async getNextMilestone(axisType: string, metric: string, currentCount: number): Promise<Milestone | null> {
    const { data, error } = await this.supabase
      .from('xp_seed_milestones')
      .select('*')
      .eq('axis_type', axisType)
      .eq('metric', metric)
      .gt('threshold', currentCount)
      .order('threshold', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data ? mapMilestone(data) : null
  }

  async getUserMilestones(userId: string): Promise<UserMilestone[]> {
    const { data, error } = await this.supabase
      .from('xp_log_milestones')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map(mapUserMilestone)
  }

  async hasAchievedMilestone(userId: string, milestoneId: string, axisValue: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('xp_log_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('milestone_id', milestoneId)
      .eq('axis_value', axisValue)
    if (error) throw error
    return (count ?? 0) > 0
  }

  async createUserMilestone(userId: string, milestoneId: string, axisValue: string): Promise<UserMilestone> {
    const { data, error } = await this.supabase
      .from('xp_log_milestones')
      .insert({ user_id: userId, milestone_id: milestoneId, axis_value: axisValue })
      .select()
      .single()
    if (error) throw error
    return mapUserMilestone(data)
  }

  // ── 어뷰징 방지 ──

  async getDailySocialCounts(userId: string, date: string): Promise<DailySocialCounts> {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59Z`
    const { data, error } = await this.supabase
      .from('xp_log_changes')
      .select('reason, xp_amount')
      .eq('user_id', userId)
      .in('reason', ['social_share', 'social_like', 'social_follow', 'social_mutual'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
    if (error) throw error

    const counts: DailySocialCounts = { share: 0, like: 0, follow: 0, mutual: 0, total: 0 }
    for (const row of data ?? []) {
      const xp = (row.xp_amount as number) ?? 0
      if (row.reason === 'social_share') counts.share += xp
      else if (row.reason === 'social_like') counts.like += xp
      else if (row.reason === 'social_follow') counts.follow += xp
      else if (row.reason === 'social_mutual') counts.mutual += xp
      counts.total += xp
    }
    return counts
  }

  async getDailyRecordCount(userId: string, date: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00Z`)
      .lte('created_at', `${date}T23:59:59Z`)
    if (error) throw error
    return count ?? 0
  }

  async getLastScoreDate(userId: string, targetId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('records')
      .select('score_updated_at')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .not('score_updated_at', 'is', null)
      .order('score_updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data?.score_updated_at ?? null
  }

  // ── 보너스 ──

  async hasBonusBeenGranted(userId: string, bonusType: BonusType): Promise<boolean> {
    const reasonMap: Record<BonusType, string> = {
      onboard: 'bonus_onboard',
      first_record: 'bonus_first_record',
      first_bubble: 'bonus_first_bubble',
      first_share: 'bonus_first_share',
    }
    const { count, error } = await this.supabase
      .from('xp_log_changes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reason', reasonMap[bonusType])
    if (error) throw error
    return (count ?? 0) > 0
  }

  // ── 기록 XP 저장 ──

  async updateRecordQualityXp(recordId: string, xp: number): Promise<void> {
    const { error } = await this.supabase
      .from('records')
      .update({ record_quality_xp: xp })
      .eq('id', recordId)
    if (error) throw error
  }

  // ── 통계 조회 ──

  async getUniqueCount(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('get_unique_count', {
      p_user_id: userId, p_axis_type: axisType, p_axis_value: axisValue,
    })
    if (error) throw error
    return data ?? 0
  }

  async getTotalRecordCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    // 축 값에 해당하는 대상들의 records 수
    const targetIds = await this.getTargetIdsByAxis(userId, axisType, axisValue)
    if (targetIds.length === 0) return 0
    const { count, error } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('target_id', targetIds)
    if (error) throw error
    return count ?? 0
  }

  async getRevisitCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number> {
    // 같은 대상에 2건 이상 기록이 있는 대상 수 (재방문)
    const targetIds = await this.getTargetIdsByAxis(userId, axisType, axisValue)
    if (targetIds.length === 0) return 0
    const { data, error } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .in('target_id', targetIds)
    if (error) throw error
    const counts = new Map<string, number>()
    for (const r of data ?? []) {
      counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1)
    }
    return Array.from(counts.values()).filter((c) => c >= 2).length
  }

  private async getTargetIdsByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<string[]> {
    // axisType에 따라 restaurants/wines 테이블에서 해당 축 값의 target_id 조회
    const targetType = ['area', 'genre'].includes(axisType) ? 'restaurant' : 'wine'
    const columnMap: Record<string, string> = {
      area: 'district', genre: 'genre', wine_region: 'region', wine_variety: 'variety',
    }
    const column = columnMap[axisType]
    if (!column) return []

    const table = targetType === 'restaurant' ? 'restaurants' : 'wines'
    const { data: targets } = await this.supabase
      .from(table)
      .select('id')
      .eq(column, axisValue)
    const targetIds = (targets ?? []).map((t) => t.id)
    if (targetIds.length === 0) return []

    // 이 사용자가 실제로 기록한 대상만 필터
    const { data: records } = await this.supabase
      .from('records')
      .select('target_id')
      .eq('user_id', userId)
      .in('target_id', targetIds)
    return [...new Set((records ?? []).map((r) => r.target_id))]
  }

  async getXpBreakdownByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('xp_log_changes')
      .select('reason, xp_amount')
      .eq('user_id', userId)
      .eq('axis_type', axisType)
      .eq('axis_value', axisValue)
    if (error) throw error

    const breakdown: Record<string, number> = {}
    for (const row of data ?? []) {
      const key = (row.reason as string) ?? 'unknown'
      breakdown[key] = (breakdown[key] ?? 0) + ((row.xp_amount as number) ?? 0)
    }
    return breakdown
  }
}

// ── 매퍼 ──

function mapUserExperience(row: Record<string, unknown>): UserExperience {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    axisType: row.axis_type as AxisType,
    axisValue: row.axis_value as string,
    totalXp: row.total_xp as number,
    level: row.level as number,
    updatedAt: row.updated_at as string,
  }
}

function mapXpHistory(row: Record<string, unknown>): XpHistory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    recordId: (row.record_id as string) ?? null,
    axisType: (row.axis_type as AxisType) ?? null,
    axisValue: (row.axis_value as string) ?? null,
    xpAmount: row.xp_amount as number,
    reason: row.reason as XpHistory['reason'],
    createdAt: row.created_at as string,
  }
}

function mapLevelThreshold(row: Record<string, unknown>): LevelThreshold {
  return {
    level: row.level as number,
    requiredXp: row.required_xp as number,
    title: row.title as string,
    color: row.color as string,
  }
}

function mapMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    axisType: row.axis_type as string,
    metric: row.metric as string,
    threshold: row.threshold as number,
    xpReward: row.xp_reward as number,
    label: row.label as string,
  }
}

function mapUserMilestone(row: Record<string, unknown>): UserMilestone {
  return {
    userId: row.user_id as string,
    milestoneId: row.milestone_id as string,
    axisValue: row.axis_value as string,
    achievedAt: row.achieved_at as string,
  }
}
