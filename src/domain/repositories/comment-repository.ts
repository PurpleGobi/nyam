// src/domain/repositories/comment-repository.ts
// R1: 외부 의존 0

import type { Comment } from '@/domain/entities/comment'

export interface CommentRepository {
  getById(id: string): Promise<Comment | null>
  getByTarget(targetType: string, targetId: string, bubbleId: string | null, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: Comment[]; total: number }>
  getCountByTarget(targetType: string, targetId: string, bubbleId: string | null): Promise<number>
  getCountsByTargetIds(targetType: string, targetIds: string[], bubbleId: string | null): Promise<Map<string, number>>
  create(params: {
    targetType: string
    targetId: string
    bubbleId: string | null
    userId: string
    content: string
    isAnonymous: boolean
    parentId?: string | null
  }): Promise<Comment>
  delete(commentId: string, userId: string): Promise<void>
}
