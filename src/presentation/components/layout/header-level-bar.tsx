'use client'

import type { LevelInfo } from '@/domain/entities/xp'

interface HeaderLevelBarProps {
  levelInfo: LevelInfo
}

export function HeaderLevelBar({ levelInfo }: HeaderLevelBarProps) {
  return (
    <div className="header-level-bar">
      <span
        className="header-level-badge"
        style={{ backgroundColor: levelInfo.color }}
      >
        {levelInfo.level}
      </span>
      <div className="header-xp-track">
        <div
          className="header-xp-fill"
          style={{
            width: `${Math.round(levelInfo.progress * 100)}%`,
            backgroundColor: levelInfo.color,
          }}
        />
      </div>
    </div>
  )
}
