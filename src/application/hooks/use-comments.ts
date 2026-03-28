'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/domain/entities/comment'
import { commentRepo, notificationRepo } from '@/shared/di/container'

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
    targetOwnerId?: string | null,
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

    // 낙관적 업데이트
    setComments((prev) => [...prev, comment])

    // 알림: comment_reply → 기록 작성자 (본인 제외)
    if (targetOwnerId && targetOwnerId !== userId) {
      await notificationRepo.createNotification({
        userId: targetOwnerId,
        type: 'comment_reply',
        title: isAnonymous ? '익명이 댓글을 남겼습니다' : '새 댓글이 달렸습니다',
        body: trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed,
        actionStatus: null,
        actorId: isAnonymous ? null : userId,
        bubbleId,
      })
    }

    return comment
  }, [targetType, targetId, bubbleId])

  const deleteComment = useCallback(async (commentId: string, userId: string): Promise<void> => {
    await commentRepo.delete(commentId, userId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }, [])

  return {
    comments,
    total: comments.length,
    createComment,
    deleteComment,
    isLoading,
    maxLength: MAX_COMMENT_LENGTH,
  }
}
