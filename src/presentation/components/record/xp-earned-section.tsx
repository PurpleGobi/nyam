'use client'

import { getLevelColor } from '@/domain/services/xp-calculator'

interface XpEarnedItem {
  axisValue: string
  xpAmount: number
  currentLevel: number
}

interface XpEarnedSectionProps {
  items: XpEarnedItem[]
}

export function XpEarnedSection({ items }: XpEarnedSectionProps) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>획득한 경험치</h3>
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between py-1">
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{item.axisValue}</span>
          <span className="flex items-center gap-2">
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-food)' }}>
              +{item.xpAmount} XP
            </span>
            <span
              className="rounded-full px-2 py-0.5"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: getLevelColor(item.currentLevel),
                backgroundColor: `${getLevelColor(item.currentLevel)}15`,
              }}
            >
              Lv.{item.currentLevel}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
