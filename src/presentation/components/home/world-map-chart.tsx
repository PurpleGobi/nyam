'use client'

interface CityData {
  name: string
  country: string
  lat: number
  lng: number
  visitCount: number
}

interface WorldMapChartProps {
  cities: CityData[]
  totalCountries: number
  totalPlaces: number
}

export function WorldMapChart({ cities, totalCountries, totalPlaces }: WorldMapChartProps) {
  const svgWidth = 320
  const svgHeight = 160

  function toSvgX(lng: number): number {
    return ((lng + 180) / 360) * svgWidth
  }

  function toSvgY(lat: number): number {
    return ((90 - lat) / 180) * svgHeight
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary label */}
      <div className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
        {totalCountries}개국 {totalPlaces}곳
      </div>

      {/* SVG Map */}
      <div
        className="overflow-hidden rounded-[14px]"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: 14,
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ height: 'auto' }}
        >
          {/* Simplified continent silhouettes */}
          {/* North America */}
          <path
            d="M20,25 L65,15 L85,30 L80,55 L60,70 L45,65 L30,50 Z"
            fill="var(--bg-page)"
          />
          {/* South America */}
          <path
            d="M60,75 L75,72 L85,90 L80,120 L65,135 L55,115 L50,90 Z"
            fill="var(--bg-page)"
          />
          {/* Europe */}
          <path
            d="M140,20 L170,15 L175,30 L165,45 L150,45 L140,35 Z"
            fill="var(--bg-page)"
          />
          {/* Africa */}
          <path
            d="M145,50 L175,48 L185,75 L175,110 L155,115 L140,95 L138,70 Z"
            fill="var(--bg-page)"
          />
          {/* Asia */}
          <path
            d="M180,15 L260,10 L280,30 L270,55 L240,60 L210,50 L185,40 Z"
            fill="var(--bg-page)"
          />
          {/* Oceania */}
          <path
            d="M250,90 L290,85 L300,100 L285,115 L255,110 Z"
            fill="var(--bg-page)"
          />

          {/* City markers */}
          {cities.map((city) => {
            const r = 3 + Math.min(city.visitCount, 6)
            const cx = toSvgX(city.lng)
            const cy = toSvgY(city.lat)

            return (
              <g key={`${city.name}-${city.lat}-${city.lng}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="var(--accent-food)"
                  opacity={0.8}
                />
                {/* Label inside marker for larger markers */}
                {city.visitCount >= 3 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight={700}
                    fill="#fff"
                  >
                    {city.visitCount}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend — sizes match marker formula: r = 3 + min(visitCount, 6) */}
        <div
          className="mt-[8px] flex justify-center gap-[12px]"
          style={{ fontSize: 9, color: 'var(--text-hint)' }}
        >
          <span className="flex items-center gap-[3px]">
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: 'var(--accent-food)',
                opacity: 0.8,
              }}
            />
            1~2곳
          </span>
          <span className="flex items-center gap-[3px]">
            <span
              className="inline-block rounded-full"
              style={{
                width: 12,
                height: 12,
                backgroundColor: 'var(--accent-food)',
                opacity: 0.8,
              }}
            />
            3~5곳
          </span>
          <span className="flex items-center gap-[3px]">
            <span
              className="inline-block rounded-full"
              style={{
                width: 18,
                height: 18,
                backgroundColor: 'var(--accent-food)',
                opacity: 0.8,
              }}
            />
            6곳+
          </span>
        </div>
      </div>
    </div>
  )
}
