'use client'

import { Star, Award, Tv, Grape, Trophy } from 'lucide-react'

type BadgeType = 'michelin' | 'blue-ribbon' | 'tv' | 'wine-class' | 'vivino' | 'wine-spectator'

const BADGE_CONFIG: Record<BadgeType, { icon: React.ElementType; label: string }> = {
  michelin: { icon: Star, label: '미슐랭' },
  'blue-ribbon': { icon: Award, label: '블루리본' },
  tv: { icon: Tv, label: 'TV 출연' },
  'wine-class': { icon: Award, label: 'Wine Class' },
  vivino: { icon: Grape, label: 'Vivino' },
  'wine-spectator': { icon: Trophy, label: 'Wine Spectator' },
}

interface BadgeProps {
  type: BadgeType
  label?: string
}

export function Badge({ type, label }: BadgeProps) {
  const config = BADGE_CONFIG[type]
  const Icon = config.icon
  return (
    <span className={`badge ${type}`}>
      <Icon size={10} />
      {label ?? config.label}
    </span>
  )
}
