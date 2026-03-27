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
  createdBy: string
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
}
