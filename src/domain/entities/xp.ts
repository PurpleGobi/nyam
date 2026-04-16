// src/domain/entities/xp.ts
// R1: 외부 의존 0

export type AxisType = 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'

export type CategoryValue = 'restaurant' | 'wine'

export type XpReason =
  | 'record_name' | 'record_score' | 'record_photo' | 'record_full'
  | 'detail_axis' | 'category'
  | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual'
  | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share'
  | 'milestone' | 'revisit'

export type SocialAction = 'share' | 'good' | 'follow' | 'mutual'

export type BonusType = 'onboard' | 'first_record' | 'first_bubble' | 'first_share'

export interface UserExperience {
  id: string
  userId: string
  axisType: AxisType
  axisValue: string
  totalXp: number
  level: number
  updatedAt: string
}

export interface XpHistory {
  id: string
  userId: string
  recordId: string | null
  axisType: AxisType | null
  axisValue: string | null
  xpAmount: number
  reason: XpReason
  createdAt: string
}

export interface LevelThreshold {
  level: number
  requiredXp: number
  title: string
  color: string
}

export interface Milestone {
  id: string
  axisType: string
  metric: string
  threshold: number
  xpReward: number
  label: string
}

export interface UserMilestone {
  userId: string
  milestoneId: string
  axisValue: string
  achievedAt: string
}

export interface LevelInfo {
  level: number
  title: string
  color: string
  currentXp: number
  nextLevelXp: number
  progress: number
}

/** XP 계산 결과 (서비스에서 반환) */
export interface XpCalculationResult {
  totalXpGain: number
  detailAxisGains: DetailAxisGain[]
  categoryUpdates: CategoryUpdate[]
  milestoneAchieved: MilestoneAchievement[]
  levelUps: LevelUpEvent[]
}

export interface DetailAxisGain {
  axisType: AxisType
  axisValue: string
  xp: number
}

export interface CategoryUpdate {
  categoryValue: CategoryValue
  newTotalXp: number
}

export interface MilestoneAchievement {
  milestone: Milestone
  axisValue: string
}

export interface LevelUpEvent {
  scope: 'total' | 'category' | 'detail'
  axisType?: AxisType
  axisValue?: string
  previousLevel: number
  newLevel: number
  title: string
  color: string
}

/** 소셜 XP 일일 카운트 (어뷰징 방지용) */
export interface DailySocialCounts {
  share: number
  good: number
  follow: number
  mutual: number
  total: number
}
