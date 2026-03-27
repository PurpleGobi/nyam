'use client'

import { Trash2 } from 'lucide-react'
import type { Comment } from '@/domain/entities/comment'

interface CommentListProps {
  comments: Comment[]
  currentUserId: string | null
  onDelete: (commentId: string) => void
}

export function CommentList({ comments, currentUserId, onDelete }: CommentListProps) {
  if (comments.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-hint)]">아직 댓글이 없습니다</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => {
        const isOwn = comment.userId === currentUserId
        const displayName = comment.isAnonymous ? '익명' : (comment.userId?.substring(0, 6) ?? '알 수 없음')
        const date = new Date(comment.createdAt)
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

        return (
          <div key={comment.id} className="flex gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                backgroundColor: comment.isAnonymous ? 'var(--bg-card)' : 'var(--accent-social-light)',
                color: comment.isAnonymous ? 'var(--text-hint)' : 'var(--accent-social)',
              }}
            >
              {comment.isAnonymous ? '?' : displayName[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[var(--text)]">{displayName}</span>
                <span className="text-[10px] text-[var(--text-hint)]">{dateLabel}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-sub)]">{comment.content}</p>
            </div>
            {isOwn && (
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                className="shrink-0 self-start p-1"
              >
                <Trash2 size={13} style={{ color: 'var(--text-hint)' }} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
