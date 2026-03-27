'use client'

import { Wine } from 'lucide-react'

interface WineConfirmCardProps {
  wineName: string
  wineType: string | null
  region: string | null
  country: string | null
  vintage: number | null
  onConfirm: () => void
  onReject: () => void
}

const WINE_TYPE_MAP: globalThis.Record<string, { label: string; className: string }> = {
  red: { label: '레드', className: 'bg-accent-wine-light text-accent-wine' },
  white: { label: '화이트', className: 'bg-accent-food-light text-accent-food' },
  rose: { label: '로제', className: 'bg-[var(--scene-romantic)]/10 text-[var(--scene-romantic)]' },
  sparkling: { label: '스파클링', className: 'bg-accent-social-light text-accent-social' },
  orange: { label: '오렌지', className: 'bg-[var(--caution)]/10 text-caution' },
  fortified: { label: '주정강화', className: 'bg-accent-food-dim text-accent-food' },
  dessert: { label: '디저트', className: 'bg-accent-wine-light text-accent-wine' },
}

export function WineConfirmCard({
  wineName,
  wineType,
  region,
  country,
  vintage,
  onConfirm,
  onReject,
}: WineConfirmCardProps) {
  const typeInfo = wineType ? WINE_TYPE_MAP[wineType] : null
  const locationParts = [region, country].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <h2 className="mb-6 text-[17px] font-bold text-[var(--text)]">이 와인이 맞나요?</h2>

      <div className="w-full max-w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent-wine)_10%,transparent)]">
            <Wine size={20} className="text-[var(--accent-wine)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[var(--text)]">{wineName}</p>
            {locationParts && (
              <p className="mt-0.5 text-[13px] text-[var(--text-sub)]">
                {typeInfo ? `${typeInfo.label} · ` : ''}
                {locationParts}
              </p>
            )}
            {vintage && <p className="mt-0.5 text-[13px] text-[var(--text-sub)]">{vintage}</p>}
          </div>
        </div>

        {typeInfo && (
          <div className="mt-3">
            <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 flex w-full max-w-[320px] flex-col gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-[var(--accent-wine)] py-3.5 text-[15px] font-semibold"
          style={{ color: '#FFFFFF' }}
        >
          맞아요
        </button>
        <button
          type="button"
          onClick={onReject}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3.5 text-[15px] font-medium text-[var(--text)]"
        >
          다른 와인이에요
        </button>
      </div>
    </div>
  )
}
