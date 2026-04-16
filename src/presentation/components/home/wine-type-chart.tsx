'use client'

interface WineTypeChartProps {
  types: { type: string; label: string; count: number }[]
}

const TYPE_COLORS: Record<string, string> = {
  red: '#722F37',
  white: '#D4C98A',
  rose: '#E8A0B0',
  sparkling: '#C8D8A0',
}

export function WineTypeChart({ types }: WineTypeChartProps) {
  if (types.length === 0) return null

  const maxCount = Math.max(...types.map((t) => t.count), 1)

  return (
    <div className="flex flex-col gap-2">
      {types.map((t) => {
          const ratio = t.count / maxCount
          const color = TYPE_COLORS[t.type] ?? 'var(--accent-wine)'

          return (
            <div key={t.type} className="flex items-center gap-2">
              <span
                className="w-[60px] text-right text-[12px] font-semibold"
                style={{ color: 'var(--text-sub)' }}
              >
                {t.label}
              </span>
              <div
                className="flex-1"
                style={{
                  height: '16px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--bg-page)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${ratio * 100}%`,
                    minWidth: t.count > 0 ? '4px' : 0,
                    borderRadius: '3px',
                    backgroundColor: color,
                    opacity: 0.3 + ratio * 0.7,
                  }}
                />
              </div>
              <span
                className="w-[20px] text-[11px] font-extrabold"
                style={{ color }}
              >
                {t.count}
              </span>
            </div>
          )
        })}
    </div>
  )
}
