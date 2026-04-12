'use client'

import { Plus, Search, Sparkles, Loader2 } from 'lucide-react'
import type { SearchResult, SearchScreenState } from '@/domain/entities/search'
import type { WineSearchCandidate } from '@/infrastructure/api/ai-recognition'
import { SearchResultItem } from '@/presentation/components/search/search-result-item'

interface SearchResultsProps {
  screenState: SearchScreenState
  results: SearchResult[]
  variant: 'restaurant' | 'wine'
  onSelect: (result: SearchResult) => void
  onRegister: () => void
  aiCandidates?: WineSearchCandidate[]
  isAiSearching?: boolean
  isSelectingAi?: boolean
  onSelectAiCandidate?: (candidate: WineSearchCandidate) => void
  /** 현재 선택된 항목 ID (지도 연동 강조용) */
  selectedId?: string | null
}

const wineTypeMap: Record<string, string> = {
  red: 'Red', white: 'White', rose: 'Rosé',
  sparkling: 'Sparkling', orange: 'Orange',
  fortified: 'Fortified', dessert: 'Dessert',
}

export function SearchResults({
  screenState,
  results,
  variant,
  onSelect,
  onRegister,
  aiCandidates = [],
  isAiSearching = false,
  isSelectingAi = false,
  onSelectAiCandidate,
  selectedId,
}: SearchResultsProps) {
  if (screenState === 'searching' && results.length === 0 && aiCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--text-hint)] border-t-transparent" />
        <p className="mt-3 text-[13px] text-[var(--text-hint)]">검색 중...</p>
      </div>
    )
  }

  const hasDbResults = results.length > 0
  const hasAiResults = aiCandidates.length > 0
  const showAiSection = variant === 'wine' && (isAiSearching || hasAiResults)
  const showEmpty = screenState === 'empty' && !hasDbResults && !hasAiResults && !isAiSearching

  if (showEmpty) {
    return (
      <div className="flex flex-col items-center py-12">
        <Search size={32} className="mb-3 text-[var(--text-hint)]" />
        <p className="mt-3 text-[14px] text-[var(--text-sub)]">검색 결과가 없습니다</p>
        <button
          type="button"
          onClick={onRegister}
          className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-bold)] px-4 py-2.5 text-[13px] text-[var(--text-sub)]"
        >
          <Plus size={16} />
          목록에 없나요? 직접 등록하기
        </button>
      </div>
    )
  }

  if ((screenState === 'results' || screenState === 'searching') && (hasDbResults || showAiSection)) {
    return (
      <div>
        {/* DB 검색 결과 */}
        {hasDbResults && (
          <ul className="divide-y divide-[var(--border)]">
            {results.map((result) => (
              <li key={result.id}>
                <SearchResultItem result={result} onSelect={onSelect} prestige={result.type === 'restaurant' ? result.prestige : undefined} isSelected={selectedId === result.id} />
              </li>
            ))}
          </ul>
        )}

        {/* AI 검색 결과 섹션 */}
        {showAiSection && (
          <div className={hasDbResults ? 'border-t border-[var(--border)]' : ''}>
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Sparkles size={14} className="text-[var(--accent-wine)]" />
              <span className="text-[12px] font-medium text-[var(--text-sub)]">
                AI 추천 와인
              </span>
              {isAiSearching && (
                <Loader2 size={12} className="animate-spin text-[var(--text-hint)]" />
              )}
            </div>

            {isSelectingAi && (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-wine)] border-t-transparent" />
                <span className="ml-2 text-[13px] text-[var(--text-sub)]">와인 정보 가져오는 중...</span>
              </div>
            )}

            {!isSelectingAi && hasAiResults && (
              <ul className="divide-y divide-[var(--border)]">
                {aiCandidates.map((candidate, idx) => (
                  <li key={`ai-${candidate.name}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => onSelectAiCandidate?.(candidate)}
                      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--accent-wine-light)]"
                    >
                      {candidate.labelImageUrl ? (
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--accent-wine-light)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.labelImageUrl}
                            alt={candidate.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-wine-light)]">
                          <Sparkles size={16} className="text-[var(--accent-wine)]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                          {candidate.nameKo ?? candidate.name}
                          {candidate.vintage ? ` ${candidate.vintage}` : ''}
                        </p>
                        <p className="truncate text-[12px] text-[var(--text-sub)]">
                          {[
                            candidate.wineType ? (wineTypeMap[candidate.wineType] ?? candidate.wineType) : null,
                            candidate.country,
                            candidate.region,
                            candidate.producer,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onRegister}
            className="flex w-full items-center gap-2 px-4 py-3.5 text-[13px] text-[var(--text-sub)]"
          >
            <Plus size={16} />
            목록에 없나요? 직접 등록하기
          </button>
        </div>
      </div>
    )
  }

  return null
}
