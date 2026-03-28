'use client'

import { Trophy, Clock, Heart } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleContextCardProps {
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  rankTotal: number | null
  memberSince: string
  tasteMatchPct: number | null
}

export function BubbleContextCard({
  bubbleName,
  bubbleIcon,
  rank,
  rankTotal,
  memberSince,
  tasteMatchPct,
}: BubbleContextCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <BubbleIcon icon={bubbleIcon} size={16} />
        <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>{bubbleName}</span>
      </div>

      <div className="mt-3 flex gap-4">
        {rank !== null && (
          <div className="flex items-center gap-1.5">
            <Trophy size={14} style={{ color: 'var(--accent-food)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>{rank}위{rankTotal !== null ? `/${rankTotal}명` : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock size={14} style={{ color: 'var(--text-hint)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-sub)' }}>{memberSince}</span>
        </div>
        {tasteMatchPct !== null && (
          <div className="flex items-center gap-1.5">
            <Heart size={14} style={{ color: 'var(--accent-wine)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
              취향 {tasteMatchPct}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
