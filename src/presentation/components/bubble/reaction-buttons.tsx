'use client'

import { BookmarkPlus, CheckCircle2, Flame, Heart, MessageCircle } from 'lucide-react'
import type { ReactionType } from '@/domain/entities/reaction'

interface ReactionButtonsProps {
  counts: Record<ReactionType, number>
  myReactions: Set<ReactionType>
  commentCount: number
  onToggle: (type: ReactionType) => void
  onCommentClick: () => void
  disabled?: boolean
}

const FEED_REACTIONS: {
  type: ReactionType
  icon: typeof Heart
  label: string
  activeColor: string
}[] = [
  { type: 'want', icon: BookmarkPlus, label: '가고싶다', activeColor: 'var(--primary)' },
  { type: 'check', icon: CheckCircle2, label: '다녀왔다', activeColor: 'var(--positive)' },
  { type: 'fire', icon: Flame, label: '불꽃', activeColor: '#E55A35' },
]

export function ReactionButtons({
  counts,
  myReactions,
  commentCount,
  onToggle,
  onCommentClick,
  disabled,
}: ReactionButtonsProps) {
  return (
    <div className="flex items-center">
      {/* 리액션 3종 (want/check/fire) */}
      <div className="flex items-center gap-1">
        {FEED_REACTIONS.map(({ type, icon: Icon, label, activeColor }) => {
          const isActive = myReactions.has(type)
          const count = counts[type] ?? 0
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggle(type)}
              disabled={disabled}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50"
              style={{ color: isActive ? activeColor : 'var(--text-hint)' }}
              title={label}
            >
              <Icon size={14} />
              {count > 0 && <span>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* 구분선 */}
      <div className="mx-1 h-4" style={{ borderRight: '1px solid var(--line)' }} />

      {/* 좋아요 + 댓글 */}
      <div className="flex items-center gap-1">
        {/* 좋아요 */}
        <button
          type="button"
          onClick={() => onToggle('like')}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50"
          style={{ color: myReactions.has('like') ? 'var(--negative)' : 'var(--text-hint)' }}
          title="좋아요"
        >
          <Heart size={14} />
          {(counts.like ?? 0) > 0 && <span>{counts.like}</span>}
        </button>

        {/* 댓글 */}
        <button
          type="button"
          onClick={onCommentClick}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-sub)' }}
          title="댓글"
        >
          <MessageCircle size={14} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
      </div>
    </div>
  )
}
