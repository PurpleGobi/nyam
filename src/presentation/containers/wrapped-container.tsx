'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useWrapped } from '@/application/hooks/use-wrapped'
import { WrappedCard } from '@/presentation/components/profile/wrapped-card'
import { GaugeSlider } from '@/presentation/components/profile/gauge-slider'
import type { WrappedCategory } from '@/domain/entities/profile'

const FILTER_TABS: { key: WrappedCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'restaurant', label: '식당' },
  { key: 'wine', label: '와인' },
]

export function WrappedContainer() {
  const router = useRouter()
  const [category, setCategory] = useState<WrappedCategory>('all')
  const [gaugePrivacy, setGaugePrivacy] = useState<0 | 1 | 2>(1)
  const [gaugeDetail, setGaugeDetail] = useState<0 | 1 | 2>(1)
  const { data: wrappedData } = useWrapped(category)

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
              onClick={() => setCategory(tab.key)}
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

      {/* Gauge Sliders */}
      <div className="flex flex-col gap-3 px-4">
        <GaugeSlider
          label="개인정보"
          options={['최소', '보통', '공개']}
          value={gaugePrivacy}
          onChange={setGaugePrivacy}
        />
        <GaugeSlider
          label="디테일"
          options={['심플', '보통', '상세']}
          value={gaugeDetail}
          onChange={setGaugeDetail}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-20 pt-4">
        {wrappedData ? (
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
