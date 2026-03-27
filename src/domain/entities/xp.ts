// src/domain/entities/xp.ts
// R1: 외부 의존 0

export type AxisType = 'category' | 'area' | 'genre' | 'wine_variety' | 'wine_region'

export type XpReason =
  | 'record_name' | 'record_score' | 'record_photo' | 'record_full'
  | 'category' | 'social_share' | 'social_like' | 'social_follow' | 'social_mutual'
  | 'bonus_onboard' | 'bonus_first_record' | 'bonus_first_bubble' | 'bonus_first_share'
  | 'milestone' | 'revisit'

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
  axisType: string | null
  axisValue: string | null
  xpAmount: number | null
  reason: XpReason | null
  createdAt: string
}

export interface LevelThreshold {
  level: number
  requiredXp: number
  title: string | null
  color: string | null
}

export interface Milestone {
  id: string
  axisType: AxisType | 'global'
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
