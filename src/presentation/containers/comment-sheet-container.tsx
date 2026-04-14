'use client'

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

  const commentReactions = useReactions({
    targetType: 'comment',
    targetId: '',
    userId: user?.id ?? null,
  })

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
    void commentId
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`댓글${total > 0 ? ` (${total})` : ''}`} maxHeight="70vh">
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
          />
        </div>
      )}
    </BottomSheet>
  )
}
