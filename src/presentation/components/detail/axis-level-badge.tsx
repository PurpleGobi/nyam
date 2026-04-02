'use client'

interface AxisLevelBadgeProps {
  level: number
  axisLabel?: string
}

const LEVEL_TIERS = [
  { max: 1, bg: '#e8f0ea', border: '#7EAE8B', text: '#4a7a55', shadow: 'rgba(126,174,139,0.25)' },
  { max: 3, bg: '#e8f0ea', border: '#7EAE8B', text: '#4a7a55', shadow: 'rgba(126,174,139,0.25)' },
  { max: 5, bg: '#e5eef4', border: '#7A9BAE', text: '#4a6f82', shadow: 'rgba(122,155,174,0.25)' },
  { max: 7, bg: '#ede6f0', border: '#8B7396', text: '#6b4f7a', shadow: 'rgba(139,115,150,0.3)' },
  { max: 9, bg: '#f3e8e2', border: '#C17B5E', text: '#8a5038', shadow: 'rgba(193,123,94,0.3)' },
  { max: Infinity, bg: '#f5edda', border: '#C9A96E', text: '#8a7340', shadow: 'rgba(201,169,110,0.35)' },
] as const

function getTier(level: number) {
  return LEVEL_TIERS.find((t) => level <= t.max) ?? LEVEL_TIERS[LEVEL_TIERS.length - 1]
}

export function AxisLevelBadge({ level, axisLabel }: AxisLevelBadgeProps) {
  const tier = getTier(level)
  const isHigh = level > 7

  return (
    <span
      className="inline-flex items-center"
      style={{
        fontSize: '10px',
        fontWeight: 800,
        lineHeight: 1,
        padding: axisLabel ? '3px 7px 3px 6px' : '3px 6px',
        borderRadius: '8px',
        border: `1.5px solid ${tier.border}`,
        backgroundColor: tier.bg,
        color: tier.text,
        boxShadow: `0 1px 3px ${tier.shadow}`,
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
        transform: 'rotate(-2deg)',
        ...(isHigh ? { backgroundImage: `linear-gradient(135deg, ${tier.bg} 60%, color-mix(in srgb, ${tier.border} 18%, white))` } : {}),
      }}
    >
      {axisLabel && <span style={{ marginRight: '3px', fontWeight: 600 }}>{axisLabel}</span>}
      Lv.{level}
    </span>
  )
}
