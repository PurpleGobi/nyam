// src/domain/repositories/comment-repository.ts
// R1: 외부 의존 0

import type { Comment } from '@/domain/entities/comment'

export interface CommentRepository {
  getById(id: string): Promise<Comment | null>
  getByTarget(targetType: string, targetId: string, bubbleId: string): Promise<Comment[]>
  getCountByTarget(targetType: string, targetId: string, bubbleId: string): Promise<number>
  create(params: { targetType: string; targetId: string; bubbleId: string; userId: string; content: string; isAnonymous: boolean }): Promise<Comment>
  delete(commentId: string, userId: string): Promise<void>
}
