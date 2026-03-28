// src/domain/entities/bubble.ts
// R1: 외부 의존 0

export type BubbleVisibility = 'private' | 'public'
export type BubbleContentVisibility = 'rating_only' | 'rating_and_comment'
export type BubbleJoinPolicy = 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
export type BubbleFocusType = 'all' | 'restaurant' | 'wine'
export type BubbleMemberRole = 'owner' | 'admin' | 'member' | 'follower'
export type BubbleMemberStatus = 'pending' | 'active' | 'rejected'

export interface Bubble {
  id: string
  name: string
  description: string | null
  focusType: BubbleFocusType
  area: string | null
  visibility: BubbleVisibility
  contentVisibility: BubbleContentVisibility
  allowComments: boolean
  allowExternalShare: boolean
  joinPolicy: BubbleJoinPolicy
  minRecords: number
  minLevel: number
  maxMembers: number | null
  rules: string[] | null
  isSearchable: boolean
  searchKeywords: string[] | null
  followerCount: number
  memberCount: number
  recordCount: number
  avgSatisfaction: number | null
  lastActivityAt: string | null
  icon: string | null
  iconBgColor: string | null
  createdBy: string | null
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BubbleMember {
  bubbleId: string
  userId: string
  role: BubbleMemberRole
  status: BubbleMemberStatus
  visibilityOverride: Record<string, boolean> | null
  tasteMatchPct: number | null
  commonTargetCount: number
  avgSatisfaction: number | null
  memberUniqueTargetCount: number
  weeklyShareCount: number
  badgeLabel: string | null
  joinedAt: string
}

export interface BubbleShare {
  id: string
  recordId: string
  bubbleId: string
  sharedBy: string
  sharedAt: string
}
