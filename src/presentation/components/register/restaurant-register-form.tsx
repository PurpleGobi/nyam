'use client'

import { useState, useCallback } from 'react'
import { RESTAURANT_GENRES } from '@/domain/entities/register'

interface RestaurantRegisterFormProps {
  initialName?: string
  onSubmit: (data: { name: string; genre?: string; area?: string }) => Promise<void>
  isLoading: boolean
}

export function RestaurantRegisterForm({ initialName, onSubmit, isLoading }: RestaurantRegisterFormProps) {
  const [name, setName] = useState(initialName ?? '')
  const [genre, setGenre] = useState('')
  const [area, setArea] = useState('')

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      genre: genre || undefined,
      area: area || undefined,
    })
  }, [name, genre, area, onSubmit])

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
          식당 이름 <span className="text-[var(--negative)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="식당 이름을 입력하세요"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[var(--accent-food)]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">장르</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
        >
          <option value="">선택하세요</option>
          {RESTAURANT_GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">지역</label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="예: 을지로, 강남"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading}
        className="mt-2 w-full rounded-xl bg-[var(--accent-food)] py-3.5 text-[15px] font-semibold disabled:opacity-50"
        style={{ color: '#FFFFFF' }}
      >
        {isLoading ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
