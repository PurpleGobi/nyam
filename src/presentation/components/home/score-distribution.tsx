'use client'

interface Bucket {
  label: string
  count: number
}

interface ScoreDistributionProps {
  buckets: Bucket[]
  accentColor: string
}

export function ScoreDistribution({ buckets, accentColor }: ScoreDistributionProps) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height: 120 }}>
      {buckets.map((bucket) => {
        const heightPercent = (bucket.count / maxCount) * 100
        const barHeight = Math.max(heightPercent, 4)

        return (
          <div key={bucket.label} className="flex flex-1 flex-col items-center gap-1.5">
            {/* Count label */}
            <span
              className="text-[10px] font-medium"
              style={{ color: bucket.count > 0 ? 'var(--text)' : 'var(--text-hint)' }}
            >
              {bucket.count}
            </span>

            {/* Bar */}
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[36px] rounded-t transition-all duration-300"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: accentColor,
                  opacity: bucket.count > 0 ? 0.8 : 0.2,
                }}
              />
            </div>

            {/* Label */}
            <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
              {bucket.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
