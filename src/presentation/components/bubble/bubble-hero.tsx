'use client'

import { Users, BookOpen } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'

interface BubbleHeroProps {
  bubble: Bubble
}

export function BubbleHero({ bubble }: BubbleHeroProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-5">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', fontSize: '32px' }}
      >
        {bubble.icon ?? '🫧'}
      </div>

      <span className="text-[18px] font-bold text-[var(--text)]">{bubble.name}</span>

      {bubble.description && (
        <p className="text-center text-[13px] leading-snug text-[var(--text-sub)]">{bubble.description}</p>
      )}

      <div className="flex items-center gap-3 text-[12px] text-[var(--text-hint)]">
        <span className="flex items-center gap-1">
          <Users size={13} />
          멤버 {bubble.memberCount}명
        </span>
        <span className="flex items-center gap-1">
          <BookOpen size={13} />
          기록 {bubble.recordCount}개
        </span>
        {bubble.avgSatisfaction !== null && (
          <span>평균 {bubble.avgSatisfaction.toFixed(1)}점</span>
        )}
      </div>
    </div>
  )
}
