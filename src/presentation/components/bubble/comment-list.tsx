'use client'

import { useState } from 'react'
import { Trash2, Heart } from 'lucide-react'
import type { Comment } from '@/domain/entities/comment'

interface CommentListProps {
  comments: Comment[]
  currentUserId: string | null
  onDelete: (commentId: string) => void
  onLike: (commentId: string) => void
}

export function CommentList({ comments, currentUserId, onDelete, onLike }: CommentListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (comments.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-hint)]">아직 댓글이 없습니다</p>
  }

  const handleDeleteClick = (commentId: string) => {
    setDeleteConfirmId(commentId)
  }

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {comments.map((comment) => {
          const isOwn = comment.userId === currentUserId
          const displayName = comment.isAnonymous ? '익명' : (comment.userId?.substring(0, 6) ?? '알 수 없음')
          const date = new Date(comment.createdAt)
          const dateLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

          return (
            <div key={comment.id} className="flex gap-2.5">
              {/* 아바타 */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: comment.isAnonymous ? 'var(--bg-card)' : 'var(--accent-social-light)',
                  color: comment.isAnonymous ? 'var(--text-hint)' : 'var(--accent-social)',
                }}
              >
                {comment.isAnonymous ? '?' : displayName[0].toUpperCase()}
              </div>

              {/* 내용 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[var(--text)]">{displayName}</span>
                  <span className="text-[10px] text-[var(--text-hint)]">{dateLabel}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-sub)]">{comment.content}</p>

                {/* 댓글 좋아요 + 삭제 */}
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onLike(comment.id)}
                    className="flex items-center gap-1 text-[11px] transition-colors"
                    style={{ color: 'var(--text-hint)' }}
                  >
                    <Heart size={11} />
                  </button>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(comment.id)}
                      className="text-[11px]"
                      style={{ color: 'var(--negative)' }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div
            className="mx-6 w-full max-w-[300px] rounded-2xl p-5 text-center"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <p className="text-[14px] font-semibold text-[var(--text)]">댓글을 삭제하시겠습니까?</p>
            <p className="mt-1 text-[12px] text-[var(--text-sub)]">삭제된 댓글은 복구할 수 없습니다</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white"
                style={{ backgroundColor: 'var(--negative)' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
