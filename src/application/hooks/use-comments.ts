'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Comment } from '@/domain/entities/comment'
import { commentRepo } from '@/shared/di/container'
import { sendNotification } from '@/application/helpers/send-notification'

const MAX_COMMENT_LENGTH = 300

export function useComments(targetType: string, targetId: string, bubbleId: string | null) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await commentRepo.getByTarget(targetType, targetId, bubbleId)
      setComments(result.data)
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
    parentId?: string | null,
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
      parentId: parentId ?? null,
    })

    // 낙관적 업데이트
    setComments((prev) => [...prev, comment])

    // 알림: 대댓글이면 부모 댓글 작성자에게, 아니면 기록 작성자에게
    const notifyUserId = parentId
      ? comments.find((c) => c.id === parentId)?.userId
      : targetOwnerId
    if (notifyUserId && notifyUserId !== userId) {
      sendNotification({
        userId: notifyUserId,
        type: 'comment_reply',
        title: parentId
          ? (isAnonymous ? '익명이 답글을 남겼습니다' : '내 댓글에 답글이 달렸습니다')
          : (isAnonymous ? '익명이 댓글을 남겼습니다' : '새 댓글이 달렸습니다'),
        body: trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed,
        actionStatus: null,
        actorId: isAnonymous ? null : userId,
        targetType,
        targetId,
        bubbleId,
      }).catch(() => {})
    }

    return comment
  }, [targetType, targetId, bubbleId, comments])

  const deleteComment = useCallback(async (commentId: string, userId: string): Promise<void> => {
    await commentRepo.delete(commentId, userId)
    // 삭제된 댓글 + 그 대댓글들도 제거 (DB에서 ON DELETE CASCADE)
    setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId))
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
