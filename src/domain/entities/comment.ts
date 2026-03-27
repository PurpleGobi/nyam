// src/domain/entities/comment.ts
// R1: 외부 의존 0

export interface Comment {
  id: string
  targetType: 'record'
  targetId: string
  bubbleId: string | null
  userId: string | null
  content: string
  isAnonymous: boolean
  createdAt: string
}
