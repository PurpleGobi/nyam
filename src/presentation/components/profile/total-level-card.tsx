'use client'

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

  return (
    <div
      className="mx-4 rounded-2xl px-4 py-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${levelColor}20` }}
          >
            <span style={{ fontSize: '20px', fontWeight: 900, color: levelColor }}>
              {level}
            </span>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
              Total Level
            </p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Lv.{level} {title}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            {totalXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
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
