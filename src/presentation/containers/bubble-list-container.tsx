'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, User, Compass, SlidersHorizontal, ArrowUpDown, Search, X } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { BubbleCard } from '@/presentation/components/bubble/bubble-card'
import { BubbleHotStrip } from '@/presentation/components/bubble/bubble-hot-strip'
import { BubbleDiscoverSheet } from '@/presentation/components/bubble/bubble-discover-sheet'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FilterChip, FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { FilterSystem } from '@/presentation/components/ui/filter-system'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import { BUBBLE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { BubbleSortOption } from '@/domain/entities/saved-filter'

type ContentTab = 'bubbles' | 'bubblers'
type RoleFilter = 'all' | 'mine' | 'joined'
type BubblerFilter = 'all' | 'following' | 'followers' | 'mutual'

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

  const [contentTab, _setContentTab] = useState<ContentTab>(() => {
    if (typeof window === 'undefined') return 'bubbles'
    const stored = sessionStorage.getItem('nyam_bubble_tab')
    return stored === 'bubbles' || stored === 'bubblers' ? stored : 'bubbles'
  })
  const setContentTab = (tab: ContentTab) => {
    _setContentTab(tab)
    sessionStorage.setItem('nyam_bubble_tab', tab)
  }
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sortBy, setSortBy] = useState<BubbleSortOption>('activity')
  const [bubblerFilter, setBubblerFilter] = useState<BubblerFilter>('all')
  const [page, setPage] = useState(1)

  // 패널 토글 (상호 배타)
  const [isFilterOpen, setFilterOpen] = useState(false)
  const [isSortOpen, setSortOpen] = useState(false)
  const [isSearchOpen, setSearchOpen] = useState(false)
  const [isDiscoverOpen, setDiscoverOpen] = useState(false)

  // 필터 시스템 상태
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [filterConjunction, setFilterConjunction] = useState<'and' | 'or'>('and')

  // 검색
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus()
  }, [isSearchOpen])

  const toggleFilter = () => { setFilterOpen(!isFilterOpen); setSortOpen(false); setSearchOpen(false) }
  const toggleSort = () => { setSortOpen(!isSortOpen); setFilterOpen(false); setSearchOpen(false) }
  const toggleSearch = () => { setSearchOpen(!isSearchOpen); setFilterOpen(false); setSortOpen(false) }

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

  // 역할 필터
  const roleFiltered = useMemo(() => {
    if (roleFilter === 'all') return classified
    return classified.filter((c) => c.role === roleFilter)
  }, [classified, roleFilter])

  // 검색 필터
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return roleFiltered
    const q = searchQuery.toLowerCase()
    return roleFiltered.filter((c) =>
      c.bubble.name.toLowerCase().includes(q) ||
      (c.bubble.description ?? '').toLowerCase().includes(q) ||
      (c.bubble.area ?? '').toLowerCase().includes(q)
    )
  }, [roleFiltered, searchQuery])

  // 규칙 기반 필터
  const ruleFiltered = useMemo(() => {
    if (filterRules.length === 0) return searchFiltered
    return searchFiltered.filter((c) => {
      const b = c.bubble
      const results = filterRules.map((rule) => {
        switch (rule.attribute) {
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
      return filterConjunction === 'and' ? results.every(Boolean) : results.some(Boolean)
    })
  }, [searchFiltered, filterRules, filterConjunction, now])

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

  // 필터칩 카운트
  const mineCount = classified.filter((c) => c.role === 'mine').length
  const joinedCount = classified.filter((c) => c.role === 'joined').length

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
            <div className="flex flex-1 items-center gap-2" style={{ marginLeft: '8px' }}>
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
              <button type="button" className={`icon-button ${isFilterOpen ? 'active social' : ''}`} title="필터" onClick={toggleFilter}>
                <SlidersHorizontal size={20} />
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

      {/* 필터 패널 */}
      {isFilterOpen && (
        <div className="px-4 py-2">
          <FilterSystem
            rules={filterRules}
            conjunction={filterConjunction}
            attributes={BUBBLE_FILTER_ATTRIBUTES}
            onRulesChange={(rules) => { setFilterRules(rules); setPage(1) }}
            onConjunctionChange={setFilterConjunction}
            accentColor="var(--accent-social)"
            onClose={toggleFilter}
          />
        </div>
      )}

      {/* 소트 드롭다운 */}
      {isSortOpen && (
        <div className="relative">
          <SortDropdown
            currentSort={sortBy}
            onSortChange={(s) => { setSortBy(s); setSortOpen(false); setPage(1) }}
            accentType="social"
            labels={BUBBLE_SORT_LABELS}
          />
        </div>
      )}


      {contentTab === 'bubbles' && (
        <>
          <FilterChipGroup className="px-4 py-2">
            {([
              { key: 'all' as const, label: '전체', count: classified.length },
              { key: 'mine' as const, label: '운영', count: mineCount },
              { key: 'joined' as const, label: '가입', count: joinedCount },
            ]).map(({ key, label, count }) => (
              <FilterChip key={key} active={roleFilter === key} variant="social" count={count} onClick={() => { setRoleFilter(key); setPage(1) }}>
                {label}
              </FilterChip>
            ))}
          </FilterChipGroup>

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
                {searchQuery || filterRules.length > 0 ? '필터를 변경해보세요' : '버블을 만들어 맛집을 공유해보세요'}
              </p>
              {!searchQuery && filterRules.length === 0 && (
                <button
                  type="button"
                  onClick={() => router.push('/bubbles/create')}
                  className="mt-4 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95"
                  style={{ backgroundColor: 'var(--accent-social)' }}
                >
                  첫 버블 만들기
                </button>
              )}
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

          {/* 인라인 페이저 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold disabled:opacity-30"
                style={{ color: 'var(--text-sub)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                &lt;
              </button>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold disabled:opacity-30"
                style={{ color: 'var(--text-sub)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}

      {contentTab === 'bubblers' && (
        <>
          <FilterChipGroup className="px-4 py-2">
            {([
              { key: 'all' as const, label: '전체', count: 0 },
              { key: 'following' as const, label: '팔로잉', count: 0 },
              { key: 'followers' as const, label: '팔로워', count: 0 },
              { key: 'mutual' as const, label: '맞팔', count: 0 },
            ]).map(({ key, label, count }) => (
              <FilterChip key={key} active={bubblerFilter === key} variant="social" count={count} onClick={() => { setBubblerFilter(key); setPage(1) }}>
                {label}
              </FilterChip>
            ))}
          </FilterChipGroup>

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
        </>
      )}

      {/* FAB */}
      <FabAdd variant="social" onClick={() => router.push('/bubbles/create')} />

      {/* 버블 탐색 바텀 시트 */}
      <BubbleDiscoverSheet
        isOpen={isDiscoverOpen}
        onClose={() => setDiscoverOpen(false)}
        recommended={[]}
        nearby={[]}
        trending={[]}
        newest={[]}
        onSelectBubble={(bubble) => {
          setDiscoverOpen(false)
          router.push(`/bubbles/${bubble.id}`)
        }}
      />
    </div>
  )
}
