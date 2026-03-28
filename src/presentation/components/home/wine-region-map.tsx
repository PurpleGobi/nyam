'use client'

import { useState } from 'react'
import { ChevronLeft, Wine } from 'lucide-react'

interface WineDot {
  type: string
  count: number
}

interface RegionData {
  name: string
  visitCount: number
  dots: WineDot[]
}

interface CountryData {
  name: string
  lat: number
  lng: number
  visitCount: number
  explored: boolean
  dots: WineDot[]
  regions?: RegionData[]
}

interface WineRegionMapProps {
  data: CountryData[]
  onDrillDown?: (country: string, region?: string) => void
}

const DOT_COLORS: Record<string, string> = {
  red: '#722F37',
  white: '#D4C98A',
  rose: '#E8A0B0',
  sparkling: '#C8D8A0',
}

const DOT_LABELS: Record<string, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
}

const svgWidth = 440
const svgHeight = 220

function toSvgX(lng: number): number {
  return ((lng + 180) / 360) * svgWidth
}
function toSvgY(lat: number): number {
  return ((90 - lat) / 180) * svgHeight
}

export function WineRegionMap({ data, onDrillDown }: WineRegionMapProps) {
  const [level, setLevel] = useState<0 | 1 | 2>(0)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const handleCountryTap = (name: string) => {
    setSelectedCountry(name)
    setLevel(1)
    onDrillDown?.(name)
  }

  const handleRegionTap = (regionName: string) => {
    setSelectedRegion(regionName)
    setLevel(2)
    onDrillDown?.(selectedCountry ?? '', regionName)
  }

  const handleBack = () => {
    if (level === 2) {
      setSelectedRegion(null)
      setLevel(1)
    } else {
      setSelectedCountry(null)
      setLevel(0)
    }
  }

  const selected = data.find((c) => c.name === selectedCountry)
  const selectedReg = selected?.regions?.find((r) => r.name === selectedRegion)

  return (
    <div className="overflow-hidden rounded-[18px]" style={{ background: '#1a1520' }}>
      {/* Navigation */}
      <div className="flex items-center gap-[8px] px-[16px] py-[10px]">
        {level > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-[2px] rounded-[8px] px-[10px] py-[4px] text-[12px]"
            style={{
              fontWeight: 600,
              color: 'var(--text-sub)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <ChevronLeft size={14} />
            뒤로
          </button>
        )}
        <span
          className="flex-1 text-[13px] font-semibold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          산지
        </span>
        {level === 0 && (
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            탭하여 확대
          </span>
        )}
      </div>

      {/* Level 0: World */}
      {level === 0 && (
        <div className="px-[8px] pb-[12px]">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full">
            {/* Continent silhouettes */}
            <path d="M30,35 L100,20 L130,45 L125,85 L95,105 L70,100 L45,78 Z" fill="#2a2030" />
            <path d="M95,110 L120,105 L135,140 L125,185 L100,200 L85,175 L78,140 Z" fill="#2a2030" />
            <path d="M195,28 L240,20 L245,45 L230,65 L210,65 L195,50 Z" fill="#2a2030" />
            <path d="M205,70 L245,68 L260,105 L245,160 L218,168 L195,140 L192,100 Z" fill="#2a2030" />
            <path d="M250,20 L370,12 L395,45 L380,80 L335,88 L295,75 L258,58 Z" fill="#2a2030" />
            <path d="M350,130 L405,122 L420,148 L400,168 L358,162 Z" fill="#2a2030" />

            {/* Country markers */}
            {data.map((country) => {
              const cx = toSvgX(country.lng)
              const cy = toSvgY(country.lat)
              const r = 8 + Math.min(country.visitCount, 8) * 1.5

              // Unexplored countries: dashed circle
              if (!country.explored) {
                return (
                  <g key={country.name}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={8}
                      fontWeight={600}
                      fill="rgba(255,255,255,0.3)"
                    >
                      ?
                    </text>
                  </g>
                )
              }

              return (
                <g
                  key={country.name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleCountryTap(country.name)}
                >
                  <circle cx={cx} cy={cy} r={r} fill="var(--accent-wine)" opacity={0.9} />
                  <text
                    x={cx}
                    y={cy - 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fontWeight={800}
                    fill="white"
                  >
                    {country.visitCount}
                  </text>

                  {/* Wine type dots around marker */}
                  {country.dots.map((dot, i) => {
                    const angle = (i * 2 * Math.PI) / Math.max(country.dots.length, 1) - Math.PI / 2
                    const dotR = r + 5
                    const dx = cx + Math.cos(angle) * dotR
                    const dy = cy + Math.sin(angle) * dotR

                    return (
                      <circle
                        key={`${country.name}-${dot.type}`}
                        cx={dx}
                        cy={dy}
                        r={2.5}
                        fill={DOT_COLORS[dot.type] ?? '#999'}
                        stroke="#1a1520"
                        strokeWidth={0.8}
                      />
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <div
            className="flex justify-center gap-[12px] px-[16px] pt-[8px]"
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}
          >
            {Object.entries(DOT_COLORS).map(([type, color]) => (
              <span key={type} className="flex items-center gap-[4px]">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, backgroundColor: color }}
                />
                {DOT_LABELS[type]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Level 1: Country detail — regions list */}
      {level === 1 && selected && (
        <div className="px-[16px] pb-[16px]">
          <p
            className="mb-[12px] text-[15px] font-semibold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {selected.name} — {selected.visitCount}병
          </p>

          {/* Wine type breakdown */}
          <div className="mb-[12px] flex flex-col gap-[8px]">
            {selected.dots.map((dot) => (
              <div key={dot.type} className="flex items-center gap-[8px]">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, backgroundColor: DOT_COLORS[dot.type] ?? '#999' }}
                />
                <span className="flex-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {DOT_LABELS[dot.type] ?? dot.type}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {dot.count}병
                </span>
              </div>
            ))}
          </div>

          {/* Regions list */}
          {selected.regions && selected.regions.length > 0 && (
            <div className="flex flex-col gap-[6px] border-t border-[rgba(255,255,255,0.1)] pt-[12px]">
              <p className="mb-[4px] text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                지역별
              </p>
              {selected.regions.map((region) => (
                <button
                  key={region.name}
                  type="button"
                  onClick={() => handleRegionTap(region.name)}
                  className="flex items-center justify-between rounded-[8px] px-[10px] py-[8px]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {region.name}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-wine)' }}>
                    {region.visitCount}병
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Level 2: Region detail — sub-regions */}
      {level === 2 && selectedReg && (
        <div className="px-[16px] pb-[16px]">
          <p
            className="mb-[12px] text-[15px] font-semibold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {selectedReg.name} — {selectedReg.visitCount}병
          </p>

          {selectedReg.dots.length > 0 ? (
            <div className="flex flex-col gap-[8px]">
              {selectedReg.dots.map((dot) => (
                <div key={dot.type} className="flex items-center gap-[8px]">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: DOT_COLORS[dot.type] ?? '#999' }}
                  />
                  <span className="flex-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {DOT_LABELS[dot.type] ?? dot.type}
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {dot.count}병
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-[8px] py-[20px]">
              <Wine size={24} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {selectedReg.name} 와인을 기록해보세요
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
