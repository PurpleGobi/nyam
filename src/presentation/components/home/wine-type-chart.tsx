'use client'

interface WineTypeData {
  type: string
  label: string
  count: number
  color: string
}

interface WineTypeChartProps {
  types: WineTypeData[]
}

export function WineTypeChart({ types }: WineTypeChartProps) {
  const maxCount = Math.max(...types.map((t) => t.count), 1)

  return (
    <div className="flex flex-col gap-[8px]">
      {types.map((wineType) => {
        const widthPercent = (wineType.count / maxCount) * 100
        const opacity = 0.4 + (wineType.count / maxCount) * 0.6

        return (
          <div key={wineType.type} className="flex items-center gap-[8px]">
            <span
              className="w-[78px] shrink-0 text-right text-[12px] font-semibold"
              style={{ color: 'var(--text)' }}
            >
              {wineType.label}
            </span>
            <div
              className="relative h-[16px] flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: 'var(--bg-page)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-[3px]"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: wineType.color,
                  opacity,
                }}
              />
            </div>
            <span
              className="w-[20px] shrink-0 text-right text-[11px]"
              style={{ fontWeight: 800, color: wineType.color }}
            >
              {wineType.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
