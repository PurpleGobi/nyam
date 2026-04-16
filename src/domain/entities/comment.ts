// src/domain/entities/comment.ts
// R1: 외부 의존 0

export type CommentTargetType = 'record'

export interface Comment {
  id: string
  targetType: CommentTargetType
  targetId: string
  bubbleId: string | null
  userId: string | null
  content: string
  isAnonymous: boolean
  createdAt: string
  parentId: string | null
  authorNickname: string | null
  authorHandle: string | null
  authorAvatarColor: string | null
}
