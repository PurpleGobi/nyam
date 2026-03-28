'use client'

import { useState } from 'react'
import { Utensils, Wine } from 'lucide-react'
import { useRestaurantStats, useWineStats } from '@/application/hooks/use-profile-stats'
import type { RestaurantStats, WineStats, BarChartItem } from '@/domain/entities/profile'

type TabType = 'restaurant' | 'wine'

const TABS: { key: TabType; label: string; icon: typeof Utensils }[] = [
  { key: 'restaurant', label: '식당', icon: Utensils },
  { key: 'wine', label: '와인', icon: Wine },
]

export function StatTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('restaurant')
  const { stats: restaurantStats, genres } = useRestaurantStats()
  const { stats: wineStats, varieties } = useWineStats()

  return (
    <div className="mx-4 mt-6">
      {/* Tab bar */}
      <div
        className="flex overflow-hidden rounded-xl"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-1 items-center justify-center gap-1.5 py-2.5 transition-colors"
              style={{
                backgroundColor: isActive
                  ? tab.key === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
                  : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-sub)',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Stats content */}
      <div className="mt-3">
        {activeTab === 'restaurant' && restaurantStats && (
          <RestaurantPanel stats={restaurantStats} genres={genres ?? []} />
        )}

        {activeTab === 'wine' && wineStats && (
          <WinePanel stats={wineStats} varieties={varieties ?? []} />
        )}

        {activeTab === 'restaurant' && !restaurantStats && <EmptyStats label="식당" />}
        {activeTab === 'wine' && !wineStats && <EmptyStats label="와인" />}
      </div>
    </div>
  )
}

function RestaurantPanel({ stats, genres }: { stats: RestaurantStats; genres: BarChartItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SummaryCards
        items={[
          { label: '총 방문', value: stats.totalVisits, accent: 'var(--accent-food)' },
          { label: '평균 점수', value: stats.avgScore, accent: 'var(--accent-food)' },
          { label: '방문 지역', value: stats.visitedAreas, accent: 'var(--accent-food)' },
        ]}
      />
      {genres.length > 0 && <BarChartSection title="장르 분포" items={genres} accentColor="var(--accent-food)" />}
    </div>
  )
}

function WinePanel({ stats, varieties }: { stats: WineStats; varieties: BarChartItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <SummaryCards
        items={[
          { label: '총 시음', value: stats.totalTastings, accent: 'var(--accent-wine)' },
          { label: '평균 점수', value: stats.avgScore, accent: 'var(--accent-wine)' },
          { label: '셀러 보유', value: stats.cellarCount, accent: 'var(--accent-wine)' },
        ]}
      />
      {varieties.length > 0 && <BarChartSection title="품종 분포" items={varieties} accentColor="var(--accent-wine)" />}
    </div>
  )
}

function SummaryCards({ items }: { items: { label: string; value: number; accent: string }[] }) {
  return (
    <div
      className="flex gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {items.map((item, idx) => (
        <div key={item.label} className="flex flex-1 flex-col items-center">
          {idx > 0 && <div className="absolute left-0 h-full w-[1px]" style={{ backgroundColor: 'var(--border)' }} />}
          <p style={{ fontSize: '20px', fontWeight: 800, color: item.accent }}>
            {item.value > 0 ? item.value : '-'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.label}</p>
        </div>
      ))}
    </div>
  )
}

function BarChartSection({ title, items, accentColor }: { title: string; items: BarChartItem[]; accentColor: string }) {
  const maxVal = items[0]?.value ?? 1

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="mb-2" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{title}</p>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-4 shrink-0 text-center"
              style={{ fontSize: '11px', fontWeight: 700, color: idx < 3 ? accentColor : 'var(--text-hint)' }}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate" style={{ fontSize: '13px', color: 'var(--text)' }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(item.value / maxVal) * 100}%`, backgroundColor: accentColor, opacity: 1 - idx * 0.15 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyStats({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl py-10"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>{label} 기록이 없습니다</p>
      <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>첫 기록을 남겨보세요</p>
    </div>
  )
}
