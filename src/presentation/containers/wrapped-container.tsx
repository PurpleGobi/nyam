'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useWrapped } from '@/application/hooks/use-wrapped'
import { WrappedCard } from '@/presentation/components/profile/wrapped-card'
import type { WrappedCategory } from '@/domain/entities/profile'

const FILTER_TABS: { key: WrappedCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'restaurant', label: '식당' },
  { key: 'wine', label: '와인' },
]

export function WrappedContainer() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { wrappedData, category, isLoading, loadWrapped } = useWrapped(authUser?.id ?? null)

  useEffect(() => {
    if (authUser?.id) {
      loadWrapped('all')
    }
  }, [authUser?.id, loadWrapped])

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* Navigation */}
      <nav className="flex items-center px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Wrapped
        </span>
        <div className="w-11" />
      </nav>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3">
        {FILTER_TABS.map((tab) => {
          const isActive = category === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => loadWrapped(tab.key)}
              className="rounded-full px-4 py-1.5 transition-colors"
              style={{
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                backgroundColor: isActive ? 'var(--accent-food)' : 'var(--bg-card)',
                color: isActive ? '#FFFFFF' : 'var(--text-sub)',
                border: isActive ? 'none' : '1px solid var(--border)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
          </div>
        ) : wrappedData ? (
          <WrappedCard category={category} data={wrappedData} />
        ) : (
          <div className="flex flex-col items-center py-20">
            <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>기록이 없습니다</p>
            <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              첫 기록을 남겨보세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
