'use client'

import { useState, useCallback } from 'react'
import { WINE_TYPES, WINE_TYPE_LABELS } from '@/domain/entities/register'
import type { WineType } from '@/domain/entities/register'

interface WineRegisterFormProps {
  initialName?: string
  initialProducer?: string
  initialVintage?: number
  initialWineType?: string
  onSubmit: (data: {
    name: string
    wineType: string
    producer?: string
    vintage?: number
    region?: string
    country?: string
  }) => Promise<void>
  isLoading: boolean
}

export function WineRegisterForm({
  initialName,
  initialProducer,
  initialVintage,
  initialWineType,
  onSubmit,
  isLoading,
}: WineRegisterFormProps) {
  const [name, setName] = useState(initialName ?? '')
  const [wineType, setWineType] = useState(initialWineType ?? '')
  const [vintageUnknown, setVintageUnknown] = useState(false)
  const [producer, setProducer] = useState(initialProducer ?? '')
  const [vintage, setVintage] = useState(initialVintage?.toString() ?? '')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('')

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !wineType) return
    await onSubmit({
      name: name.trim(),
      wineType,
      producer: producer || undefined,
      vintage: vintage ? Number(vintage) : undefined,
      region: region || undefined,
      country: country || undefined,
    })
  }, [name, wineType, producer, vintage, region, country, onSubmit])

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
          와인 이름 <span className="text-[var(--negative)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="와인 이름"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent-wine)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
          와인 타입 <span className="text-[var(--negative)]">*</span>
        </label>
        <select
          value={wineType}
          onChange={(e) => setWineType(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
        >
          <option value="">선택하세요</option>
          {WINE_TYPES.map((t) => (
            <option key={t} value={t}>{WINE_TYPE_LABELS[t as WineType]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">생산자</label>
        <input
          type="text"
          value={producer}
          onChange={(e) => setProducer(e.target.value)}
          placeholder="와이너리/생산자"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">빈티지</label>
          <input
            type="number"
            inputMode="numeric"
            value={vintageUnknown ? '' : vintage}
            onChange={(e) => setVintage(e.target.value)}
            placeholder="2020"
            disabled={vintageUnknown}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none disabled:opacity-50"
          />
          <label className="mt-1.5 flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={vintageUnknown}
              onChange={(e) => {
                setVintageUnknown(e.target.checked)
                if (e.target.checked) setVintage('')
              }}
              className="h-4 w-4 rounded accent-[var(--accent-wine)]"
            />
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>빈티지 모름</span>
          </label>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">국가</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="France"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">산지</label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Bordeaux, Napa Valley"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || !wineType || isLoading}
        className="mt-2 w-full rounded-xl bg-[var(--accent-wine)] py-3.5 text-[15px] font-semibold disabled:opacity-50"
        style={{ color: '#FFFFFF' }}
      >
        {isLoading ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
