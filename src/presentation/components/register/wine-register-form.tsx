'use client'

import { useState, useCallback } from 'react'
import { Wine } from 'lucide-react'
import { WINE_TYPES, WINE_TYPE_LABELS } from '@/domain/entities/register'
import type { WineType, CreateWineInput } from '@/domain/entities/register'

interface WineRegisterFormProps {
  initialName?: string
  initialProducer?: string
  initialVintage?: number
  initialWineType?: string
  onSubmit: (input: CreateWineInput) => Promise<void>
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
  const [wineType, setWineType] = useState<WineType | ''>(
    (initialWineType as WineType) ?? '',
  )
  const [producer, setProducer] = useState(initialProducer ?? '')
  const [vintage, setVintage] = useState(initialVintage?.toString() ?? '')
  const [vintageUnknown, setVintageUnknown] = useState(false)
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('')
  const [variety, setVariety] = useState('')

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !wineType) return
    await onSubmit({
      name: name.trim(),
      wineType,
      producer: producer.trim() || null,
      vintage: vintage ? Number(vintage) : null,
      region: region.trim() || null,
      country: country.trim() || null,
      variety: variety.trim() || null,
    })
  }, [name, wineType, producer, vintage, region, country, variety, onSubmit])

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-wine-light)]">
          <Wine size={20} className="text-[var(--accent-wine)]" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">새 와인 등록</h3>
          <p className="text-[12px] text-[var(--text-sub)]">목록에 없는 와인을 직접 등록하세요</p>
        </div>
      </div>

      {/* 와인명 (필수) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          와인명 <span className="text-[var(--accent-wine)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="와인 이름을 입력하세요"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--accent-wine)]"
        />
      </div>

      {/* 와인 타입 (필수) — 칩 버튼 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          타입 <span className="text-[var(--accent-wine)]">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {WINE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWineType(wineType === t ? '' : t)}
              className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                wineType === t
                  ? 'border-[var(--accent-wine)] bg-[var(--accent-wine)] text-white'
                  : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-sub)]'
              }`}
            >
              {WINE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 생산자 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          생산자 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={producer}
          onChange={(e) => setProducer(e.target.value)}
          placeholder="와이너리 또는 생산자명"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--accent-wine)]"
        />
      </div>

      {/* 빈티지 + 국가 (선택) */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
            빈티지 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={vintageUnknown ? '' : vintage}
            onChange={(e) => setVintage(e.target.value)}
            placeholder="2020"
            disabled={vintageUnknown}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] disabled:opacity-50"
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
            <span className="text-[12px] text-[var(--text-sub)]">빈티지 모름</span>
          </label>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
            국가 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="France"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
          />
        </div>
      </div>

      {/* 산지 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          산지 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Bordeaux, Napa Valley"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
        />
      </div>

      {/* 품종 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          품종 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
          placeholder="Cabernet Sauvignon, 피노 누아"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
        />
      </div>

      {/* 등록 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || !wineType || isLoading}
        className="mt-1 w-full rounded-xl bg-[var(--accent-wine)] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
