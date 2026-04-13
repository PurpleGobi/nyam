'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { UtensilsCrossed, Wine, Bookmark } from 'lucide-react'
import type { BubbleShareRule } from '@/domain/entities/bubble'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import type { FilterOperator } from '@/domain/entities/saved-filter'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import { isAdvancedChip, CASCADING_ALL } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'

/* ================================================================
   ShareRuleEditor — 버블 공유 항목 토글 + 필터
   식당·와인·찜 각각 토글 (디폴트 ON) + 식당/와인은 세부 필터 가능
   ================================================================ */

interface ShareRuleEditorProps {
  value: BubbleShareRule | null
  onChange: (rule: BubbleShareRule | null) => void
  focusType?: 'restaurant' | 'wine' | 'all'
}

type ShareRuleItem = BubbleShareRule['rules'][number]

function rulesToChips(rules: ShareRuleItem[], attributes: FilterAttribute[]): FilterChipItem[] {
  return rules.map((r, i) => {
    const attr = attributes.find((a) => a.key === r.attribute)
    const option = attr?.options?.find((o) => o.value === String(r.value))
    return {
      id: `share_${r.attribute}_${String(r.value)}_${i}`,
      attribute: r.attribute,
      operator: (r.operator || 'eq') as FilterOperator,
      value: r.value,
      displayLabel: String(r.value) === CASCADING_ALL ? '전체' : (option?.label ?? String(r.value ?? '')),
    } satisfies ConditionChip
  })
}

function chipsToRules(chips: FilterChipItem[], domain?: 'restaurant' | 'wine'): ShareRuleItem[] {
  return chips
    .filter((c): c is ConditionChip => !isAdvancedChip(c))
    .map((c) => ({
      attribute: c.attribute,
      operator: c.operator || 'eq',
      value: c.value,
      ...(domain ? { domain } : {}),
    }))
}

function ToggleSwitch({ on, accent = 'var(--accent-social)' }: { on: boolean; accent?: string }) {
  return (
    <div
      className="flex h-[18px] w-8 shrink-0 items-center rounded-full px-0.5 transition-colors"
      style={{ backgroundColor: on ? accent : 'var(--border)' }}
    >
      <div
        className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(13px)' : 'translateX(0)' }}
      />
    </div>
  )
}

export function ShareRuleEditor({ value, onChange, focusType = 'all' }: ShareRuleEditorProps) {
  const allRules = useMemo(() => value?.rules ?? [], [value?.rules])
  const conjunction = value?.conjunction ?? 'and'

  // 도메인별 ON/OFF
  const restaurantOn = value?.enabledDomains?.restaurant ?? true
  const wineOn = value?.enabledDomains?.wine ?? true
  const bookmarkOn = value?.includeBookmarks ?? true

  // 식당/와인 규칙 분리
  const restaurantRules = useMemo(
    () => allRules.filter((r) => r.domain === 'restaurant'),
    [allRules],
  )
  const wineRules = useMemo(
    () => allRules.filter((r) => r.domain === 'wine'),
    [allRules],
  )

  const restaurantRulesRef = useRef(restaurantRules)
  const wineRulesRef = useRef(wineRules)
  useEffect(() => { restaurantRulesRef.current = restaurantRules }, [restaurantRules])
  useEffect(() => { wineRulesRef.current = wineRules }, [wineRules])

  const restaurantChips = useMemo(
    () => rulesToChips(restaurantRules, RESTAURANT_FILTER_ATTRIBUTES),
    [restaurantRules],
  )
  const wineChips = useMemo(
    () => rulesToChips(wineRules, WINE_FILTER_ATTRIBUTES),
    [wineRules],
  )

  /** 공통: 현재 상태 기반으로 mode 결정 + onChange */
  const emitChange = useCallback((patch: {
    enabledDomains?: { restaurant: boolean; wine: boolean }
    includeBookmarks?: boolean
    rules?: ShareRuleItem[]
  }) => {
    const domains = patch.enabledDomains ?? value?.enabledDomains ?? { restaurant: true, wine: true }
    const bookmarks = patch.includeBookmarks ?? value?.includeBookmarks ?? true
    const rules = patch.rules ?? allRules

    const allDomainsOn = domains.restaurant && domains.wine && bookmarks
    const noRules = rules.length === 0

    onChange({
      mode: allDomainsOn && noRules ? 'all' : 'filtered',
      rules,
      conjunction,
      includeBookmarks: bookmarks,
      enabledDomains: domains,
    })
  }, [value, allRules, conjunction, onChange])

  const toggleRestaurant = useCallback(() => {
    const next = !restaurantOn
    emitChange({
      enabledDomains: { restaurant: next, wine: wineOn },
      rules: next ? allRules : allRules.filter((r) => r.domain !== 'restaurant'),
    })
  }, [restaurantOn, wineOn, allRules, emitChange])

  const toggleWine = useCallback(() => {
    const next = !wineOn
    emitChange({
      enabledDomains: { restaurant: restaurantOn, wine: next },
      rules: next ? allRules : allRules.filter((r) => r.domain !== 'wine'),
    })
  }, [wineOn, restaurantOn, allRules, emitChange])

  const toggleBookmark = useCallback(() => {
    emitChange({ includeBookmarks: !bookmarkOn })
  }, [bookmarkOn, emitChange])

  const handleRestaurantChipsChange = useCallback((newChips: FilterChipItem[]) => {
    emitChange({ rules: [...chipsToRules(newChips, 'restaurant'), ...wineRulesRef.current] })
  }, [emitChange])

  const handleWineChipsChange = useCallback((newChips: FilterChipItem[]) => {
    emitChange({ rules: [...restaurantRulesRef.current, ...chipsToRules(newChips, 'wine')] })
  }, [emitChange])

  const noop = useCallback(() => {}, [])

  // focusType 단일 모드용
  const singleDomain = focusType === 'wine' ? 'wine' as const : 'restaurant' as const
  const singleAttributes = focusType === 'wine' ? WINE_FILTER_ATTRIBUTES : RESTAURANT_FILTER_ATTRIBUTES
  const singleChips = useMemo(
    () => rulesToChips(allRules.filter((r) => !r.domain || r.domain === singleDomain), singleAttributes),
    [allRules, singleDomain, singleAttributes],
  )
  const handleSingleChipsChange = useCallback((newChips: FilterChipItem[]) => {
    emitChange({ rules: chipsToRules(newChips, singleDomain) })
  }, [emitChange, singleDomain])

  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl p-1.5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 식당 토글 */}
      {(focusType === 'all' || focusType === 'restaurant') && (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={toggleRestaurant}
            className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
            style={{ backgroundColor: restaurantOn ? 'var(--accent-food-light, rgba(255,96,56,0.08))' : 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={14} style={{ color: restaurantOn ? 'var(--accent-food)' : 'var(--text-hint)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>식당 기록</span>
            </div>
            <ToggleSwitch on={restaurantOn} accent="var(--accent-food)" />
          </button>
            {restaurantOn && focusType === 'all' && (
              <div className="px-2 pb-1">
                <ConditionFilterBar
                  chips={restaurantChips}
                  onChipsChange={handleRestaurantChipsChange}
                  attributes={RESTAURANT_FILTER_ATTRIBUTES}
                  accentType="food"
                  onAdvancedOpen={noop}
                />
              </div>
            )}
            {restaurantOn && focusType === 'restaurant' && (
              <div className="px-2 pb-1">
                <ConditionFilterBar
                  chips={singleChips}
                  onChipsChange={handleSingleChipsChange}
                  attributes={singleAttributes}
                  accentType="food"
                  onAdvancedOpen={noop}
                />
              </div>
            )}
          </div>
        )}

      {/* 와인 토글 */}
      {(focusType === 'all' || focusType === 'wine') && (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={toggleWine}
            className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
            style={{ backgroundColor: wineOn ? 'var(--accent-wine-light, rgba(139,92,246,0.08))' : 'transparent' }}
          >
            <div className="flex items-center gap-2">
              <Wine size={14} style={{ color: wineOn ? 'var(--accent-wine)' : 'var(--text-hint)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>와인 기록</span>
            </div>
            <ToggleSwitch on={wineOn} accent="var(--accent-wine)" />
          </button>
            {wineOn && focusType === 'all' && (
              <div className="px-2 pb-1">
                <ConditionFilterBar
                  chips={wineChips}
                  onChipsChange={handleWineChipsChange}
                  attributes={WINE_FILTER_ATTRIBUTES}
                  accentType="wine"
                  onAdvancedOpen={noop}
                />
              </div>
            )}
            {wineOn && focusType === 'wine' && (
              <div className="px-2 pb-1">
                <ConditionFilterBar
                  chips={singleChips}
                  onChipsChange={handleSingleChipsChange}
                  attributes={singleAttributes}
                  accentType="wine"
                  onAdvancedOpen={noop}
                />
              </div>
            )}
          </div>
        )}

      {/* 찜목록 토글 */}
      <button
        type="button"
        onClick={toggleBookmark}
        className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors"
        style={{ backgroundColor: bookmarkOn ? 'var(--accent-social-light, rgba(59,130,246,0.08))' : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <Bookmark size={14} style={{ color: bookmarkOn ? 'var(--accent-social)' : 'var(--text-hint)' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>찜 목록</span>
        </div>
        <ToggleSwitch on={bookmarkOn} />
      </button>
    </div>
  )
}
