'use client'

import { MapPin } from 'lucide-react'

interface CityData {
  name: string
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
  const svgWidth = 360
  const svgHeight = 180

  function toSvgX(lng: number): number {
    return ((lng + 180) / 360) * svgWidth
  }

  function toSvgY(lat: number): number {
    return ((90 - lat) / 180) * svgHeight
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} style={{ color: 'var(--accent-food)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-sub)' }}>
            {totalCountries}개국 · {totalPlaces}곳
          </span>
        </div>
      </div>

      {/* SVG Map placeholder */}
      <div
        className="overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full"
          style={{ height: 'auto' }}
        >
          {/* Background grid lines */}
          {[0, 60, 120, 180, 240, 300, 360].map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={svgHeight}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
          ))}
          {[0, 45, 90, 135, 180].map((y) => (
            <line
              key={`h-${y}`}
              x1={0}
              y1={y}
              x2={svgWidth}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
          ))}

          {/* City dots */}
          {cities.map((city) => {
            const r = Math.min(3 + city.visitCount * 1.5, 10)
            return (
              <g key={`${city.name}-${city.lat}-${city.lng}`}>
                <circle
                  cx={toSvgX(city.lng)}
                  cy={toSvgY(city.lat)}
                  r={r}
                  fill="var(--accent-food)"
                  opacity={0.7}
                />
                <circle
                  cx={toSvgX(city.lng)}
                  cy={toSvgY(city.lat)}
                  r={r + 3}
                  fill="var(--accent-food)"
                  opacity={0.15}
                />
              </g>
            )
          })}
        </svg>
      </div>

      {/* City list */}
      {cities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cities.slice(0, 8).map((city) => (
            <span
              key={`${city.name}-${city.lat}-${city.lng}`}
              className="rounded-full px-2.5 py-1 text-[11px]"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-sub)',
              }}
            >
              {city.name} {city.visitCount}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
