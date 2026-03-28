'use client'

import { Award, Star, Tv, Grape, Trophy } from 'lucide-react'

export interface BadgeItem {
  type: 'michelin' | 'blue_ribbon' | 'tv' | 'wine_class' | 'vivino' | 'wine_spectator'
  label: string
  icon: string
}

interface BadgeRowProps {
  badges: BadgeItem[]
}

const BADGE_STYLES: Record<BadgeItem['type'], { bg: string; text: string; border: string }> = {
  michelin: { bg: '#FDF6EC', text: '#B8860B', border: '#E8DDCA' },
  blue_ribbon: { bg: '#EDF2FB', text: '#4A6FA5', border: '#D0DCF0' },
  tv: { bg: '#FFF3F0', text: 'var(--brand)', border: '#F0D8D0' },
  wine_class: { bg: 'var(--accent-wine-light)', text: 'var(--accent-wine)', border: '#DDD6E3' },
  vivino: { bg: '#FBF0F0', text: '#9B2335', border: '#E8D0D0' },
  wine_spectator: { bg: '#F5F0E8', text: '#8B7355', border: '#E0D8C8' },
}

const BADGE_ICONS = {
  michelin: Star,
  blue_ribbon: Award,
  tv: Tv,
  wine_class: Award,
  vivino: Grape,
  wine_spectator: Trophy,
} as const

export function BadgeRow({ badges }: BadgeRowProps) {
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-[5px]" style={{ padding: '0 20px 10px' }}>
      {badges.map((badge, i) => {
        const Icon = BADGE_ICONS[badge.type]
        const style = BADGE_STYLES[badge.type]
        return (
          <div
            key={i}
            className="flex items-center gap-1 rounded-full"
            style={{
              padding: '3px 9px',
              backgroundColor: style.bg,
              border: `1px solid ${style.border}`,
            }}
          >
            <Icon size={10} style={{ color: style.text }} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: style.text }}>
              {badge.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
