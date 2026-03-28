'use client'

import type { MapMarker } from '@/domain/entities/profile'

interface RestaurantMapProps {
  markers: MapMarker[]
}

/** 간이 SVG 세계 지도 + 도시별 마커 */
export function RestaurantMap({ markers }: RestaurantMapProps) {
  if (markers.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-8"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
          아직 방문 기록이 없어요
        </p>
      </div>
    )
  }

  const maxCount = Math.max(...markers.map((m) => m.count))

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-xl"
        style={{ backgroundColor: '#1a1520', border: '1px solid var(--border)', aspectRatio: '2 / 1' }}
      >
        <svg
          viewBox="0 0 360 180"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 간이 대륙 윤곽 */}
          <rect x="0" y="0" width="360" height="180" fill="transparent" />
          {/* 아시아 */}
          <ellipse cx="260" cy="70" rx="60" ry="40" fill="var(--border)" opacity="0.15" />
          {/* 유럽 */}
          <ellipse cx="190" cy="55" rx="25" ry="20" fill="var(--border)" opacity="0.15" />
          {/* 북미 */}
          <ellipse cx="90" cy="60" rx="40" ry="30" fill="var(--border)" opacity="0.15" />
          {/* 남미 */}
          <ellipse cx="110" cy="120" rx="20" ry="30" fill="var(--border)" opacity="0.15" />
          {/* 아프리카 */}
          <ellipse cx="190" cy="105" rx="20" ry="30" fill="var(--border)" opacity="0.15" />
          {/* 오세아니아 */}
          <ellipse cx="300" cy="130" rx="25" ry="15" fill="var(--border)" opacity="0.15" />

          {/* 도시 마커 */}
          {markers.map((marker) => {
            const x = ((marker.lng + 180) / 360) * 360
            const y = ((90 - marker.lat) / 180) * 180
            const size = getMarkerSize(marker.count, maxCount)
            return (
              <g key={`${marker.country}-${marker.city}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill="var(--accent-food)"
                  opacity={getMarkerOpacity(marker.count, maxCount)}
                />
                {marker.count >= 6 && (
                  <text
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="700"
                  >
                    {marker.count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4">
        <Legend label="1~2곳" opacity={0.4} />
        <Legend label="3~5곳" opacity={0.7} />
        <Legend label="6곳+" opacity={1.0} />
      </div>
    </div>
  )
}

function getMarkerSize(count: number, max: number): number {
  if (count >= 6) return 10
  if (count >= 3) return 7
  return 5
}

function getMarkerOpacity(count: number, max: number): number {
  if (count >= 6) return 1.0
  if (count >= 3) return 0.7
  return 0.4
}

function Legend({ label, opacity }: { label: string; opacity: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: 'var(--accent-food)', opacity }}
      />
      <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>{label}</span>
    </div>
  )
}
