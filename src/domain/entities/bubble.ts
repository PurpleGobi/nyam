// src/domain/entities/bubble.ts
// R1: 외부 의존 0

export type BubbleVisibility = 'private' | 'public'
export type BubbleContentVisibility = 'rating_only' | 'rating_and_comment'
export type BubbleJoinPolicy = 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
export type BubbleFocusType = 'all' | 'restaurant' | 'wine'
export type BubbleMemberRole = 'owner' | 'admin' | 'member' | 'follower'
export type BubbleMemberStatus = 'pending' | 'active' | 'rejected'
export type BubbleShareRuleMode = 'all' | 'filtered'

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
  uniqueTargetCount: number
  weeklyRecordCount: number
  prevWeeklyRecordCount: number
  icon: string | null
  iconBgColor: string | null
  createdBy: string | null
  /** 오너 닉네임 (users 테이블 조인 결과, null이면 오너 없음 또는 조회 안 됨) */
  ownerNickname: string | null
  /** 오너 핸들 (optional, @prefix 없이 원본) */
  ownerHandle: string | null
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

/** 버블 멤버별 자동 공유 규칙 — 홈 FilterRule 재사용 */
export interface BubbleShareRule {
  mode: BubbleShareRuleMode
  rules: Array<{
    conjunction?: 'and' | 'or'
    attribute: string
    operator: string
    value: string | number | boolean | null
    /** focusType='all' 시 식당/와인 규칙 구분 */
    domain?: 'restaurant' | 'wine'
  }>
  conjunction: 'and' | 'or'
  /** 도메인별 공유 ON/OFF. 미지정 시 모두 true (하위호환) */
  enabledDomains?: { restaurant: boolean; wine: boolean }
}

/** 가시성 오버라이드 7개 키 (users.visibility_bubble과 동일 구조) */
export interface VisibilityOverride {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}

export interface BubbleMember {
  bubbleId: string
  userId: string
  role: BubbleMemberRole
  status: BubbleMemberStatus
  shareRule: BubbleShareRule | null
  visibilityOverride: VisibilityOverride | null
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
  targetId: string
  targetType: 'restaurant' | 'wine'
}

// ─── 버블 큐레이션 아이템 (bubble_items 테이블) ───

export type BubbleItemSource = 'auto' | 'manual'

export interface BubbleItem {
  id: string
  bubbleId: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  addedBy: string
  source: BubbleItemSource
  recordId: string | null
  addedAt: string
}

// ─── 랭킹 스냅샷 (bubble_ranking_snapshots 테이블) ───

export type RankingTargetType = 'restaurant' | 'wine'

export interface BubbleRankingSnapshot {
  bubbleId: string
  targetId: string
  targetType: RankingTargetType
  periodStart: string
  rankPosition: number
  avgSatisfaction: number | null
  recordCount: number
}

// ─── 버블 전문성 집계 (bubble_expertise 뷰) ───

export type ExpertiseAxisType = 'area' | 'genre' | 'wine_variety' | 'wine_region'

export interface BubbleExpertise {
  axisType: ExpertiseAxisType
  axisValue: string
  memberCount: number
  avgLevel: number
  maxLevel: number
}
