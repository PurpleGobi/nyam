// src/domain/repositories/reaction-repository.ts
// R1: 외부 의존 0

import type { Reaction, ReactionType } from '@/domain/entities/reaction'

export interface ReactionRepository {
  getByTarget(targetType: string, targetId: string): Promise<Reaction[]>
  toggle(targetType: string, targetId: string, reactionType: ReactionType, userId: string): Promise<{ added: boolean }>
  getCountsByTarget(targetType: string, targetId: string): Promise<Record<ReactionType, number>>
}
