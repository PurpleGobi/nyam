'use client'

import { Award, Star, Tv } from 'lucide-react'

interface Badge {
  icon: 'michelin' | 'blue_ribbon' | 'media' | 'award'
  label: string
  color?: string
}

interface BadgeRowProps {
  badges: Badge[]
}

const BADGE_ICONS = {
  michelin: Star,
  blue_ribbon: Award,
  media: Tv,
  award: Award,
} as const

export function BadgeRow({ badges }: BadgeRowProps) {
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4">
      {badges.map((badge, i) => {
        const Icon = BADGE_ICONS[badge.icon]
        return (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <Icon size={14} style={{ color: badge.color ?? 'var(--accent-food)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
              {badge.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
