// src/domain/entities/reaction.ts
// R1: 외부 의존 0

export type ReactionTargetType = 'record' | 'comment'

export type ReactionType = 'like' | 'bookmark' | 'want' | 'check' | 'fire'

export interface Reaction {
  id: string
  targetType: ReactionTargetType
  targetId: string
  reactionType: ReactionType
  userId: string | null
  createdAt: string
}

export const REACTION_CONFIG: Record<ReactionType, { icon: string; label: string; color: string }> = {
  want: { icon: 'bookmark-plus', label: '가고싶다', color: 'var(--accent-food)' },
  check: { icon: 'check-circle-2', label: '다녀왔다', color: 'var(--positive)' },
  fire: { icon: 'flame', label: '불꽃', color: '#E55A35' },
  like: { icon: 'heart', label: '좋아요', color: 'var(--negative)' },
  bookmark: { icon: 'bookmark', label: '저장', color: 'var(--accent-wine)' },
}
