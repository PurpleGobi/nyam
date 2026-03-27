'use client'

import { useState, useCallback, useMemo } from 'react'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'
import { VIEW_MODE_CYCLE } from '@/domain/entities/home-state'
import type { NudgeDisplay } from '@/domain/entities/nudge'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRecords } from '@/application/hooks/use-records'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { AiGreeting } from '@/presentation/components/home/ai-greeting'
import { NudgeStrip } from '@/presentation/components/home/nudge-strip'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'
import { SavedFilterChips } from '@/presentation/components/home/saved-filter-chips'
import type { SavedFilter } from '@/domain/entities/saved-filter'

const MOCK_CHIPS: SavedFilter[] = [
  { id: 'visit', userId: '', name: '방문', targetType: 'restaurant', contextId: null, rules: [], sortBy: null, orderIndex: 0, createdAt: '' },
  { id: 'wish', userId: '', name: '찜', targetType: 'restaurant', contextId: null, rules: [], sortBy: null, orderIndex: 1, createdAt: '' },
  { id: 'recommend', userId: '', name: '추천', targetType: 'restaurant', contextId: null, rules: [], sortBy: null, orderIndex: 2, createdAt: '' },
  { id: 'following', userId: '', name: '팔로잉', targetType: 'restaurant', contextId: null, rules: [], sortBy: null, orderIndex: 3, createdAt: '' },
]

function getTimeGreeting(): { title: string; description: string } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 11) {
    return { title: '좋은 아침이에요!', description: '오늘 점심 뭐 먹을지 고민 중이라면 — 기록을 참고해보세요.' }
  }
  if (hour >= 11 && hour < 15) {
    return { title: '점심 메뉴 고민 중이세요?', description: '이번 주 광화문 쪽을 자주 가셨네요 — 오늘은 새로운 데 어때요?' }
  }
  if (hour >= 15 && hour < 21) {
    return { title: '오늘 저녁은 어떠세요?', description: '이번 주 기록 3건 — 꾸준히 잘 하고 계세요.' }
  }
  return { title: '늦은 밤이네요.', description: '이번 주 기록 3건 — 꾸준히 잘 하고 계세요.' }
}

export function HomeContainer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<HomeTab>('restaurant')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [showGreeting, setShowGreeting] = useState(true)
  const [nudge, setNudge] = useState<NudgeDisplay | null>({
    type: 'photo',
    icon: '📷',
    title: '사진 감지',
    subtitle: '3/19 12:34',
    actionLabel: '기록',
    actionHref: '/record/new',
  })
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)

  const greeting = useMemo(() => getTimeGreeting(), [])
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

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* AI Greeting */}
        {showGreeting && (
          <div className="pt-2">
            <AiGreeting
              title={greeting.title}
              description={greeting.description}
              onDismiss={() => setShowGreeting(false)}
            />
          </div>
        )}

        {/* Nudge Strip */}
        {nudge && (
          <div className="pt-2">
            <NudgeStrip
              nudge={nudge}
              onAction={() => {/* navigate to record */}}
              onDismiss={() => setNudge(null)}
            />
          </div>
        )}

        {/* Tabs */}
        <HomeTabs
          activeTab={activeTab}
          viewMode={viewMode}
          onTabChange={setActiveTab}
          onViewCycle={handleViewCycle}
          onFilterToggle={() => {/* S5.4 */}}
          onSortToggle={() => {/* S5.4 */}}
        />

        {/* Saved filter chips */}
        <SavedFilterChips
          chips={MOCK_CHIPS}
          activeChipId={activeFilterId}
          counts={{ visit: 8, wish: 3, recommend: 12, following: 5 }}
          accentClass={activeTab === 'restaurant' ? 'food' : 'wine'}
          onChipSelect={setActiveFilterId}
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
                sources={[{ type: 'me', label: '나', detail: `${record.satisfaction ?? '-'} · ${record.visitDate ?? ''}` }]}
              />
            ))
          )}
        </div>
      </div>

      <FabAdd currentTab={activeTab} />
    </div>
  )
}
