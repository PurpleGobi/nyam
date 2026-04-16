'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useComments } from '@/application/hooks/use-comments'
import { useReactions } from '@/application/hooks/use-reactions'
import { CommentList } from '@/presentation/components/bubble/comment-list'
import { CommentInput } from '@/presentation/components/bubble/comment-input'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface CommentSheetContainerProps {
  isOpen: boolean
  onClose: () => void
  targetType: string
  targetId: string
  bubbleId: string | null
  allowComments: boolean
  targetOwnerId?: string | null
  onCommentCountChange?: (delta: number) => void
  onReactionChange?: (reactionType: 'good' | 'bad', added: boolean) => void
}

export function CommentSheetContainer({
  isOpen,
  onClose,
  targetType,
  targetId,
  bubbleId,
  allowComments,
  targetOwnerId,
  onCommentCountChange,
  onReactionChange,
}: CommentSheetContainerProps) {
  const { user } = useAuth()
  const { comments, total, createComment, deleteComment, isLoading, maxLength } = useComments(targetType, targetId, bubbleId)

  // 기록 자체에 대한 리액션 (good/bad)
  const recordReactions = useReactions({
    targetType: 'record',
    targetId,
    userId: user?.id ?? null,
    targetOwnerId,
  })

  // 댓글별 좋아요 상태: commentId → liked 여부 (로컬 토글)
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set())
  const [commentLikeProcessing, setCommentLikeProcessing] = useState<Set<string>>(new Set())

  // 답글 대상
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; authorName: string } | null>(null)

  // 댓글 좋아요 토글
  const handleCommentLike = useCallback(async (commentId: string) => {
    if (!user?.id || commentLikeProcessing.has(commentId)) return
    setCommentLikeProcessing((prev) => new Set(prev).add(commentId))
    setCommentLikes((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
    try {
      // 댓글 좋아요 DB 연동은 추후 구현
    } finally {
      setCommentLikeProcessing((prev) => {
        const next = new Set(prev)
        next.delete(commentId)
        return next
      })
    }
  }, [user?.id, commentLikeProcessing])

  const handleSubmit = async (content: string, isAnonymous: boolean) => {
    if (!user?.id) return
    const result = await createComment(user.id, content, isAnonymous, targetOwnerId, replyTarget?.commentId ?? null)
    if (result) onCommentCountChange?.(1)
    setReplyTarget(null)
  }

  const handleDelete = async (commentId: string) => {
    if (!user?.id) return
    // 삭제되는 대댓글 수 계산
    const childCount = comments.filter((c) => c.parentId === commentId).length
    await deleteComment(commentId, user.id)
    onCommentCountChange?.(-(1 + childCount))
  }

  const handleReactionToggle = useCallback(async (type: 'good' | 'bad') => {
    const hadIt = recordReactions.myReactions.has(type)
    await recordReactions.toggle(type)
    // 부모 카드 상태 동기화
    onReactionChange?.(type, !hadIt)
  }, [recordReactions, onReactionChange])

  const handleReply = useCallback((commentId: string, authorName: string) => {
    setReplyTarget({ commentId, authorName })
  }, [])

  const isOwnRecord = targetOwnerId != null && targetOwnerId === user?.id

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`댓글${total > 0 ? ` (${total})` : ''}`} maxHeight="70vh">
      {/* 기록 리액션 (good/bad) */}
      <div className="mb-3 flex items-center gap-3 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={isOwnRecord ? undefined : () => handleReactionToggle('good')}
          disabled={isOwnRecord}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
          style={{
            backgroundColor: recordReactions.myReactions.has('good') ? 'color-mix(in srgb, var(--positive) 15%, transparent)' : 'var(--bg-card)',
            color: recordReactions.myReactions.has('good') ? 'var(--positive)' : 'var(--text-sub)',
            border: `1px solid ${recordReactions.myReactions.has('good') ? 'var(--positive)' : 'var(--border)'}`,
          }}
        >
          <ThumbsUp size={14} fill={recordReactions.myReactions.has('good') ? 'currentColor' : 'none'} />
          {recordReactions.counts.good > 0 ? recordReactions.counts.good : '좋아요'}
        </button>
        <button
          type="button"
          onClick={isOwnRecord ? undefined : () => handleReactionToggle('bad')}
          disabled={isOwnRecord}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
          style={{
            backgroundColor: recordReactions.myReactions.has('bad') ? 'color-mix(in srgb, var(--negative) 15%, transparent)' : 'var(--bg-card)',
            color: recordReactions.myReactions.has('bad') ? 'var(--negative)' : 'var(--text-sub)',
            border: `1px solid ${recordReactions.myReactions.has('bad') ? 'var(--negative)' : 'var(--border)'}`,
          }}
        >
          <ThumbsDown size={14} fill={recordReactions.myReactions.has('bad') ? 'currentColor' : 'none'} />
          {recordReactions.counts.bad > 0 ? recordReactions.counts.bad : '별로예요'}
        </button>
      </div>

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" />
        </div>
      ) : (
        <CommentList
          comments={comments}
          currentUserId={user?.id ?? null}
          onDelete={handleDelete}
          onLike={handleCommentLike}
          likedCommentIds={commentLikes}
          onReply={handleReply}
        />
      )}

      {/* 입력 */}
      {user && (
        <div className="mt-3">
          <CommentInput
            onSubmit={handleSubmit}
            maxLength={maxLength}
            disabled={!allowComments}
            disabledMessage={!allowComments ? '이 버블에서는 댓글이 비활성화되었습니다' : undefined}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
          />
        </div>
      )}
    </BottomSheet>
  )
}
