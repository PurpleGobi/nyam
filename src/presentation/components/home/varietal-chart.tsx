'use client'

interface VarietalData {
  name: string
  nameKo: string
  count: number
  bodyOrder: number
}

interface VarietalChartProps {
  varieties: VarietalData[]
}

export function VarietalChart({ varieties }: VarietalChartProps) {
  const sorted = [...varieties].sort((a, b) => a.bodyOrder - b.bodyOrder)
  const maxCount = Math.max(...sorted.map((v) => v.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((varietal) => {
        const widthPercent = (varietal.count / maxCount) * 100

        return (
          <div key={varietal.name} className="flex items-center gap-3">
            <div className="w-[80px] shrink-0 text-right">
              <p className="text-[12px]" style={{ color: 'var(--text-sub)' }}>
                {varietal.nameKo}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                {varietal.name}
              </p>
            </div>
            <div className="relative h-[20px] flex-1">
              <div
                className="absolute inset-0 rounded"
                style={{ backgroundColor: 'var(--bg)' }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: 'var(--accent-wine)',
                  opacity: 0.8,
                }}
              />
            </div>
            <span
              className="w-[28px] shrink-0 text-right text-[11px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              {varietal.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
