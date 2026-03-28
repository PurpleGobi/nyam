// src/domain/repositories/xp-repository.ts
// R1: 외부 의존 0

import type {
  UserExperience, XpHistory, LevelThreshold, Milestone,
  UserMilestone, AxisType, DailySocialCounts, BonusType,
} from '@/domain/entities/xp'

export interface XpRepository {
  // ── 경험치 조회 ──
  getUserExperiences(userId: string): Promise<UserExperience[]>
  getUserExperiencesByAxisType(userId: string, axisType: AxisType): Promise<UserExperience[]>
  getUserExperience(userId: string, axisType: AxisType, axisValue: string): Promise<UserExperience | null>

  // ── 경험치 갱신 ──
  upsertUserExperience(userId: string, axisType: AxisType, axisValue: string, xpDelta: number, newLevel: number): Promise<UserExperience>
  updateUserTotalXp(userId: string, xpDelta: number): Promise<void>

  // ── XP 이력 ──
  getRecentXpHistories(userId: string, limit: number): Promise<XpHistory[]>
  getHistoriesByRecord(recordId: string): Promise<XpHistory[]>
  createXpHistory(history: Omit<XpHistory, 'id' | 'createdAt'>): Promise<XpHistory>

  // ── 레벨 테이블 ──
  getLevelThresholds(): Promise<LevelThreshold[]>

  // ── 마일스톤 ──
  getMilestonesByAxisType(axisType: string): Promise<Milestone[]>
  getNextMilestone(axisType: string, metric: string, currentCount: number): Promise<Milestone | null>
  getUserMilestones(userId: string): Promise<UserMilestone[]>
  hasAchievedMilestone(userId: string, milestoneId: string, axisValue: string): Promise<boolean>
  createUserMilestone(userId: string, milestoneId: string, axisValue: string): Promise<UserMilestone>

  // ── 어뷰징 방지 ──
  getDailySocialCounts(userId: string, date: string): Promise<DailySocialCounts>
  getDailyRecordCount(userId: string, date: string): Promise<number>
  getLastScoreDate(userId: string, targetId: string): Promise<string | null>

  // ── 보너스 ──
  hasBonusBeenGranted(userId: string, bonusType: BonusType): Promise<boolean>

  // ── 통계 조회 (프로필용) ──
  getUniqueCount(userId: string, axisType: AxisType, axisValue: string): Promise<number>
  getTotalRecordCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number>
  getRevisitCountByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<number>
  getXpBreakdownByAxis(userId: string, axisType: AxisType, axisValue: string): Promise<Record<string, number>>
}
