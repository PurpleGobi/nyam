'use client'

import { Tv } from 'lucide-react'
import { MichelinIcon, BlueRibbonIcon } from '@/presentation/components/icons'
import type { RestaurantRp } from '@/domain/entities/restaurant'
import type { ComponentType } from 'react'

interface PrestigeBadgesProps {
  rp: RestaurantRp[]
  size?: 'sm' | 'md'
}

type IconComponent = ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>

const BADGE_CONFIG: Record<string, { icon: IconComponent; color?: string; label: string; sizeRatio: number }> = {
  michelin: { icon: MichelinIcon, label: '미슐랭', sizeRatio: 1.4 },
  blue_ribbon: { icon: BlueRibbonIcon, label: '블루리본', sizeRatio: 1.4 },
  tv: { icon: Tv, color: 'var(--accent-wine)', label: 'TV', sizeRatio: 1 },
}

export function PrestigeBadges({ rp, size = 'sm' }: PrestigeBadgesProps) {
  if (rp.length === 0) return null
  const baseSize = size === 'sm' ? 11 : 14
  const seen = new Set<string>()
  const badges: { key: string; icon: IconComponent; color?: string; label: string; sizeRatio: number }[] = []

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
            <Icon size={Math.round(baseSize * b.sizeRatio)} {...(b.color ? { style: { color: b.color } } : {})} />
          </span>
        )
      })}
    </span>
  )
}
