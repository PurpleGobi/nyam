'use client'

import type { Wine } from '@/domain/entities/wine'

interface WineFactsTableProps {
  wine: Wine
}

function DotScale({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < value ? 'var(--accent-wine)' : 'var(--border-bold)' }}>
          {i < value ? '●' : '○'}
        </span>
      ))}
    </span>
  )
}

const BODY_LABELS: Record<number, string> = { 1: 'Light', 2: 'Light-Medium', 3: 'Medium', 4: 'Medium-Full', 5: 'Full' }
const ACIDITY_LABELS: Record<number, string> = { 1: '낮음', 2: '중간', 3: '높음' }
const SWEETNESS_LABELS: Record<number, string> = { 1: '드라이', 2: '중간', 3: '스위트' }

export function WineFactsTable({ wine }: WineFactsTableProps) {
  const rows: { label: string; value: React.ReactNode }[] = []

  if (wine.variety) rows.push({ label: '품종', value: wine.variety })
  if (wine.country || wine.region) {
    rows.push({ label: '산지', value: [wine.country, wine.region, wine.subRegion].filter(Boolean).join(' ') })
  }
  if (wine.abv) rows.push({ label: '알코올', value: `${wine.abv}%` })
  if (wine.bodyLevel) {
    rows.push({
      label: '바디',
      value: <><DotScale value={wine.bodyLevel} /> <span style={{ marginLeft: '4px' }}>{BODY_LABELS[wine.bodyLevel] ?? ''}</span></>,
    })
  }
  if (wine.acidityLevel) {
    rows.push({
      label: '산미',
      value: <><DotScale value={wine.acidityLevel} max={3} /> <span style={{ marginLeft: '4px' }}>{ACIDITY_LABELS[wine.acidityLevel] ?? ''}</span></>,
    })
  }
  if (wine.sweetnessLevel) {
    rows.push({
      label: '당도',
      value: <><DotScale value={wine.sweetnessLevel} max={3} /> <span style={{ marginLeft: '4px' }}>{SWEETNESS_LABELS[wine.sweetnessLevel] ?? ''}</span></>,
    })
  }
  if (wine.servingTemp) rows.push({ label: '적정 온도', value: wine.servingTemp })
  if (wine.decanting) rows.push({ label: '디캔팅', value: wine.decanting })
  if (wine.referencePrice) rows.push({ label: '시세', value: `≈ ${wine.referencePrice.toLocaleString()}원` })
  if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
    rows.push({ label: '음용 적기', value: `${wine.drinkingWindowStart}–${wine.drinkingWindowEnd}` })
  }

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center py-2"
          style={{ borderBottom: i < rows.length - 1 ? '1px solid #F0EDE8' : undefined }}
        >
          <span className="w-[90px] shrink-0" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-sub)' }}>
            {row.label}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
