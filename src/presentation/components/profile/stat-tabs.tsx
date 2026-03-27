'use client'

import { Utensils, Wine } from 'lucide-react'
import type { RestaurantStats, WineStats } from '@/domain/entities/profile'

type TabType = 'restaurant' | 'wine'

interface StatTabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  restaurantStats: RestaurantStats | null
  wineStats: WineStats | null
}

const TABS: { key: TabType; label: string; icon: typeof Utensils }[] = [
  { key: 'restaurant', label: '식당', icon: Utensils },
  { key: 'wine', label: '와인', icon: Wine },
]

export function StatTabs({ activeTab, onTabChange, restaurantStats, wineStats }: StatTabsProps) {
  return (
    <div className="mx-4">
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
              onClick={() => onTabChange(tab.key)}
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
          <StatsPanel
            totalCount={restaurantStats.totalCount}
            avgScore={restaurantStats.avgScore}
            topItems={restaurantStats.topGenres}
            topLabel="장르"
            secondItems={restaurantStats.topCities}
            secondLabel="지역"
            accentColor="var(--accent-food)"
          />
        )}

        {activeTab === 'wine' && wineStats && (
          <StatsPanel
            totalCount={wineStats.totalCount}
            avgScore={wineStats.avgScore}
            topItems={wineStats.topVarietals}
            topLabel="품종"
            secondItems={wineStats.topCountries}
            secondLabel="국가"
            accentColor="var(--accent-wine)"
          />
        )}

        {activeTab === 'restaurant' && !restaurantStats && <EmptyStats label="식당" />}
        {activeTab === 'wine' && !wineStats && <EmptyStats label="와인" />}
      </div>
    </div>
  )
}

function StatsPanel({
  totalCount,
  avgScore,
  topItems,
  topLabel,
  secondItems,
  secondLabel,
  accentColor,
}: {
  totalCount: number
  avgScore: number
  topItems: { name: string; count: number }[]
  topLabel: string
  secondItems: { name: string; count: number }[]
  secondLabel: string
  accentColor: string
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Summary row */}
      <div
        className="flex gap-3 rounded-2xl px-4 py-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex-1 text-center">
          <p style={{ fontSize: '20px', fontWeight: 800, color: accentColor }}>{totalCount}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>총 기록</p>
        </div>
        <div className="w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
        <div className="flex-1 text-center">
          <p style={{ fontSize: '20px', fontWeight: 800, color: accentColor }}>
            {avgScore > 0 ? avgScore : '-'}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>평균 점수</p>
        </div>
      </div>

      {/* Top items */}
      {topItems.length > 0 && (
        <RankingList title={`Top ${topLabel}`} items={topItems} accentColor={accentColor} />
      )}
      {secondItems.length > 0 && (
        <RankingList title={`Top ${secondLabel}`} items={secondItems} accentColor={accentColor} />
      )}
    </div>
  )
}

function RankingList({
  title,
  items,
  accentColor,
}: {
  title: string
  items: { name: string; count: number }[]
  accentColor: string
}) {
  const maxCount = items[0]?.count ?? 1

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="mb-2" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
        {title}
      </p>
      <div className="flex flex-col gap-2">
        {items.map((item, idx) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="w-4 shrink-0 text-center"
              style={{ fontSize: '11px', fontWeight: 700, color: idx < 3 ? accentColor : 'var(--text-hint)' }}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span
                  className="truncate"
                  style={{ fontSize: '13px', color: 'var(--text)' }}
                >
                  {item.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.count}</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: accentColor,
                    opacity: 1 - idx * 0.15,
                  }}
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
      <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>
        {label} 기록이 없습니다
      </p>
      <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
        첫 기록을 남겨보세요
      </p>
    </div>
  )
}
