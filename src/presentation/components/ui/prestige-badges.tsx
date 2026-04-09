'use client'

import { Award, Tv, Ribbon } from 'lucide-react'
import type { RestaurantRp } from '@/domain/entities/restaurant'

interface PrestigeBadgesProps {
  rp: RestaurantRp[]
  size?: 'sm' | 'md'
}

const BADGE_CONFIG: Record<string, { icon: typeof Award; color: string; label: string }> = {
  michelin: { icon: Award, color: 'var(--accent-food)', label: '미슐랭' },
  blue_ribbon: { icon: Ribbon, color: 'var(--accent-social)', label: '블루리본' },
  tv: { icon: Tv, color: 'var(--accent-wine)', label: 'TV' },
}

export function PrestigeBadges({ rp, size = 'sm' }: PrestigeBadgesProps) {
  if (rp.length === 0) return null
  const iconSize = size === 'sm' ? 11 : 14
  const seen = new Set<string>()
  const badges: { key: string; icon: typeof Award; color: string; label: string }[] = []

  for (const item of rp) {
    if (!seen.has(item.type) && BADGE_CONFIG[item.type]) {
      seen.add(item.type)
      badges.push({ key: item.type, ...BADGE_CONFIG[item.type] })
    }
  }
  if (badges.length === 0) return null

  return (
    <span className="inline-flex items-center gap-0.5">
      {badges.map((b) => {
        const Icon = b.icon
        return (
          <span key={b.key} title={b.label}>
            <Icon size={iconSize} style={{ color: b.color }} />
          </span>
        )
      })}
    </span>
  )
}
