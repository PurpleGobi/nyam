// src/domain/repositories/reaction-repository.ts
// R1: 외부 의존 0

import type { Reaction, ReactionType } from '@/domain/entities/reaction'

export interface ReactionRepository {
  getByTarget(targetType: string, targetId: string): Promise<Reaction[]>
  toggle(targetType: string, targetId: string, reactionType: ReactionType, userId: string): Promise<{ added: boolean }>
  getCountsByTarget(targetType: string, targetId: string): Promise<Record<ReactionType, number>>
  getUserReactions(userId: string, targetType: string, targetIds: string[]): Promise<Reaction[]>
  getCountsByTargetIds(targetType: string, targetIds: string[]): Promise<Map<string, Record<ReactionType, number>>>
  getDailySocialXpCount(userId: string, date: string): Promise<number>
}
