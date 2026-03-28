'use client'

import { Award } from 'lucide-react'

interface TotalLevelCardProps {
  level: number
  title: string
  color: string
  totalXp: number
  nextLevelXp: number
  progress: number
}

export function TotalLevelCard({ level, title, color, totalXp, nextLevelXp, progress }: TotalLevelCardProps) {
  const levelColor = color
  const clampedProgress = Math.min(Math.max(progress, 0), 1)
  const remaining = nextLevelXp - totalXp

  return (
    <div
      className="mx-4 rounded-2xl border px-4 py-4"
      style={{
        background: 'linear-gradient(135deg, var(--bg-card), var(--accent-food-light))',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: levelColor }}
          >
            <Award size={18} style={{ color: '#FFFFFF' }} />
          </div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Lv.{level} {title}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              {totalXp.toLocaleString()} XP · 다음 레벨까지 {remaining.toLocaleString()} XP
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 overflow-hidden rounded-full"
        style={{ height: '6px', backgroundColor: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedProgress * 100}%`,
            backgroundColor: levelColor,
          }}
        />
      </div>
    </div>
  )
}
