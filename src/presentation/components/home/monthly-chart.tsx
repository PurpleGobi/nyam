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
}

function formatWon(value: number): string {
  if (value >= 10000) {
    return `₩${(value / 10000).toFixed(1)}만`
  }
  return `₩${value.toLocaleString('ko-KR')}`
}

export function MonthlyChart({ months, totalAmount, accentColor }: MonthlyChartProps) {
  const maxCount = Math.max(...months.map((m) => m.count), 1)

  return (
    <div className="flex flex-col gap-3">
      {/* Total amount */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
          6개월 합계
        </span>
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {formatWon(totalAmount)}
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1.5" style={{ height: 100 }}>
        {months.map((month) => {
          const heightPercent = (month.count / maxCount) * 100
          const barHeight = Math.max(heightPercent, 4)

          return (
            <div key={month.label} className="flex flex-1 flex-col items-center gap-1.5">
              {/* Count */}
              <span
                className="text-[10px] font-medium"
                style={{ color: month.count > 0 ? 'var(--text)' : 'var(--text-hint)' }}
              >
                {month.count}
              </span>

              {/* Bar */}
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[36px] rounded-t transition-all duration-300"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: accentColor,
                    opacity: month.isCurrent ? 1 : 0.6,
                    border: month.isCurrent ? `1.5px solid ${accentColor}` : 'none',
                  }}
                />
              </div>

              {/* Month label */}
              <span
                className="text-[10px]"
                style={{
                  color: month.isCurrent ? 'var(--text)' : 'var(--text-hint)',
                  fontWeight: month.isCurrent ? 600 : 400,
                }}
              >
                {month.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
