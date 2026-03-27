// src/domain/entities/settings.ts
// R1: 외부 의존 0

export interface VisibilityConfig {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}

export type PrivacyProfile = 'public' | 'bubble_only' | 'private'
export type PrivacyRecords = 'all' | 'shared_only'

export interface UserSettings {
  nickname: string
  bio: string | null
  avatarUrl: string | null
  privacyProfile: PrivacyProfile
  privacyRecords: PrivacyRecords
  visibilityPublic: VisibilityConfig
  visibilityBubble: VisibilityConfig
  notifyPush: boolean
  notifyLevelUp: boolean
  notifyBubbleJoin: boolean
  notifyFollow: boolean
  dndStart: string | null
  dndEnd: string | null
  prefLanding: string
  prefHomeTab: string
  prefDefaultSort: string
  prefRecordInput: string
  prefBubbleShare: string
  prefTempUnit: string
  prefViewMode: string
}
