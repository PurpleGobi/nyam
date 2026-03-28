'use client'

interface VerticalBarChartItem {
  label: string
  value: number
  highlight?: boolean
}

interface VerticalBarChartProps {
  title: string
  items: VerticalBarChartItem[]
  colorBase: string
  valueLabel?: string
  totalLabel?: string
}

const MAX_BAR_HEIGHT = 120

export function VerticalBarChart({
  title,
  items,
  colorBase,
  valueLabel,
  totalLabel,
}: VerticalBarChartProps) {
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 1)

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <div className="flex items-start justify-between">
        <h3 className="text-[13px] font-bold text-foreground">{title}</h3>
        {totalLabel && (
          <span className="text-[12px] text-sub">{totalLabel}</span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-around gap-1">
        {items.map((item) => {
          const heightPx =
            maxValue > 0
              ? Math.max(4, (item.value / maxValue) * MAX_BAR_HEIGHT)
              : 4

          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[11px] text-hint">
                {item.value}
                {valueLabel ?? ''}
              </span>

              <div
                className="rounded-md transition-all duration-300"
                style={{
                  height: `${heightPx}px`,
                  width: item.highlight ? 32 : 24,
                  backgroundColor: colorBase,
                  opacity: item.highlight ? 1 : 0.6,
                }}
              />

              <span className="mt-1 text-[11px] text-hint">
                {item.label}
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
