'use client'

import { useState, useCallback, useRef } from 'react'
import { Search, X, Wine, UtensilsCrossed, Check } from 'lucide-react'

export interface LinkSearchResult {
  id: string
  name: string
  meta: string | null
}

interface LinkSearchSheetProps {
  isOpen: boolean
  onClose: () => void
  type: 'restaurant' | 'wine'
  onSelect: (item: LinkSearchResult) => void
}

export function LinkSearchSheet({ isOpen, onClose, type, onSelect }: LinkSearchSheetProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LinkSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setIsSearching(true)
    try {
      const endpoint = type === 'wine'
        ? `/api/wines/search?q=${encodeURIComponent(q)}`
        : `/api/restaurants/search?q=${encodeURIComponent(q)}`
      const res = await fetch(endpoint)
      const data = await res.json()
      const items: LinkSearchResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        meta: type === 'wine'
          ? [r.producer, r.vintage, r.wineType].filter(Boolean).join(' · ')
          : [r.genre, r.area].filter(Boolean).join(' · '),
      }))
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [type])

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }, [doSearch])

  const handleSelect = useCallback((item: LinkSearchResult) => {
    onSelect(item)
    setQuery('')
    setResults([])
    onClose()
  }, [onSelect, onClose])

  if (!isOpen) return null

  const isWine = type === 'wine'
  const accent = isWine ? 'var(--accent-wine)' : 'var(--accent-food)'
  const Icon = isWine ? Wine : UtensilsCrossed

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="mt-auto flex max-h-[80dvh] flex-col rounded-t-2xl" style={{ backgroundColor: 'var(--bg)' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Icon size={18} style={{ color: accent }} />
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
              {isWine ? '함께 마신 와인' : '마신 장소'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center">
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3"
            style={{ height: '44px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <Search size={16} style={{ color: 'var(--text-hint)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => handleInput(e.target.value)}
              placeholder={isWine ? '와인 이름 검색' : '식당 이름 검색'}
              autoFocus
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--text)' }}
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setResults([]) }}>
                <X size={14} style={{ color: 'var(--text-hint)' }} />
              </button>
            )}
          </div>
        </div>

        {/* 결과 리스트 */}
        <div className="flex-1 overflow-y-auto px-4 pb-safe">
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: accent, borderTopColor: 'transparent' }} />
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <p className="py-8 text-center" style={{ fontSize: '14px', color: 'var(--text-hint)' }}>
              검색 결과가 없습니다
            </p>
          )}

          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="flex w-full items-center gap-3 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}15` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              <div className="flex-1 text-left">
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.name}</p>
                {item.meta && (
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '1px' }}>{item.meta}</p>
                )}
              </div>
              <Check size={16} style={{ color: 'var(--text-hint)' }} />
            </button>
          ))}

          {/* 하단 여백 */}
          <div style={{ height: '20px' }} />
        </div>
      </div>
    </div>
  )
}
