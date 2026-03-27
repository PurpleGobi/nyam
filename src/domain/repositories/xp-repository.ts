// src/domain/repositories/xp-repository.ts
// R1: 외부 의존 0

import type { UserExperience, XpHistory, LevelThreshold, Milestone, UserMilestone, XpReason } from '@/domain/entities/xp'

export interface XpRepository {
  getExperiences(userId: string): Promise<UserExperience[]>
  getHistoriesByRecord(recordId: string): Promise<XpHistory[]>
  getRecentHistories(userId: string, limit: number): Promise<XpHistory[]>
  getLevelThresholds(): Promise<LevelThreshold[]>
  getMilestones(): Promise<Milestone[]>
  getUserMilestones(userId: string): Promise<UserMilestone[]>

  addXpHistory(params: {
    userId: string
    recordId?: string
    axisType?: string
    axisValue?: string
    xpAmount: number
    reason: XpReason
  }): Promise<XpHistory>

  upsertExperience(params: {
    userId: string
    axisType: string
    axisValue: string
    xpDelta: number
  }): Promise<UserExperience>

  updateUserTotalXp(userId: string, xpDelta: number): Promise<void>
  achieveMilestone(userId: string, milestoneId: string, axisValue: string): Promise<void>
  getTodayRecordCount(userId: string): Promise<number>
}
