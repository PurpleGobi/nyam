// src/domain/repositories/bubble-repository.ts
// R1: 외부 의존 0

import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleRankingSnapshot, BubbleShareRule } from '@/domain/entities/bubble'

export interface CreateBubbleInput {
  name: string
  description?: string
  focusType?: string
  area?: string
  visibility?: string
  contentVisibility?: string
  allowComments?: boolean
  allowExternalShare?: boolean
  joinPolicy?: string
  minRecords?: number
  minLevel?: number
  maxMembers?: number
  rules?: string[]
  isSearchable?: boolean
  searchKeywords?: string[]
  icon?: string
  iconBgColor?: string
  createdBy: string
}

export interface BubbleFeedItem {
  id: string
  recordId: string
  targetId?: string
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string
  sharedBy: string
  authorNickname?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  targetMeta?: string | null
  targetArea?: string | null
  targetPhotoUrl?: string | null
  /** 와인 전용 메타 */
  targetVintage?: number | null
  targetWineType?: string | null
  targetProducer?: string | null
  targetCountry?: string | null
  satisfaction?: number | null
  axisX?: number | null
  axisY?: number | null
  comment?: string | null
  scene?: string | null
  visitDate?: string | null
  listStatus?: string | null
  sharedAt: string
}

export interface BubbleShareForTarget extends BubbleFeedItem {
  contentVisibility?: 'rating_only' | 'rating_and_comment'
  authorLevel?: number
  authorLevelTitle?: string
  likeCount?: number
  commentCount?: number
}

export interface UserBubbleMembership {
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string | null
  bubbleIconBgColor?: string | null
  status: string
  shareRule: BubbleShareRule | null
}

export interface MutualRecordItem {
  recordId: string
  targetId?: string
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  satisfaction?: number | null
  comment?: string | null
  visitDate?: string | null
  authorNickname?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  createdAt: string
}

export interface BubbleRepository {
  create(input: CreateBubbleInput): Promise<Bubble>
  findById(id: string): Promise<Bubble | null>
  findByUserId(userId: string): Promise<Bubble[]>
  findPublic(options?: {
    search?: string
    focusType?: string
    area?: string
    sortBy?: 'latest' | 'members' | 'records' | 'activity'
    limit?: number
    offset?: number
  }): Promise<{ data: Bubble[]; total: number }>
  update(id: string, data: Partial<Bubble>): Promise<Bubble>
  delete(id: string): Promise<void>

  getMembers(bubbleId: string, options?: {
    role?: BubbleMemberRole
    status?: BubbleMemberStatus
    sortBy?: 'taste_match' | 'records' | 'level' | 'recent'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleMember[]; total: number }>
  getMember(bubbleId: string, userId: string): Promise<BubbleMember | null>
  getPendingMembers(bubbleId: string): Promise<BubbleMember[]>
  addMember(bubbleId: string, userId: string, role: string, status: string): Promise<BubbleMember>
  updateMember(bubbleId: string, userId: string, data: Partial<BubbleMember>): Promise<void>
  removeMember(bubbleId: string, userId: string): Promise<void>

  getShares(bubbleId: string, options?: {
    targetType?: 'restaurant' | 'wine'
    sharedBy?: string
    period?: 'week' | 'month' | '3months' | 'all'
    minSatisfaction?: number
    sortBy?: 'newest' | 'reactions' | 'score' | 'member'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleShare[]; total: number }>
  getEnrichedShares(bubbleId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleFeedItem[]; total: number }>
  addShare(recordId: string, bubbleId: string, sharedBy: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare>
  removeShare(shareId: string): Promise<void>

  getRankings(bubbleId: string, options: {
    targetType: 'restaurant' | 'wine'
    periodStart?: string
    limit?: number
  }): Promise<BubbleRankingSnapshot[]>
  getPreviousRankings(bubbleId: string, targetType: 'restaurant' | 'wine', periodStart: string): Promise<BubbleRankingSnapshot[]>
  insertRankingSnapshots(snapshots: BubbleRankingSnapshot[]): Promise<void>

  findByInviteCode(code: string): Promise<Bubble | null>
  generateInviteCode(bubbleId: string, expiresAt?: string | null): Promise<string>

  validateInviteCode(code: string): Promise<{ valid: boolean; bubble: Bubble | null; expired: boolean }>

  // S8 추가 메서드
  getSharesForTarget(targetId: string, targetType: string, bubbleIds: string[]): Promise<BubbleShareForTarget[]>
  getFeedFromBubbles(userId: string, targetType?: 'restaurant' | 'wine'): Promise<BubbleFeedItem[]>
  getRecentRecordsByUsers(userIds: string[], targetType?: 'restaurant' | 'wine'): Promise<MutualRecordItem[]>
  getUserBubbles(userId: string): Promise<UserBubbleMembership[]>
  getRecordShares(recordId: string): Promise<BubbleShare[]>
  shareRecord(recordId: string, bubbleId: string, userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare>
  unshareRecord(recordId: string, bubbleId: string): Promise<void>

  // 자동 공유 동기화
  updateShareRule(bubbleId: string, userId: string, shareRule: BubbleShareRule | null): Promise<void>
  batchUpsertAutoShares(records: Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' }>, bubbleId: string, userId: string): Promise<void>
  batchDeleteAutoShares(recordIds: string[], bubbleId: string, userId: string): Promise<void>
  getAutoSharedRecordIds(bubbleId: string, userId: string): Promise<string[]>
  cleanManualShares(userId: string): Promise<number>
}
