'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, User, Compass, ArrowUpDown, Search, X, MapPin } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { useBubbleDiscover } from '@/application/hooks/use-bubble-discover'
import { useBubblersList } from '@/application/hooks/use-bubblers-list'
import type { BubblerItem } from '@/application/hooks/use-bubblers-list'
import { getLevelColor } from '@/domain/services/xp-calculator'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { BubbleCard } from '@/presentation/components/bubble/bubble-card'
import { BubbleHotStrip } from '@/presentation/components/bubble/bubble-hot-strip'
import { BubbleDiscoverSheet } from '@/presentation/components/bubble/bubble-discover-sheet'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'
import { AdvancedFilterSheet } from '@/presentation/components/home/advanced-filter-sheet'
import { BUBBLE_FILTER_ATTRIBUTES, BUBBLER_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { BubbleSortOption } from '@/domain/entities/saved-filter'
import type { FilterChipItem, AdvancedFilterChip } from '@/domain/entities/condition-chip'
import { chipsToFilterRules, isAdvancedChip } from '@/domain/entities/condition-chip'

type ContentTab = 'bubbles' | 'bubblers'

const PAGE_SIZE = 10

const BUBBLE_SORT_LABELS: Record<BubbleSortOption, string> = {
  activity: '최신 활동순',
  members: '멤버 많은순',
  records: '기록 많은순',
  name: '이름순',
}

export function BubbleListContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const [now] = useState(() => Date.now())
  const { bubbles, isLoading } = useBubbleList(user?.id ?? null)

  // 탐색 데이터: 유저 지역 추출 + 이미 가입한 버블 제외
  const userAreas = useMemo(
    () => [...new Set(bubbles.map((b) => b.area).filter(Boolean))] as string[],
    [bubbles],
  )
  const excludeIds = useMemo(() => bubbles.map((b) => b.id), [bubbles])

  // 버블러 목록: 모든 버블의 멤버 (자기 제외) 합산
  const bubblerInput = useMemo(() => bubbles.map((b) => ({ id: b.id, name: b.name })), [bubbles])
  const { bubblers, isLoading: bubblersLoading } = useBubblersList(user?.id ?? null, bubblerInput)

  const [contentTab, _setContentTab] = useState<ContentTab>(() => {
    if (typeof window === 'undefined') return 'bubbles'
    const stored = sessionStorage.getItem('nyam_bubble_tab')
    return stored === 'bubbles' || stored === 'bubblers' ? stored : 'bubbles'
  })
  const setContentTab = (tab: ContentTab) => {
    _setContentTab(tab)
    sessionStorage.setItem('nyam_bubble_tab', tab)
  }
  const [sortBy, setSortBy] = useState<BubbleSortOption>('activity')
  const [page, setPage] = useState(1)

  // 패널 토글 (상호 배타)
  const [isSortOpen, setSortOpen] = useState(false)
  const [isSearchOpen, setSearchOpen] = useState(false)
  const [isDiscoverOpen, setDiscoverOpen] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const { recommended, nearby, trending, newest } = useBubbleDiscover(userAreas, excludeIds, isDiscoverOpen)

  // 조건 칩 필터
  const [conditionChips, setConditionChips] = useState<FilterChipItem[]>([])
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [prevContentTab, setPrevContentTab] = useState(contentTab)

  if (prevContentTab !== contentTab) {
    setPrevContentTab(contentTab)
    setConditionChips([])
    setFilterRules([])
  }

  const handleChipsChange = (chips: FilterChipItem[]) => {
    setConditionChips(chips)
    setFilterRules(chipsToFilterRules(chips))
    setPage(1)
  }

  const handleAdvancedApply = (chip: AdvancedFilterChip) => {
    const hasExisting = conditionChips.some(isAdvancedChip)
    const next = hasExisting
      ? conditionChips.map((c) => isAdvancedChip(c) ? chip : c)
      : [...conditionChips, chip]
    handleChipsChange(next)
  }

  const filterAttributes = contentTab === 'bubbles' ? BUBBLE_FILTER_ATTRIBUTES : BUBBLER_FILTER_ATTRIBUTES

  // 검색
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus()
  }, [isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSearchOpen])

  const toggleSort = () => { setSortOpen(!isSortOpen); setSearchOpen(false) }
  const toggleSearch = () => { setSearchOpen(!isSearchOpen); setSortOpen(false) }

  // 역할 분류
  const classified = useMemo(() => {
    return bubbles.map((b) => {
      const isMine = b.createdBy === user?.id
      return { bubble: b, role: isMine ? 'mine' as const : 'joined' as const }
    })
  }, [bubbles, user?.id])

  // HOT 버블: 이번 주 활동이 있는 버블 (주간 기록 수 내림차순)
  const hotBubbles = useMemo(() => {
    return [...bubbles]
      .filter((b) => b.weeklyRecordCount > 0)
      .sort((a, b) => b.weeklyRecordCount - a.weeklyRecordCount)
      .slice(0, 8)
  }, [bubbles])

  // 검색 필터
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return classified
    const q = searchQuery.toLowerCase()
    return classified.filter((c) =>
      c.bubble.name.toLowerCase().includes(q) ||
      (c.bubble.description ?? '').toLowerCase().includes(q) ||
      (c.bubble.area ?? '').toLowerCase().includes(q)
    )
  }, [classified, searchQuery])

  // 규칙 기반 필터
  const ruleFiltered = useMemo(() => {
    if (filterRules.length === 0) return searchFiltered
    return searchFiltered.filter((c) => {
      const b = c.bubble
      const results = filterRules.map((rule) => {
        switch (rule.attribute) {
          case 'role':
            return rule.operator === 'eq' ? c.role === rule.value : c.role !== rule.value
          case 'focus_type':
            return rule.operator === 'eq' ? b.focusType === rule.value : b.focusType !== rule.value
          case 'area':
            if (rule.operator === 'eq') return b.area === rule.value
            if (rule.operator === 'neq') return b.area !== rule.value
            if (rule.operator === 'contains') return (b.area ?? '').includes(String(rule.value))
            return true
          case 'join_policy':
            return rule.operator === 'eq' ? b.joinPolicy === rule.value : b.joinPolicy !== rule.value
          case 'member_count': {
            const threshold = Number(rule.value)
            if (rule.operator === 'gte' || rule.operator === 'eq') return b.memberCount >= threshold
            if (rule.operator === 'lt') return b.memberCount < threshold
            return true
          }
          case 'activity': {
            if (!b.lastActivityAt) return false
            const elapsed = now - new Date(b.lastActivityAt).getTime()
            const ms = rule.value === '1d' ? 86400000 : rule.value === '1w' ? 604800000 : 2592000000
            return elapsed <= ms
          }
          default:
            return true
        }
      })
      return results.every(Boolean)
    })
  }, [searchFiltered, filterRules, now])

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...ruleFiltered]
    switch (sortBy) {
      case 'activity':
        return arr.sort((a, b) => new Date(b.bubble.lastActivityAt ?? '').getTime() - new Date(a.bubble.lastActivityAt ?? '').getTime())
      case 'members':
        return arr.sort((a, b) => b.bubble.memberCount - a.bubble.memberCount)
      case 'records':
        return arr.sort((a, b) => b.bubble.recordCount - a.bubble.recordCount)
      case 'name':
        return arr.sort((a, b) => a.bubble.name.localeCompare(b.bubble.name))
      default:
        return arr
    }
  }, [ruleFiltered, sortBy])

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)


  return (
    <div className="content-feed flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />

      {/* HOT 버블 스트립 — 활동이 있는 버블이 2개 이상일 때만 */}
      {contentTab === 'bubbles' && hotBubbles.length >= 2 && !isLoading && (
        <BubbleHotStrip
          bubbles={hotBubbles}
          onBubbleClick={(id) => router.push(`/bubbles/${id}`)}
        />
      )}

      <StickyTabs
        tabs={[{ key: 'bubbles' as const, label: '버블' }, { key: 'bubblers' as const, label: '버블러' }]}
        activeTab={contentTab}
        variant="social"
        onTabChange={setContentTab}
        rightSlot={
          isSearchOpen ? (
            <div ref={searchBarRef} className="flex flex-1 items-center gap-2" style={{ marginLeft: '8px' }}>
              <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                placeholder="버블 이름·지역으로 검색"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setPage(1) }}
                  className="flex shrink-0 items-center justify-center"
                  style={{ color: 'var(--text-hint)' }}
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={toggleSearch}
                className="shrink-0 text-[12px] font-medium"
                style={{ color: 'var(--text-sub)' }}
              >
                닫기
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button type="button" className={`icon-button ${isDiscoverOpen ? 'active social' : ''}`} title="탐색" onClick={() => setDiscoverOpen(true)}>
                <Compass size={20} />
              </button>
              <button type="button" className={`icon-button ${isSortOpen ? 'active social' : ''}`} title="정렬" onClick={toggleSort}>
                <ArrowUpDown size={20} />
              </button>
              <button type="button" className={`icon-button ${isSearchOpen ? 'active social' : ''}`} title="검색" onClick={toggleSearch}>
                <Search size={20} />
              </button>
            </div>
          )
        }
      />

      {/* 소트 드롭다운 */}
      {isSortOpen && (
        <div className="relative">
          <SortDropdown
            currentSort={sortBy}
            onSortChange={(s) => { setSortBy(s); setSortOpen(false); setPage(1) }}
            onClose={() => setSortOpen(false)}
            accentType="social"
            labels={BUBBLE_SORT_LABELS}
          />
        </div>
      )}

      {/* 조건 필터 칩 바 + 페이저 */}
      <ConditionFilterBar
        chips={conditionChips}
        onChipsChange={handleChipsChange}
        attributes={filterAttributes}
        accentType="social"
        onAdvancedOpen={() => setIsAdvancedOpen(true)}
        recordPage={page}
        recordTotalPages={totalPages}
        onRecordPagePrev={() => setPage((p) => Math.max(1, p - 1))}
        onRecordPageNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <AdvancedFilterSheet
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        onApply={handleAdvancedApply}
        attributes={filterAttributes}
        accentType="social"
      />

      {contentTab === 'bubbles' && (
        <>

          {/* 버블 목록 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : paged.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'var(--accent-social-light)' }}
              >
                <Users size={32} style={{ color: 'var(--accent-social)' }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                {searchQuery || filterRules.length > 0 ? '조건에 맞는 버블이 없어요' : '아직 버블이 없어요'}
              </p>
              <p className="mt-1 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
                {searchQuery || filterRules.length > 0 ? '필터를 변경해보세요' : '+버튼을 눌러 시작하세요'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-4 pb-4 md:grid md:grid-cols-2 md:gap-4 md:px-8">
              {paged.map(({ bubble: b, role }) => (
                <BubbleCard
                  key={b.id}
                  bubble={b}
                  role={role}
                  isRecentlyActive={b.lastActivityAt ? now - new Date(b.lastActivityAt).getTime() < 86400000 : false}
                  onClick={() => router.push(`/bubbles/${b.id}`)}
                />
              ))}
            </div>
          )}

        </>
      )}

      {contentTab === 'bubblers' && (
        <>
          {bubblersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : bubblers.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
              <div
                className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl"
                style={{ backgroundColor: 'var(--accent-social-light)' }}
              >
                <User size={32} style={{ color: 'var(--accent-social)' }} />
              </div>
              <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                아직 버블러가 없어요
              </p>
              <p className="mt-1 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
                버블에 가입하면 버블러를 만날 수 있어요
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-4 pb-4">
              {bubblers.map((b) => (
                <BubblerCard key={b.userId} bubbler={b} onClick={() => router.push(`/users/${b.userId}`)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <FabAdd variant="social" onClick={() => router.push('/bubbles/create')} />

      {/* 버블 탐색 바텀 시트 */}
      <BubbleDiscoverSheet
        isOpen={isDiscoverOpen}
        onClose={() => setDiscoverOpen(false)}
        recommended={recommended}
        nearby={nearby}
        trending={trending}
        newest={newest}
        onSelectBubble={(bubble) => {
          setDiscoverOpen(false)
          router.push(`/bubbles/${bubble.id}`)
        }}
      />
    </div>
  )
}

/* ──── 버블러 카드 ──── */
function BubblerCard({ bubbler, onClick }: { bubbler: BubblerItem; onClick: () => void }) {
  const levelColor = getLevelColor(bubbler.level)
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex items-center gap-3 rounded-xl px-3 py-3 text-left"
    >
      {/* 아바타 */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
        style={{
          backgroundColor: bubbler.avatarColor ?? 'var(--accent-social-light)',
          color: '#FFFFFF',
        }}
      >
        {bubbler.nickname.charAt(0)}
      </div>

      {/* 정보 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
            {bubbler.nickname}
          </p>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold"
            style={{ backgroundColor: `${levelColor}18`, color: levelColor }}
          >
            Lv.{bubbler.level}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>
          <span>기록 {bubbler.totalRecords}곳</span>
          {bubbler.avgSatisfaction != null && (
            <>
              <span>·</span>
              <span>평균 {bubbler.avgSatisfaction.toFixed(1)}</span>
            </>
          )}
          <span>·</span>
          <span className="truncate">{bubbler.sharedBubbleNames.join(', ')}</span>
        </div>
      </div>

      {/* 공유 버블 수 뱃지 */}
      {bubbler.sharedBubbleCount > 1 && (
        <span
          className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
        >
          <Users size={10} />
          {bubbler.sharedBubbleCount}
        </span>
      )}
    </button>
  )
}
