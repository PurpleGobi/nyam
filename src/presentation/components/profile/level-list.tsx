'use client'

import type { UserExperience, LevelThreshold } from '@/domain/entities/xp'
import { getLevel, getLevelColor } from '@/domain/services/xp-calculator'

interface LevelListProps {
  experiences: UserExperience[]
  thresholds: LevelThreshold[]
  category: 'restaurant' | 'wine'
  onItemPress: (exp: UserExperience) => void
}

export function LevelList({ experiences, thresholds, category, onItemPress }: LevelListProps) {
  const sorted = [...experiences].sort((a, b) => b.totalXp - a.totalXp)

  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-10"
        style={{ color: 'var(--text-hint)', fontSize: '13px' }}
      >
        {category === 'restaurant' ? '아직 식당 경험이 없어요' : '아직 와인 경험이 없어요'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5" style={{ maxHeight: '340px', overflowY: 'auto' }}>
      {sorted.map((exp) => {
        const levelInfo = getLevel(exp.totalXp, thresholds)
        const levelColor = getLevelColor(levelInfo.level)

        return (
          <button
            key={exp.id}
            type="button"
            onClick={() => onItemPress(exp)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {/* Level badge */}
            <div
              className="flex shrink-0 items-center justify-center rounded"
              style={{
                width: '26px',
                height: '26px',
                backgroundColor: levelColor,
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-inverse)' }}>
                {levelInfo.level}
              </span>
            </div>

            {/* Name + XP + Progress */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className="truncate"
                  style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}
                >
                  {exp.axisValue}
                </span>
                <span
                  className="shrink-0 pl-2"
                  style={{ fontSize: '11px', color: 'var(--text-hint)' }}
                >
                  {exp.totalXp.toLocaleString()} XP
                </span>
              </div>

              {/* Progress bar */}
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(levelInfo.progress * 100, 100)}%`,
                    backgroundColor: levelColor,
                  }}
                />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
