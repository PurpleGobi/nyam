'use client'

interface WineTypeData {
  type: string
  count: number
  color: string
}

interface WineTypeChartProps {
  types: WineTypeData[]
}

export function WineTypeChart({ types }: WineTypeChartProps) {
  const maxCount = Math.max(...types.map((t) => t.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {types.map((wineType) => {
        const widthPercent = (wineType.count / maxCount) * 100

        return (
          <div key={wineType.type} className="flex items-center gap-3">
            <span
              className="w-[72px] shrink-0 text-right text-[12px]"
              style={{ color: 'var(--text-sub)' }}
            >
              {wineType.type}
            </span>
            <div className="relative h-[20px] flex-1">
              <div
                className="absolute inset-0 rounded"
                style={{ backgroundColor: 'var(--bg)' }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: wineType.color,
                  opacity: 0.8,
                }}
              />
            </div>
            <span
              className="w-[28px] shrink-0 text-right text-[11px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              {wineType.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
