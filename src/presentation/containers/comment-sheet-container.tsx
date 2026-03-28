'use client'

import { X } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useComments } from '@/application/hooks/use-comments'
import { useReactions } from '@/application/hooks/use-reactions'
import { CommentList } from '@/presentation/components/bubble/comment-list'
import { CommentInput } from '@/presentation/components/bubble/comment-input'

interface CommentSheetContainerProps {
  isOpen: boolean
  onClose: () => void
  targetType: string
  targetId: string
  bubbleId: string
  allowComments: boolean
  targetOwnerId?: string | null
}

export function CommentSheetContainer({
  isOpen,
  onClose,
  targetType,
  targetId,
  bubbleId,
  allowComments,
  targetOwnerId,
}: CommentSheetContainerProps) {
  const { user } = useAuth()
  const { comments, total, createComment, deleteComment, isLoading, maxLength } = useComments(targetType, targetId, bubbleId)

  // 댓글 좋아요용 리액션 훅 (comment 대상)
  const commentReactions = useReactions({
    targetType: 'comment',
    targetId: '',
    userId: user?.id ?? null,
  })

  if (!isOpen) return null

  const handleSubmit = (content: string, isAnonymous: boolean) => {
    if (!user?.id) return
    createComment(user.id, content, isAnonymous, targetOwnerId)
  }

  const handleDelete = (commentId: string) => {
    if (!user?.id) return
    deleteComment(commentId, user.id)
  }

  const handleCommentLike = (commentId: string) => {
    commentReactions.toggle('like')
    // 개별 댓글 좋아요는 각 댓글 ID별로 별도 toggle 필요
    // 현재 단순화: 향후 개별 댓글 리액션 로딩 시 확장
    void commentId
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[430px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '70vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            댓글 {total > 0 ? `(${total})` : ''}
          </span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* 댓글 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: '40vh' }}>
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
            />
          )}
        </div>

        {/* 입력 */}
        {user && (
          <CommentInput
            onSubmit={handleSubmit}
            maxLength={maxLength}
            disabled={!allowComments}
            disabledMessage={!allowComments ? '이 버블에서는 댓글이 비활성화되었습니다' : undefined}
          />
        )}
      </div>
    </div>
  )
}
