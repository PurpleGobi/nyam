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
  red: { label: '레드', className: 'bg-red-100 text-red-700' },
  white: { label: '화이트', className: 'bg-yellow-100 text-yellow-700' },
  rose: { label: '로제', className: 'bg-pink-100 text-pink-700' },
  sparkling: { label: '스파클링', className: 'bg-blue-100 text-blue-700' },
  orange: { label: '오렌지', className: 'bg-orange-100 text-orange-700' },
  fortified: { label: '주정강화', className: 'bg-amber-100 text-amber-700' },
  dessert: { label: '디저트', className: 'bg-purple-100 text-purple-700' },
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
          className="w-full rounded-xl bg-[var(--accent-wine)] py-3.5 text-[15px] font-semibold text-white"
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
