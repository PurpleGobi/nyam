'use client'

import { Tv } from 'lucide-react'
import { MichelinIcon, BlueRibbonIcon, BibGourmandIcon } from '@/presentation/components/icons'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import type { ComponentType } from 'react'

interface PrestigeBadgesProps {
  prestige: RestaurantPrestige[]
  size?: 'sm' | 'md'
}

type IconComponent = ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>

const BADGE_CONFIG: Record<string, { icon: IconComponent; color?: string; label: string; sizeRatio: number }> = {
  michelin: { icon: MichelinIcon, label: '미슐랭', sizeRatio: 1.4 },
  blue_ribbon: { icon: BlueRibbonIcon, label: '블루리본', sizeRatio: 1.4 },
  tv: { icon: Tv, color: 'var(--accent-wine)', label: 'TV', sizeRatio: 1 },
}

/** grade → 아이콘 반복 횟수 (미슐랭/블루리본) */
const ICON_REPEAT: Record<string, number> = {
  '3_star': 3, '2_star': 2, '1_star': 1,
  '3_ribbon': 3, '2_ribbon': 2, '1_ribbon': 1,
}

/** TV grade는 프로그램명 — underscore를 공백으로 변환 */
function formatTvGrade(grade: string): string {
  return grade.replace(/_/g, ' ')
}

interface BadgeEntry {
  key: string
  icon: IconComponent
  color?: string
  label: string
  sizeRatio: number
  /** 아이콘 반복 횟수 (미슐랭 3스타 → 3) */
  repeat: number
  /** 아이콘 대신 텍스트로 표시 (빕 구르망, TV 프로그램명) */
  text: string | null
}

export function PrestigeBadges({ prestige, size = 'sm' }: PrestigeBadgesProps) {
  if (prestige.length === 0) return null
  const baseSize = size === 'sm' ? 11 : 14
  const fontSize = size === 'sm' ? 9 : 11

  const badges: BadgeEntry[] = []

  for (const item of prestige) {
    if (!BADGE_CONFIG[item.type]) continue

    const repeat = ICON_REPEAT[item.grade] ?? 1
    let text: string | null = null

    if (item.type === 'tv') {
      text = formatTvGrade(item.grade)
    }

    // 빕 구르망은 별도 아이콘 사용
    const icon = item.grade === 'bib' ? BibGourmandIcon : BADGE_CONFIG[item.type].icon

    badges.push({
      key: `${item.type}:${item.grade}`,
      ...BADGE_CONFIG[item.type],
      icon,
      repeat: text ? 1 : repeat,
      text,
    })
  }
  if (badges.length === 0) return null

  return (
    <span className="inline-flex items-center gap-0.5">
      {badges.map((b) => {
        const Icon = b.icon
        const iconSize = Math.round(baseSize * b.sizeRatio)
        return (
          <span key={b.key} className="inline-flex items-center" title={b.label}>
            {Array.from({ length: b.repeat }, (_, i) => (
              <Icon key={i} size={iconSize} {...(b.color ? { style: { color: b.color } } : {})} />
            ))}
            {b.text && (
              <span
                className="font-bold leading-none"
                style={{ fontSize, color: b.color ?? 'var(--text-secondary)', marginLeft: 1 }}
              >
                {b.text}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
