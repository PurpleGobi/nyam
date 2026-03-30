'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Search, Check, UtensilsCrossed, Wine, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import type { RecordWithTarget } from '@/domain/entities/record'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FilterSystem } from '@/presentation/components/ui/filter-system'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'

type FilterTab = 'restaurant' | 'wine'

const SHARE_TABS: { key: FilterTab; label: string; variant: 'food' | 'wine' }[] = [
  { key: 'restaurant', label: '식당', variant: 'food' },
  { key: 'wine', label: '와인', variant: 'wine' },
]

function sortRecords(records: RecordWithTarget[], sort: SortOption): RecordWithTarget[] {
  const sorted = [...records]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => {
        const dateA = a.visitDate ?? ''
        const dateB = b.visitDate ?? ''
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return b.createdAt.localeCompare(a.createdAt)
      })
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetName.localeCompare(b.targetName))
    case 'visit_count': {
      const visitCounts = new Map<string, number>()
      for (const r of records) {
        visitCounts.set(r.targetId, (visitCounts.get(r.targetId) ?? 0) + 1)
      }
      return sorted.sort((a, b) => (visitCounts.get(b.targetId) ?? 0) - (visitCounts.get(a.targetId) ?? 0))
    }
  }
}

interface ShareListSheetProps {
  isOpen: boolean
  onClose: () => void
  records: RecordWithTarget[]
  isLoading: boolean
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

export function ShareListSheet({
  isOpen,
  onClose,
  records,
  isLoading,
  selectedIds,
  onSelectionChange,
}: ShareListSheetProps) {
  const [filter, setFilter] = useState<FilterTab>('restaurant')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [conjunction, setConjunction] = useState<'and' | 'or'>('and')
  const [currentSort, setCurrentSort] = useState<SortOption>('latest')
  const inputRef = useRef<HTMLInputElement>(null)

  // body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // 검색창 열리면 포커스
  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus()
  }, [isSearchOpen])

  // 탭 전환 시 필터/소팅 초기화
  useEffect(() => {
    setFilterRules([])
    setCurrentSort('latest')
    setIsFilterOpen(false)
    setIsSortOpen(false)
  }, [filter])

  const accentType = filter === 'restaurant' ? 'food' : 'wine'
  const filterAttributes = filter === 'restaurant' ? RESTAURANT_FILTER_ATTRIBUTES : WINE_FILTER_ATTRIBUTES

  const filteredRecords = useMemo(() => {
    let result = records.filter((r) => r.targetType === filter)

    // 필터 룰 적용
    if (filterRules.length > 0) {
      result = result.filter((r) =>
        matchesAllRules(r as unknown as Record<string, unknown>, filterRules, conjunction),
      )
    }

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (r) =>
          r.targetName.toLowerCase().includes(q) ||
          r.targetArea?.toLowerCase().includes(q) ||
          r.targetMeta?.toLowerCase().includes(q),
      )
    }

    // 정렬
    result = sortRecords(result, currentSort)

    return result
  }, [records, filter, filterRules, conjunction, searchQuery, currentSort])

  const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id))

  const toggleAll = () => {
    const next = new Set(selectedIds)
    if (allFilteredSelected) {
      filteredRecords.forEach((r) => next.delete(r.id))
    } else {
      filteredRecords.forEach((r) => next.add(r.id))
    }
    onSelectionChange(next)
  }

  const toggleRecord = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen)
    if (isSortOpen) setIsSortOpen(false)
  }

  const handleSortToggle = () => {
    setIsSortOpen(!isSortOpen)
    if (isFilterOpen) setIsFilterOpen(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} style={{ zIndex: 40 }} />
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center">
            <X size={20} style={{ color: 'var(--text)' }} />
          </button>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
            공유 항목 선택
          </h2>
          <div className="w-9" />
        </div>

        {/* 스티키 탭 — 식당/와인 + 필터·소팅·검색 */}
        <StickyTabs
          tabs={SHARE_TABS}
          activeTab={filter}
          variant={filter === 'restaurant' ? 'food' : 'wine'}
          onTabChange={setFilter}
          rightSlot={
            isSearchOpen ? (
              <div className="flex flex-1 items-center gap-2" style={{ marginLeft: '8px' }}>
                <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름으로 검색"
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
                    onClick={() => setSearchQuery('')}
                    className="flex shrink-0 items-center justify-center"
                    style={{ color: 'var(--text-hint)' }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="shrink-0 text-[12px] font-medium"
                  style={{ color: 'var(--text-sub)' }}
                >
                  닫기
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFilterToggle}
                  className={`icon-button ${isFilterOpen ? `active ${accentType}` : ''}`}
                  title="필터"
                >
                  <SlidersHorizontal size={20} />
                </button>
                <button
                  type="button"
                  onClick={handleSortToggle}
                  className={`icon-button ${isSortOpen ? `active ${accentType}` : ''}`}
                  title="정렬"
                >
                  <ArrowUpDown size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSearchOpen(true); setIsFilterOpen(false); setIsSortOpen(false) }}
                  className="icon-button"
                  title="검색"
                >
                  <Search size={20} />
                </button>
              </div>
            )
          }
        />

        {/* 필터 패널 */}
        {isFilterOpen && (
          <FilterSystem
            rules={filterRules}
            conjunction={conjunction}
            attributes={filterAttributes}
            onRulesChange={setFilterRules}
            onConjunctionChange={setConjunction}
            accentColor={filter === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'}
            onClose={() => setIsFilterOpen(false)}
          />
        )}

        {/* 소팅 드롭다운 */}
        {isSortOpen && (
          <SortDropdown
            currentSort={currentSort}
            onSortChange={(sort) => { setCurrentSort(sort); setIsSortOpen(false) }}
            accentType={accentType}
          />
        )}

        {/* 전체 선택 바 */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-sub)' }}>
            {selectedIds.size}/{records.length}개 선택
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-[12px] font-semibold"
            style={{ color: 'var(--accent-social)' }}
          >
            {allFilteredSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        {/* 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="text-[13px]" style={{ color: 'var(--text-hint)' }}>불러오는 중...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <span className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
                {searchQuery ? '검색 결과가 없습니다' : '기록이 없습니다'}
              </span>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const isSelected = selectedIds.has(record.id)
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => toggleRecord(record.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-social-light)' : 'transparent',
                    opacity: isSelected ? 1 : 0.6,
                  }}
                >
                  {/* 체크박스 */}
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-social)' : 'transparent',
                      border: `1.5px solid ${isSelected ? 'var(--accent-social)' : 'var(--border-bold)'}`,
                    }}
                  >
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </div>

                  {/* 타입 아이콘 */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    {record.targetType === 'restaurant' ? (
                      <UtensilsCrossed size={16} style={{ color: 'var(--accent-food)' }} />
                    ) : (
                      <Wine size={16} style={{ color: 'var(--accent-wine)' }} />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex flex-1 flex-col items-start gap-0.5 overflow-hidden">
                    <span
                      className="w-full truncate text-left text-[13px] font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {record.targetName}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                      {record.targetArea ?? record.targetMeta ?? ''}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* 하단 확인 바 */}
        <div
          className="px-4 pb-4 pt-3"
          style={{
            borderTop: '1px solid var(--border)',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-3.5 text-center text-[15px] font-bold transition-opacity"
            style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
          >
            {selectedIds.size}개 항목 공유 · 완료
          </button>
        </div>
      </div>
    </>
  )
}
