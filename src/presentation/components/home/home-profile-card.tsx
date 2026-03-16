'use client'

import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

type TasteMode = 'food' | 'wine'

const RADAR_LABELS = ['매운맛', '단맛', '짠맛', '신맛', '감칠맛', '풍미']
const RADAR_KEYS = ['spicy', 'sweet', 'salty', 'sour', 'umami', 'rich'] as const

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function radarPoints(
  cx: number,
  cy: number,
  maxR: number,
  values: number[],
): string {
  return values
    .map((v, i) => {
      const angle = (360 / values.length) * i
      const r = (v / 100) * maxR
      const { x, y } = polarToCartesian(cx, cy, r, angle)
      return `${x},${y}`
    })
    .join(' ')
}

function gridPolygon(cx: number, cy: number, r: number, sides: number): string {
  return Array.from({ length: sides })
    .map((_, i) => {
      const angle = (360 / sides) * i
      const { x, y } = polarToCartesian(cx, cy, r, angle)
      return `${x},${y}`
    })
    .join(' ')
}

export function HomeProfileCard({
  nickname,
  stats,
  tasteTypeCode,
  tasteDna,
  experienceRegions,
  experienceGenres,
  experienceScenes,
}: {
  nickname: string
  stats: { records: number; places: number; groups: number }
  tasteTypeCode: string
  tasteDna: {
    spicy: number
    sweet: number
    salty: number
    sour: number
    umami: number
    rich: number
  } | null
  experienceRegions: { name: string; level: number }[]
  experienceGenres: { name: string; level: number }[]
  experienceScenes: { name: string; level: number; icon: React.ReactNode }[]
}) {
  const [tasteMode, setTasteMode] = useState<TasteMode>('food')

  const initial = nickname.charAt(0).toUpperCase()
  const dnaValues = tasteDna
    ? RADAR_KEYS.map((k) => tasteDna[k])
    : [0, 0, 0, 0, 0, 0]

  // Top 3 taste tags by value
  const top3 = tasteDna
    ? [...RADAR_KEYS]
        .sort((a, b) => tasteDna[b] - tasteDna[a])
        .slice(0, 3)
        .map((k) => ({
          key: k,
          label: RADAR_LABELS[RADAR_KEYS.indexOf(k)],
          value: tasteDna[k],
        }))
    : []

  const CX = 64
  const CY = 64
  const MAX_R = 50

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      {/* Top row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] text-sm font-bold text-white">
          {initial}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
            {nickname}의 맛 노트
          </span>
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-neutral-500)]">
            <span>기록 {stats.records}</span>
            <span>장소 {stats.places}</span>
            <span>버블 {stats.groups}</span>
          </div>
        </div>
        <span className="rounded-full bg-[var(--color-primary-50)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary-600)]">
          {tasteTypeCode}
        </span>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[var(--color-neutral-100)]" />

      {/* Two-column layout */}
      <div className="flex gap-4">
        {/* Left: Taste DNA */}
        <div className="flex flex-1 flex-col items-center">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">
            Taste DNA
          </span>

          {/* Food/Wine toggle */}
          <div className="mb-2 flex rounded-full bg-[var(--color-neutral-100)] p-0.5">
            {(['food', 'wine'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTasteMode(mode)}
                className={cn(
                  'rounded-full px-3 py-0.5 text-[10px] font-medium transition-colors',
                  tasteMode === mode
                    ? 'bg-white text-[var(--color-neutral-800)] shadow-sm'
                    : 'text-[var(--color-neutral-400)]',
                )}
              >
                {mode === 'food' ? 'Food' : 'Wine'}
              </button>
            ))}
          </div>

          {/* Inline SVG radar chart */}
          <svg
            width={128}
            height={128}
            viewBox="0 0 128 128"
            className="mb-2"
          >
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map((scale) => (
              <polygon
                key={scale}
                points={gridPolygon(CX, CY, MAX_R * scale, 6)}
                fill="none"
                stroke="var(--color-neutral-200)"
                strokeWidth={0.5}
              />
            ))}

            {/* Axis lines */}
            {RADAR_LABELS.map((_, i) => {
              const angle = (360 / 6) * i
              const end = polarToCartesian(CX, CY, MAX_R, angle)
              return (
                <line
                  key={i}
                  x1={CX}
                  y1={CY}
                  x2={end.x}
                  y2={end.y}
                  stroke="var(--color-neutral-200)"
                  strokeWidth={0.5}
                />
              )
            })}

            {/* Data polygon */}
            <polygon
              points={radarPoints(CX, CY, MAX_R, dnaValues)}
              fill="var(--color-primary-500)"
              fillOpacity={0.2}
              stroke="var(--color-primary-500)"
              strokeWidth={1.5}
            />

            {/* Data points */}
            {dnaValues.map((v, i) => {
              const angle = (360 / 6) * i
              const r = (v / 100) * MAX_R
              const { x, y } = polarToCartesian(CX, CY, r, angle)
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2.5}
                  fill="var(--color-primary-500)"
                />
              )
            })}

            {/* Axis labels */}
            {RADAR_LABELS.map((label, i) => {
              const angle = (360 / 6) * i
              const { x, y } = polarToCartesian(CX, CY, MAX_R + 10, angle)
              return (
                <text
                  key={label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-[var(--color-neutral-500)]"
                  fontSize={8}
                >
                  {label}
                </text>
              )
            })}
          </svg>

          {/* Top 3 taste tags */}
          <div className="flex flex-wrap justify-center gap-1">
            {top3.map((t) => (
              <span
                key={t.key}
                className="rounded-full bg-[var(--color-primary-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-600)]"
              >
                {t.label} {t.value}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Experience */}
        <div className="flex flex-1 flex-col">
          <span className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">
            Experience
          </span>

          {/* WHERE - regions */}
          <div className="mb-2">
            <span className="text-[9px] font-semibold text-[var(--color-neutral-400)]">
              WHERE
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {experienceRegions.map((r) => (
                <span
                  key={r.name}
                  className="rounded-full bg-[var(--color-neutral-100)] px-2 py-0.5 font-medium text-[var(--color-neutral-600)]"
                  style={{
                    fontSize: Math.max(8, Math.min(12, 8 + r.level * 0.8)),
                  }}
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>

          {/* WHAT - genres (tag cloud) */}
          <div className="mb-2">
            <span className="text-[9px] font-semibold text-[var(--color-neutral-400)]">
              WHAT
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {experienceGenres.map((g) => (
                <span
                  key={g.name}
                  className="text-[var(--color-neutral-700)]"
                  style={{
                    fontSize: Math.max(9, Math.min(14, 9 + g.level)),
                    fontWeight: g.level >= 3 ? 600 : 400,
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>

          {/* WHY - scenes (icon badges) */}
          <div>
            <span className="text-[9px] font-semibold text-[var(--color-neutral-400)]">
              WHY
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {experienceScenes.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-neutral-50)] px-2 py-0.5 text-[10px] text-[var(--color-neutral-600)]"
                  style={{ opacity: Math.max(0.4, Math.min(1, 0.3 + s.level * 0.15)) }}
                >
                  <span className="flex-shrink-0">{s.icon}</span>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
