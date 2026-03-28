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

/** type enum → CSS class 매핑 (underscore → hyphen) */
const BADGE_CLASS_MAP: Record<BadgeItem['type'], string> = {
  michelin: 'badge michelin',
  blue_ribbon: 'badge blue-ribbon',
  tv: 'badge tv',
  wine_class: 'badge wine-class',
  vivino: 'badge vivino',
  wine_spectator: 'badge wine-spectator',
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
        return (
          <div key={i} className={BADGE_CLASS_MAP[badge.type]}>
            <Icon size={10} />
            <span>{badge.label}</span>
          </div>
        )
      })}
    </div>
  )
}
