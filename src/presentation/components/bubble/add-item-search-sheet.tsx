'use client'

import { useState } from 'react'
import { X, Search, Check, UtensilsCrossed, Wine } from 'lucide-react'

interface SearchResultItem {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  meta: string
}

interface AddItemSearchSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbleName: string
  searchResults: SearchResultItem[]
  existingTargetIds: string[]
  onSearch: (query: string) => void
  onAdd: (targetId: string, targetType: 'restaurant' | 'wine') => Promise<void>
  isLoading?: boolean
}

export function AddItemSearchSheet({
  isOpen,
  onClose,
  bubbleName,
  searchResults,
  existingTargetIds,
  onSearch,
  onAdd,
  isLoading = false,
}: AddItemSearchSheetProps) {
  const [query, setQuery] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'restaurant' | 'wine'>('all')

  if (!isOpen) return null

  const filteredResults = tab === 'all'
    ? searchResults
    : searchResults.filter((r) => r.type === tab)

  const existingSet = new Set(existingTargetIds)

  const handleAdd = async (item: SearchResultItem) => {
    if (addingId || existingSet.has(item.id)) return
    setAddingId(item.id)
    try {
      await onAdd(item.id, item.type)
      existingSet.add(item.id)
    } finally {
      setAddingId(null)
    }
  }

  const handleSearchSubmit = () => {
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[480px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '80vh' }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2">
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>
            {bubbleName}에 추가
          </span>
          <button type="button" onClick={onClose} className="p-1">
            <X size={20} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="px-4 py-2">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: 'var(--bg-section)', border: '1px solid var(--border)' }}
          >
            <Search size={16} style={{ color: 'var(--text-hint)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
              placeholder="식당 또는 와인 검색"
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 px-4 pb-2">
          {([
            { key: 'all' as const, label: '전체' },
            { key: 'restaurant' as const, label: '식당', icon: UtensilsCrossed },
            { key: 'wine' as const, label: '와인', icon: Wine },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all"
              style={{
                backgroundColor: tab === key ? 'var(--accent-social)' : 'var(--bg-section)',
                color: tab === key ? '#FFFFFF' : 'var(--text-sub)',
                border: tab === key ? 'none' : '1px solid var(--border)',
              }}
            >
              {Icon && <Icon size={12} />}
              {label}
            </button>
          ))}
        </div>

        {/* 검색 결과 */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: '50vh' }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Search size={28} style={{ color: 'var(--text-hint)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
                검색어를 입력하세요
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>
                검색 결과가 없어요
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredResults.map((item) => {
                const isExisting = existingSet.has(item.id)
                const isAdding = addingId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isExisting || isAdding}
                    onClick={() => handleAdd(item)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:opacity-70 disabled:opacity-60"
                    style={{
                      backgroundColor: isExisting ? 'color-mix(in srgb, var(--accent-social) 6%, transparent)' : 'transparent',
                    }}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: item.type === 'wine'
                          ? 'color-mix(in srgb, var(--accent-wine) 12%, transparent)'
                          : 'color-mix(in srgb, var(--accent-food) 12%, transparent)',
                      }}
                    >
                      {item.type === 'wine'
                        ? <Wine size={16} style={{ color: 'var(--accent-wine)' }} />
                        : <UtensilsCrossed size={16} style={{ color: 'var(--accent-food)' }} />
                      }
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                        {item.name}
                      </span>
                      {item.meta && (
                        <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                          {item.meta}
                        </span>
                      )}
                    </div>
                    {isExisting ? (
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--accent-social)' }}
                      >
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </div>
                    ) : isAdding ? (
                      <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
                    ) : (
                      <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-social)' }}>
                        추가
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 여백 (safe area) */}
        <div className="h-8" />
      </div>
    </div>
  )
}
