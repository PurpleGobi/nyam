'use client'

import { useState, useCallback } from 'react'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'
import { VIEW_MODE_CYCLE } from '@/domain/entities/home-state'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRecords } from '@/application/hooks/use-records'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'

export function HomeContainer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<HomeTab>('restaurant')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')

  const { records } = useRecords(user?.id ?? null, activeTab)

  const handleViewCycle = useCallback(() => {
    setViewMode((prev) => {
      const idx = VIEW_MODE_CYCLE.indexOf(prev)
      return VIEW_MODE_CYCLE[(idx + 1) % VIEW_MODE_CYCLE.length]
    })
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />

      <HomeTabs
        activeTab={activeTab}
        viewMode={viewMode}
        onTabChange={setActiveTab}
        onViewCycle={handleViewCycle}
        onFilterToggle={() => {/* S5.4 */}}
        onSortToggle={() => {/* S5.4 */}}
      />

      {/* 기록 목록 */}
      <div className="flex flex-col gap-3 px-4 pb-24 pt-2">
        {records.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            {activeTab === 'restaurant' ? (
              <UtensilsCrossed size={48} style={{ color: 'var(--text-hint)' }} />
            ) : (
              <Wine size={48} style={{ color: 'var(--text-hint)' }} />
            )}
            <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
              {activeTab === 'restaurant' ? '첫 식당을 기록해보세요' : '첫 와인을 기록해보세요'}
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-hint)]">
              +버튼을 눌러 시작하세요
            </p>
          </div>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.id}
              id={record.id}
              targetId={record.targetId}
              targetType={record.targetType}
              name={record.targetId}
              meta={record.visitDate ?? ''}
              photoUrl={null}
              satisfaction={record.satisfaction}
              comment={record.comment}
              visitDate={record.visitDate}
            />
          ))
        )}
      </div>

      <FabAdd currentTab={activeTab} />
    </div>
  )
}
