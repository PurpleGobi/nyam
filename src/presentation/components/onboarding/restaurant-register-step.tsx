'use client'

import { Check, Plus, ArrowRight, UtensilsCrossed } from 'lucide-react'
import { AreaSelect } from './area-select'
import { OnboardingSearch } from './onboarding-search'
import type { OnboardingSeedRestaurant, OnboardingArea } from '@/domain/entities/onboarding'

interface RestaurantRegisterStepProps {
  area: OnboardingArea
  onAreaChange: (area: OnboardingArea) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  restaurants: OnboardingSeedRestaurant[]
  registeredIds: Set<string>
  isLoading: boolean
  onRegister: (id: string) => void
  onUnregister: (id: string) => void
  onNext: () => void
}

export function RestaurantRegisterStep({
  area,
  onAreaChange,
  searchQuery,
  onSearchChange,
  restaurants,
  registeredIds,
  isLoading,
  onRegister,
  onUnregister,
  onNext,
}: RestaurantRegisterStepProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-6 pt-6">
        <h2 className="text-[20px] font-bold" style={{ color: 'var(--text)' }}>
          자주 가는 맛집을 등록하세요
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-sub)' }}>
          가본 적 있는 식당을 선택하면 기록이 시작됩니다
        </p>
      </div>

      <div className="mt-4 px-6">
        <AreaSelect selected={area} onSelect={onAreaChange} />
      </div>

      <div className="mt-3 px-6">
        <OnboardingSearch value={searchQuery} onChange={onSearchChange} />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-6 pb-28">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
              {searchQuery ? '검색 결과가 없습니다' : '이 지역의 식당이 없습니다'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {restaurants.map((r) => {
              const isRegistered = registeredIds.has(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => isRegistered ? onUnregister(r.id) : onRegister(r.id)}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors active:scale-[0.98]"
                  style={{
                    backgroundColor: isRegistered ? 'var(--accent-food-light)' : 'var(--bg-card)',
                    border: `1px solid ${isRegistered ? 'var(--accent-food)' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {r.thumbnailUrl ? (
                      <img src={r.thumbnailUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <UtensilsCrossed size={20} style={{ color: 'var(--text-hint)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{r.name}</p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-hint)' }}>
                      {[r.genre, r.area].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isRegistered ? 'var(--accent-food)' : 'var(--bg-elevated)',
                      border: isRegistered ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {isRegistered ? <Check size={14} color="#FFFFFF" /> : <Plus size={14} style={{ color: 'var(--text-hint)' }} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ backgroundColor: 'var(--bg)' }}>
        <button
          type="button"
          onClick={onNext}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold"
          style={{ backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
        >
          {registeredIds.size > 0 ? `${registeredIds.size}개 등록 완료` : '건너뛰기'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
