'use client'

import { Check, Lock } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleSelectItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isShared: boolean
  canShare: boolean
  blockReason: string | null
}

interface BubbleSelectListProps {
  bubbles: BubbleSelectItem[]
  onToggle: (bubbleId: string) => void
}

export function BubbleSelectList({ bubbles, onToggle }: BubbleSelectListProps) {
  if (bubbles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>가입한 버블이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {bubbles.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => b.canShare && onToggle(b.id)}
          disabled={!b.canShare}
          className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors disabled:opacity-40"
          style={{ backgroundColor: b.isShared ? 'var(--accent-social-light)' : 'transparent' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: b.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            <BubbleIcon icon={b.icon} size={18} />
          </div>

          <div className="min-w-0 flex-1 text-left">
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{b.name}</span>
            {b.blockReason && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>
                <Lock size={10} />
                {b.blockReason}
              </p>
            )}
          </div>

          {b.isShared && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--accent-social)' }}
            >
              <Check size={14} color="#FFFFFF" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
