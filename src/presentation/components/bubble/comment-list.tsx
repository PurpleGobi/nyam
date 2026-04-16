'use client'

import { useState, useMemo } from 'react'
import { ThumbsUp, Reply } from 'lucide-react'
import type { Comment } from '@/domain/entities/comment'

interface CommentListProps {
  comments: Comment[]
  currentUserId: string | null
  onDelete: (commentId: string) => void
  onLike: (commentId: string) => void
  likedCommentIds?: Set<string>
  onReply?: (commentId: string, authorName: string) => void
}

export function CommentList({ comments, currentUserId, onDelete, onLike, likedCommentIds, onReply }: CommentListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 루트 댓글과 대댓글 분리
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots: Comment[] = []
    const replies = new Map<string, Comment[]>()
    for (const c of comments) {
      if (c.parentId) {
        const arr = replies.get(c.parentId) ?? []
        arr.push(c)
        replies.set(c.parentId, arr)
      } else {
        roots.push(c)
      }
    }
    return { rootComments: roots, repliesByParent: replies }
  }, [comments])

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
        {rootComments.map((comment) => {
          const childReplies = repliesByParent.get(comment.id) ?? []
          return (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onDelete={handleDeleteClick}
                onLike={onLike}
                likedCommentIds={likedCommentIds}
                onReply={onReply}
              />
              {/* 대댓글 */}
              {childReplies.length > 0 && (
                <div className="ml-9 mt-1 flex flex-col gap-2 border-l-2 pl-3" style={{ borderColor: 'var(--border)' }}>
                  {childReplies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      onDelete={handleDeleteClick}
                      onLike={onLike}
                      likedCommentIds={likedCommentIds}
                      isReply
                    />
                  ))}
                </div>
              )}
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
                className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-text-inverse"
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

// ─── 개별 댓글 아이템 ───

interface CommentItemProps {
  comment: Comment
  currentUserId: string | null
  onDelete: (commentId: string) => void
  onLike: (commentId: string) => void
  likedCommentIds?: Set<string>
  onReply?: (commentId: string, authorName: string) => void
  isReply?: boolean
}

function CommentItem({ comment, currentUserId, onDelete, onLike, likedCommentIds, onReply, isReply }: CommentItemProps) {
  const isOwn = comment.userId === currentUserId
  const displayName = comment.isAnonymous ? '익명' : (comment.authorNickname ?? '알 수 없음')
  const displayHandle = comment.isAnonymous ? null : comment.authorHandle
  const date = new Date(comment.createdAt)
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  const avatarSize = isReply ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]'

  return (
    <div className="flex gap-2.5">
      {/* 아바타 */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-bold ${avatarSize}`}
        style={{
          backgroundColor: comment.isAnonymous ? 'var(--bg-card)' : (comment.authorAvatarColor ?? 'var(--accent-social-light)'),
          color: comment.isAnonymous ? 'var(--text-hint)' : 'var(--text-inverse)',
        }}
      >
        {comment.isAnonymous ? '?' : displayName[0].toUpperCase()}
      </div>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold text-[var(--text)] ${isReply ? 'text-[11px]' : 'text-[12px]'}`}>{displayName}</span>
          {displayHandle && (
            <span className="text-[10px] text-[var(--text-hint)]">@{displayHandle}</span>
          )}
          <span className="text-[10px] text-[var(--text-hint)]">{dateLabel}</span>
        </div>
        <p className={`mt-0.5 leading-snug text-[var(--text-sub)] ${isReply ? 'text-[12px]' : 'text-[13px]'}`}>{comment.content}</p>

        {/* 액션: 좋아요 + 답글 + 삭제 */}
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onLike(comment.id)}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: likedCommentIds?.has(comment.id) ? 'var(--positive)' : 'var(--text-hint)' }}
          >
            <ThumbsUp size={11} fill={likedCommentIds?.has(comment.id) ? 'currentColor' : 'none'} />
          </button>
          {!isReply && onReply && (
            <button
              type="button"
              onClick={() => onReply(comment.id, displayName)}
              className="flex items-center gap-1 text-[11px] transition-colors"
              style={{ color: 'var(--text-hint)' }}
            >
              <Reply size={11} />
              <span>답글</span>
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
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
}
