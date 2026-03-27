'use client'

import { BookmarkPlus, CheckCircle, Flame, Heart } from 'lucide-react'
import type { ReactionType } from '@/domain/entities/reaction'

interface ReactionButtonsProps {
  counts: Record<ReactionType, number>
  myReactions: Set<ReactionType>
  onToggle: (type: ReactionType) => void
  disabled?: boolean
}

const REACTION_BUTTONS: {
  type: ReactionType
  icon: typeof Heart
  label: string
  activeColor: string
}[] = [
  { type: 'want', icon: BookmarkPlus, label: '가고싶다', activeColor: 'var(--accent-food)' },
  { type: 'check', icon: CheckCircle, label: '다녀왔다', activeColor: 'var(--positive)' },
  { type: 'fire', icon: Flame, label: '불꽃', activeColor: '#E55A35' },
  { type: 'like', icon: Heart, label: '좋아요', activeColor: 'var(--negative)' },
]

export function ReactionButtons({ counts, myReactions, onToggle, disabled }: ReactionButtonsProps) {
  return (
    <div className="flex gap-2">
      {REACTION_BUTTONS.map(({ type, icon: Icon, label, activeColor }) => {
        const isActive = myReactions.has(type)
        const count = counts[type] ?? 0
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(type)}
            disabled={disabled}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: isActive ? `${activeColor}15` : 'var(--bg-card)',
              border: `1px solid ${isActive ? activeColor : 'var(--border)'}`,
              color: isActive ? activeColor : 'var(--text-sub)',
            }}
            title={label}
          >
            <Icon size={14} />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
