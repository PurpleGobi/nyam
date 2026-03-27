'use client'

import { Globe } from 'lucide-react'

interface RegionData {
  region: string
  count: number
}

interface WineRegionMapProps {
  data: RegionData[]
}

export function WineRegionMap({ data }: WineRegionMapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const sortedData = [...data].sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Globe size={14} style={{ color: 'var(--accent-wine)' }} />
        <span className="text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {data.length}개 지역
        </span>
      </div>

      {/* Region list with bars */}
      <div className="flex flex-col gap-2">
        {sortedData.map((item) => {
          const widthPercent = (item.count / maxCount) * 100

          return (
            <div key={item.region} className="flex items-center gap-3">
              <span
                className="w-[80px] shrink-0 text-right text-[12px]"
                style={{ color: 'var(--text-sub)' }}
              >
                {item.region}
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
                    backgroundColor: 'var(--accent-wine)',
                    opacity: 0.8,
                  }}
                />
              </div>
              <span
                className="w-[28px] shrink-0 text-right text-[11px] font-medium"
                style={{ color: 'var(--text)' }}
              >
                {item.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
