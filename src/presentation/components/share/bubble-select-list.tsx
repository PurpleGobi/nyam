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
  selectedIds: Set<string>
  onToggle: (bubbleId: string) => void
}

export function BubbleSelectList({ bubbles, selectedIds, onToggle }: BubbleSelectListProps) {
  if (bubbles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>가입한 버블이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {bubbles.map((b) => {
        const isSelected = selectedIds.has(b.id)
        const isDisabled = !b.canShare || b.isShared

        return (
          <button
            key={b.id}
            type="button"
            onClick={() => !isDisabled && onToggle(b.id)}
            disabled={isDisabled}
            className="flex items-center gap-3 py-3 transition-colors disabled:opacity-40"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{ backgroundColor: b.iconBgColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}
            >
              <BubbleIcon icon={b.icon} size={18} />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>{b.name}</span>
              {b.blockReason && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>
                  <Lock size={10} />
                  {b.blockReason}
                </p>
              )}
            </div>

            {b.isShared ? (
              <span
                className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: 'var(--positive)', backgroundColor: 'rgba(126,174,139,0.12)' }}
              >
                공유됨
              </span>
            ) : (
              <div
                className="flex h-[22px] w-[22px] items-center justify-center rounded-md"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-social)' : 'transparent',
                  border: isSelected ? '2px solid var(--accent-social)' : '2px solid var(--border)',
                }}
              >
                {isSelected && <Check size={14} color="var(--text-inverse)" />}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
