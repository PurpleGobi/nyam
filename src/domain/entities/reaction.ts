// src/domain/entities/reaction.ts
// R1: 외부 의존 0

export type ReactionTargetType = 'record' | 'comment'

export type ReactionType = 'good' | 'bad'

export interface Reaction {
  id: string
  targetType: ReactionTargetType
  targetId: string
  reactionType: ReactionType
  userId: string | null
  createdAt: string
}

export const REACTION_CONFIG: Record<ReactionType, { icon: string; label: string; color: string }> = {
  good: { icon: 'thumbs-up', label: '좋아요', color: 'var(--positive)' },
  bad: { icon: 'thumbs-down', label: '별로예요', color: 'var(--negative)' },
}
