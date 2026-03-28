'use client'

interface Bucket {
  label: string
  count: number
}

interface ScoreDistributionProps {
  buckets: Bucket[]
  accentColor: string
  onBucketTap?: (label: string) => void
}

export function ScoreDistribution({
  buckets,
  accentColor,
  onBucketTap,
}: ScoreDistributionProps) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <div>
      <div
        className="flex items-end justify-between gap-[8px] px-[16px]"
        style={{ height: 120 }}
      >
        {buckets.map((bucket) => {
          const heightPercent = bucket.count > 0
            ? (bucket.count / maxCount) * 100
            : 0
          const barHeight = Math.max(heightPercent, 2)
          const opacity = bucket.count > 0
            ? 0.3 + (bucket.count / maxCount) * 0.7
            : 0.15
          const isLong = heightPercent > 40

          return (
            <div
              key={bucket.label}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%', cursor: onBucketTap ? 'pointer' : undefined }}
              onClick={() => onBucketTap?.(bucket.label)}
            >
              {/* Count outside (short bars) */}
              {!isLong && bucket.count > 0 && (
                <span
                  className="mb-[2px] text-[10px]"
                  style={{ fontWeight: 700, color: accentColor }}
                >
                  {bucket.count}
                </span>
              )}

              {/* Bar */}
              <div
                className="relative w-full rounded-t-[4px]"
                style={{
                  height: `${barHeight}%`,
                  minHeight: 2,
                  backgroundColor: accentColor,
                  opacity,
                }}
              >
                {/* Count inside (long bars) */}
                {isLong && bucket.count > 0 && (
                  <span
                    className="absolute bottom-[4px] w-full text-center text-[10px]"
                    style={{ fontWeight: 800, color: '#fff' }}
                  >
                    {bucket.count}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex gap-[8px] px-[16px] pt-[4px]">
        {buckets.map((bucket) => (
          <div
            key={bucket.label}
            className="flex-1 text-center text-[10px]"
            style={{ color: 'var(--text-hint)' }}
          >
            {bucket.label}
          </div>
        ))}
      </div>
    </div>
  )
}
