// src/domain/repositories/bubble-repository.ts
// R1: 외부 의존 0

import type { Bubble, BubbleMember, BubbleShare } from '@/domain/entities/bubble'

export interface CreateBubbleInput {
  name: string
  description?: string
  focusType?: string
  visibility?: string
  joinPolicy?: string
  minRecords?: number
  minLevel?: number
  maxMembers?: number
  icon?: string
  iconBgColor?: string
  createdBy: string
}

export interface BubbleFeedItem {
  id: string
  recordId: string
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string
  sharedBy: string
  authorNickname?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  satisfaction?: number | null
  comment?: string | null
  visitDate?: string | null
  sharedAt: string
}

export interface BubbleShareForTarget extends BubbleFeedItem {}

export interface UserBubbleMembership {
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string | null
  bubbleIconBgColor?: string | null
  status: string
}

export interface MutualRecordItem {
  recordId: string
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
  findPublic(limit: number): Promise<Bubble[]>
  update(id: string, data: Partial<Bubble>): Promise<Bubble>
  delete(id: string): Promise<void>

  getMembers(bubbleId: string): Promise<BubbleMember[]>
  addMember(bubbleId: string, userId: string, role: string, status: string): Promise<BubbleMember>
  updateMember(bubbleId: string, userId: string, data: Partial<BubbleMember>): Promise<void>
  removeMember(bubbleId: string, userId: string): Promise<void>

  getShares(bubbleId: string, limit: number): Promise<BubbleShare[]>
  addShare(recordId: string, bubbleId: string, sharedBy: string): Promise<BubbleShare>
  removeShare(shareId: string): Promise<void>

  findByInviteCode(code: string): Promise<Bubble | null>
  generateInviteCode(bubbleId: string): Promise<string>

  // S8 추가 메서드
  getSharesForTarget(targetId: string, targetType: string, bubbleIds: string[]): Promise<BubbleShareForTarget[]>
  getFeedFromBubbles(userId: string): Promise<BubbleFeedItem[]>
  getRecentRecordsByUsers(userIds: string[]): Promise<MutualRecordItem[]>
  getUserBubbles(userId: string): Promise<UserBubbleMembership[]>
  getRecordShares(recordId: string): Promise<BubbleShare[]>
  shareRecord(recordId: string, bubbleId: string, userId: string): Promise<BubbleShare>
  unshareRecord(recordId: string, bubbleId: string): Promise<void>
}
