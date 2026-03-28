'use client'

/** 배지 타입 — 설계 §3 PlaceBadge */
export type BadgeType = 'michelin' | 'blue_ribbon' | 'tv'

interface PlaceBadgeProps {
  type: BadgeType
  label: string
}

const BADGE_STYLES: Record<BadgeType, { bg: string; color: string }> = {
  michelin: { bg: 'rgba(220,50,50,0.9)', color: '#fff' },
  blue_ribbon: { bg: 'rgba(59,130,246,0.9)', color: '#fff' },
  tv: { bg: 'rgba(0,0,0,0.75)', color: '#fff' },
}

export function PlaceBadge({ type, label }: PlaceBadgeProps) {
  const style = BADGE_STYLES[type]
  return (
    <span
      className="w-fit rounded-md text-[10px] font-bold"
      style={{
        padding: '3px 7px',
        backgroundColor: style.bg,
        color: style.color,
        backdropFilter: 'blur(8px)',
      }}
    >
      {label}
    </span>
  )
}
