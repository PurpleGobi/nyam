'use client'

import type { Wine } from '@/domain/entities/wine'

interface WineFactsTableProps {
  wine: Wine
}

function DotScale({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: i < value ? 'var(--accent-wine)' : 'var(--bg-elevated)',
            border: i < value ? 'none' : '1px solid var(--border)',
          }}
        />
      ))}
    </span>
  )
}

const BODY_LABELS: Record<number, string> = { 1: 'Light', 2: 'Medium-Light', 3: 'Medium', 4: 'Medium-Full', 5: 'Full' }
const ACIDITY_LABELS: Record<number, string> = { 1: '낮음', 2: '약간 낮음', 3: '보통', 4: '높음', 5: '매우 높음' }
const SWEETNESS_LABELS: Record<number, string> = { 1: '드라이', 2: '오프 드라이', 3: '미디엄', 4: '스위트', 5: '매우 스위트' }

/** 참고 시세 포맷: 만원 단위 반올림, 1만 미만은 원 단위 */
function formatPrice(price: number): string {
  if (price >= 10000) {
    const man = Math.round(price / 10000)
    return `≈ ${man}만원`
  }
  return `≈ ${price.toLocaleString()}원`
}

/** 품종 비율 문자열 생성 */
function formatGrapeVarieties(wine: Wine): string | null {
  if (wine.grapeVarieties.length > 0) {
    return wine.grapeVarieties
      .map((g) => g.pct > 0 ? `${g.name} ${g.pct}%` : g.name)
      .join(', ')
  }
  return wine.variety ?? null
}

export function WineFactsTable({ wine }: WineFactsTableProps) {
  const rows: { label: string; value: React.ReactNode }[] = []

  const varietyText = formatGrapeVarieties(wine)
  if (varietyText) rows.push({ label: '품종', value: varietyText })

  if (wine.country || wine.region) {
    rows.push({ label: '산지', value: [wine.country, wine.region, wine.subRegion].filter(Boolean).join(' ') })
  }
  if (wine.abv) rows.push({ label: '알코올', value: `${wine.abv}%` })
  if (wine.bodyLevel) {
    rows.push({
      label: '바디',
      value: (
        <span className="inline-flex items-center gap-2">
          <DotScale value={wine.bodyLevel} />
          <span>{BODY_LABELS[wine.bodyLevel] ?? ''}</span>
        </span>
      ),
    })
  }
  if (wine.acidityLevel) {
    rows.push({
      label: '산미',
      value: (
        <span className="inline-flex items-center gap-2">
          <DotScale value={wine.acidityLevel} />
          <span>{ACIDITY_LABELS[wine.acidityLevel] ?? ''}</span>
        </span>
      ),
    })
  }
  if (wine.sweetnessLevel) {
    rows.push({
      label: '당도',
      value: (
        <span className="inline-flex items-center gap-2">
          <DotScale value={wine.sweetnessLevel} />
          <span>{SWEETNESS_LABELS[wine.sweetnessLevel] ?? ''}</span>
        </span>
      ),
    })
  }
  if (wine.servingTemp) rows.push({ label: '적정 온도', value: wine.servingTemp })
  if (wine.decanting) rows.push({ label: '디캔팅', value: wine.decanting })
  if (wine.referencePriceMin || wine.referencePriceMax) {
    const priceText = wine.referencePriceMin && wine.referencePriceMax
      ? `${formatPrice(wine.referencePriceMin)}~${formatPrice(wine.referencePriceMax)}`
      : formatPrice(wine.referencePriceMin ?? wine.referencePriceMax ?? 0)
    rows.push({ label: '적정가', value: priceText })
  }
  if (wine.drinkingWindowStart && wine.drinkingWindowEnd) {
    rows.push({ label: '음용 적기', value: `${wine.drinkingWindowStart}–${wine.drinkingWindowEnd}` })
  }
  if (wine.vivinoRating) {
    rows.push({
      label: 'Vivino',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span style={{ fontWeight: 700, color: 'var(--accent-wine)' }}>{wine.vivinoRating}</span>
          <span style={{ color: 'var(--text-hint)' }}>/ 5.0</span>
        </span>
      ),
    })
  }

  if (rows.length === 0) return null

  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center py-3"
          style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : undefined }}
        >
          <span
            className="w-[80px] shrink-0"
            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-sub)' }}
          >
            {row.label}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
