'use client'

import type { BarChartItem } from '@/domain/entities/profile'

interface HorizontalBarChartProps {
  title: string
  items: BarChartItem[]
  colorBase: string
  maxItems?: number
}

export function HorizontalBarChart({
  title,
  items,
  colorBase,
  maxItems = 8,
}: HorizontalBarChartProps) {
  const sorted = [...items]
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems)

  const maxValue = sorted.length > 0 ? sorted[0].value : 1

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <h3 className="text-[13px] font-bold text-foreground">{title}</h3>

      <div className="mt-3 flex flex-col gap-2">
        {sorted.map((item, idx) => {
          const rank = idx + 1
          const widthPct = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const opacity = Math.max(0.3, 1 - idx * 0.1)

          return (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-right text-[11px] text-muted-foreground">
                {rank}
              </span>

              <span className="w-16 shrink-0 truncate text-[12px] text-foreground">
                {item.label}
              </span>

              <div className="relative flex-1 h-5 rounded-md overflow-hidden bg-muted/30">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-300"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: colorBase,
                    opacity,
                  }}
                />
              </div>

              <span className="w-6 shrink-0 text-right text-[11px] text-muted-foreground">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>

      {items.length === 0 && (
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          데이터가 없습니다
        </p>
      )}
    </div>
  )
}
