'use client'

interface MonthData {
  label: string
  count: number
  amount: number
  isCurrent: boolean
}

interface MonthlyChartProps {
  months: MonthData[]
  totalAmount: number
  accentColor: string
  unit: string
}

function formatWon(value: number): string {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만`
  }
  if (value > 0) {
    return `${(value / 1000).toFixed(0)}천`
  }
  return '-'
}

export function MonthlyChart({
  months,
  totalAmount,
  accentColor,
  unit,
}: MonthlyChartProps) {
  const maxCount = Math.max(...months.map((m) => m.count), 1)

  return (
    <div className="flex flex-col gap-[8px]">
      {/* Total amount badge */}
      {totalAmount > 0 && (
        <div className="flex">
          <small
            className="rounded-[6px] px-[8px] py-[2px] text-[12px]"
            style={{
              fontWeight: 600,
              color: accentColor,
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            }}
          >
            총 {formatWon(totalAmount)}
          </small>
        </div>
      )}

      {/* Bar chart */}
      <div
        className="flex items-end justify-between gap-[6px] px-[16px]"
        style={{ height: 120 }}
      >
        {months.map((month) => {
          const heightPercent = (month.count / maxCount) * 100
          const barHeight = Math.max(heightPercent, 2)
          const opacity = 0.3 + (month.count / maxCount) * 0.7
          const isLong = heightPercent > 40

          return (
            <div
              key={month.label}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {/* Count outside */}
              {!isLong && month.count > 0 && (
                <span
                  className="mb-[2px] text-[10px]"
                  style={{ fontWeight: 700, color: accentColor }}
                >
                  {month.count}
                </span>
              )}

              <div
                className="relative w-full rounded-t-[4px]"
                style={{
                  height: `${barHeight}%`,
                  minHeight: 2,
                  backgroundColor: accentColor,
                  opacity,
                }}
              >
                {isLong && month.count > 0 && (
                  <span
                    className="absolute top-[4px] w-full text-center text-[10px]"
                    style={{ fontWeight: 800, color: 'var(--text-inverse)' }}
                  >
                    {month.count}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Month labels + amount badges */}
      <div className="flex gap-[6px] px-[16px]">
        {months.map((month) => (
          <div key={month.label} className="flex flex-1 flex-col items-center gap-[2px]">
            <span
              className="text-[9px]"
              style={{
                color: month.isCurrent ? 'var(--text)' : 'var(--text-hint)',
                fontWeight: month.isCurrent ? 600 : 400,
              }}
            >
              {month.label}
            </span>
            <span
              className="inline-block rounded-[4px] px-[4px] py-[1px] text-[8px]"
              style={{
                fontWeight: month.isCurrent ? 600 : 400,
                backgroundColor: month.isCurrent
                  ? `color-mix(in srgb, ${accentColor} 15%, transparent)`
                  : 'var(--bg-page)',
                color: month.isCurrent ? accentColor : 'var(--text-hint)',
              }}
            >
              {month.amount > 0 ? formatWon(month.amount) : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
