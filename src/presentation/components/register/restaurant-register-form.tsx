'use client'

import { useState, useCallback } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { GENRE_GROUPS } from '@/domain/entities/register'
import type { RestaurantGenre, CreateRestaurantInput } from '@/domain/entities/register'

interface RestaurantRegisterFormProps {
  initialName?: string
  currentLat?: number | null
  currentLng?: number | null
  onSubmit: (input: CreateRestaurantInput) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function RestaurantRegisterForm({
  initialName,
  currentLat,
  currentLng,
  onSubmit,
  isLoading,
  error,
}: RestaurantRegisterFormProps) {
  const [name, setName] = useState(initialName ?? '')
  const [genre, setGenre] = useState<RestaurantGenre | null>(null)
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [priceRange, setPriceRange] = useState<number | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return
    await onSubmit({
      name: name.trim(),
      genre: genre || null,
      area: area.trim() || null,
      address: address.trim() || null,
      priceRange: priceRange ?? null,
      lat: currentLat ?? null,
      lng: currentLng ?? null,
    })
  }, [name, genre, area, address, priceRange, currentLat, currentLng, onSubmit])

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-food-light)]">
          <UtensilsCrossed size={20} className="text-[var(--accent-food)]" />
        </div>
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">새 식당 등록</h3>
          <p className="text-[12px] text-[var(--text-sub)]">목록에 없는 식당을 직접 등록하세요</p>
        </div>
      </div>

      {/* 가게명 (필수) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          가게명 <span className="text-[var(--accent-food)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="가게 이름을 입력하세요"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--accent-food)]"
        />
      </div>

      {/* 장르 (선택) — 대분류 그룹 칩 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          장르 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <div className="flex flex-col gap-3">
          {GENRE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-[11px] font-medium text-[var(--text-hint)]">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.genres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenre(genre === g ? null : g)}
                    className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                      genre === g
                        ? 'border-[var(--accent-food)] bg-[var(--accent-food)] text-white'
                        : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-sub)]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주소 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          주소 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="주소 또는 위치를 입력하세요"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--accent-food)]"
        />
      </div>

      {/* 지역 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          지역 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="예: 을지로, 강남"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)] focus:border-[var(--accent-food)]"
        />
      </div>

      {/* 가격대 (선택) */}
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--text)]">
          가격대 <span className="text-[12px] text-[var(--text-hint)]">(선택)</span>
        </label>
        <div className="flex gap-2">
          {([1, 2, 3, 4] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriceRange(priceRange === level ? null : level)}
              className={`flex-1 rounded-xl border py-2.5 text-[13px] font-medium transition-colors ${
                priceRange === level
                  ? 'border-[var(--accent-food)] bg-[var(--accent-food)] text-white'
                  : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-sub)]'
              }`}
            >
              {'₩'.repeat(level)}
            </button>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      {/* 등록 버튼 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!name.trim() || isLoading}
        className="mt-1 w-full rounded-xl bg-[var(--accent-food)] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? '등록 중...' : '등록하기'}
      </button>
    </div>
  )
}
