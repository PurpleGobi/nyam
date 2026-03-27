'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/domain/entities/comment'
import { commentRepo } from '@/shared/di/container'

const MAX_COMMENT_LENGTH = 300

export function useComments(targetType: string, targetId: string, bubbleId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await commentRepo.getByTarget(targetType, targetId, bubbleId)
      setComments(data)
    } finally {
      setIsLoading(false)
    }
  }, [targetType, targetId, bubbleId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const createComment = useCallback(async (
    userId: string,
    content: string,
    isAnonymous: boolean,
  ): Promise<Comment | null> => {
    const trimmed = content.trim()
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH) return null

    const comment = await commentRepo.create({
      targetType,
      targetId,
      bubbleId,
      userId,
      content: trimmed,
      isAnonymous,
    })
    setComments((prev) => [...prev, comment])
    return comment
  }, [targetType, targetId, bubbleId])

  const deleteComment = useCallback(async (commentId: string, userId: string): Promise<void> => {
    await commentRepo.delete(commentId, userId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

  return { comments, createComment, deleteComment, isLoading, maxLength: MAX_COMMENT_LENGTH }
}
