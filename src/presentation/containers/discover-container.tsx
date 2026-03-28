'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Plus, Loader2 } from 'lucide-react'
import { AreaChips } from '@/presentation/components/discover/area-chips'
import { DiscoverCard } from '@/presentation/components/discover/discover-card'
import { DiscoverSearchBar } from '@/presentation/components/discover/discover-search-bar'
import { useDiscover } from '@/application/hooks/use-discover'

export function DiscoverContainer() {
  const router = useRouter()
  const { cards, area, setArea, isLoading, hasMore, loadMore, isEmpty } = useDiscover()

  // Infinite scroll observer
  const observer = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect()
      if (!node || !hasMore || isLoading) return
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMore()
      })
      observer.current.observe(node)
    },
    [hasMore, isLoading, loadMore],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* Header */}
      <nav
        className="sticky top-0 z-10 flex items-center border-b border-[var(--border)] bg-[var(--bg)] px-4"
        style={{ height: '44px', padding: '12px 16px 0' }}
      >
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center text-[20px] font-extrabold" style={{ color: 'var(--text)', marginBottom: 10 }}>
          탐색
        </span>
        <div className="w-11" />
      </nav>

      {/* Search bar (Phase 1 placeholder) */}
      <div className="py-2">
        <DiscoverSearchBar placeholder="식당, 동네, 장르 검색" />
      </div>

      {/* Area chips */}
      <AreaChips activeArea={area} onAreaChange={setArea} />

      {/* Card list */}
      {!isEmpty && (
        <div className="flex flex-col gap-3 px-4 py-3">
          {cards.map((card) => (
            <DiscoverCard key={card.id} card={card} />
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-1" />}

          {/* Loading indicator */}
          {isLoading && cards.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !isLoading && (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <Search size={40} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-4 whitespace-pre-line text-[14px]" style={{ color: 'var(--text-sub)', textAlign: 'center' }}>
            {`이 지역에 등록된\n식당이 아직 없어요\n첫 번째로 등록해 보세요!`}
          </p>
          <button
            type="button"
            onClick={() => router.push('/add?type=restaurant')}
            className="mt-4 flex items-center gap-1 text-[14px] font-semibold"
            style={{ color: 'var(--accent-food)' }}
          >
            <Plus size={16} />
            식당 등록하기
          </button>
        </div>
      )}

      {/* Initial loading */}
      {isLoading && cards.length === 0 && (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
        </div>
      )}

      {/* Bottom home button */}
      <div className="mt-auto px-4 pb-6 pt-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex w-full items-center justify-center gap-[6px] rounded-xl py-3 text-[14px] font-semibold"
          style={{
            color: 'var(--text)',
            backgroundColor: 'var(--bg-card)',
            border: '1.5px solid var(--border)',
          }}
        >
          <ChevronLeft size={16} style={{ color: 'var(--text)' }} />
          홈으로
        </button>
      </div>
    </div>
  )
}
