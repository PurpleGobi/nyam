'use client'

import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
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
  icon: typeof ThumbsUp
  label: string
  activeColor: string
}[] = [
  { type: 'good', icon: ThumbsUp, label: '좋아요', activeColor: 'var(--positive)' },
  { type: 'bad', icon: ThumbsDown, label: '별로예요', activeColor: 'var(--negative)' },
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
  )
}
