'use client'

import { useMemo, useCallback, useRef, useEffect } from 'react'
import { Filter, Zap, UtensilsCrossed, Wine } from 'lucide-react'
import type { BubbleShareRule } from '@/domain/entities/bubble'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import type { FilterOperator } from '@/domain/entities/saved-filter'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import { isAdvancedChip, CASCADING_ALL } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'

/* ================================================================
   ShareRuleEditor — 버블 공유 규칙 설정 UI
   "모든 항목 공유" 토글 + "조건부" 시 ConditionFilterBar 재사용
   focusType=all → 식당/와인 각각 완전 독립된 ConditionFilterBar
   ================================================================ */

interface ShareRuleEditorProps {
  value: BubbleShareRule | null
  onChange: (rule: BubbleShareRule | null) => void
  focusType?: 'restaurant' | 'wine' | 'all'
}

type ShareRuleItem = BubbleShareRule['rules'][number]

/** rules → FilterChipItem[] */
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

/** FilterChipItem[] → rules (domain 스탬프 포함) */
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

export function ShareRuleEditor({ value, onChange, focusType = 'all' }: ShareRuleEditorProps) {
  const mode = value?.mode ?? 'all'
  const allRules = useMemo(() => value?.rules ?? [], [value?.rules])

  // 식당/와인 규칙을 domain 필드로 완전 분리
  const restaurantRules = useMemo(
    () => allRules.filter((r) => r.domain === 'restaurant'),
    [allRules],
  )
  const wineRules = useMemo(
    () => allRules.filter((r) => r.domain === 'wine'),
    [allRules],
  )

  // ref로 상대 도메인 규칙 보관 — 콜백에서 stale closure 방지
  const restaurantRulesRef = useRef(restaurantRules)
  const wineRulesRef = useRef(wineRules)
  // useEffect 안에서 ref 갱신 (렌더 중 직접 할당 금지)
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

  const conjunction = value?.conjunction ?? 'and'

  const handleModeChange = (newMode: 'all' | 'filtered') => {
    if (newMode === 'all') {
      onChange({ mode: 'all', rules: [], conjunction: 'and' })
    } else {
      onChange({ mode: 'filtered', rules: allRules, conjunction })
    }
  }

  /** 식당 칩 변경 → 와인 규칙은 ref에서 가져와 합침 */
  const handleRestaurantChipsChange = useCallback((newChips: FilterChipItem[]) => {
    onChange({
      mode: 'filtered',
      rules: [...chipsToRules(newChips, 'restaurant'), ...wineRulesRef.current],
      conjunction,
    })
  }, [onChange, conjunction])

  /** 와인 칩 변경 → 식당 규칙은 ref에서 가져와 합침 */
  const handleWineChipsChange = useCallback((newChips: FilterChipItem[]) => {
    onChange({
      mode: 'filtered',
      rules: [...restaurantRulesRef.current, ...chipsToRules(newChips, 'wine')],
      conjunction,
    })
  }, [onChange, conjunction])

  /** focusType 단일 */
  const singleDomain = focusType === 'wine' ? 'wine' as const : 'restaurant' as const
  const singleAttributes = focusType === 'wine' ? WINE_FILTER_ATTRIBUTES : RESTAURANT_FILTER_ATTRIBUTES
  const singleChips = useMemo(
    () => rulesToChips(allRules.filter((r) => !r.domain || r.domain === singleDomain), singleAttributes),
    [allRules, singleDomain, singleAttributes],
  )
  const handleSingleChipsChange = useCallback((newChips: FilterChipItem[]) => {
    onChange({
      mode: 'filtered',
      rules: chipsToRules(newChips, singleDomain),
      conjunction,
    })
  }, [onChange, conjunction, singleDomain])

  const noop = useCallback(() => {}, [])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-[var(--text-sub)]">공유 규칙</span>

      {/* 모드 선택 */}
      <div className="flex gap-2">
        {([
          { m: 'all' as const, label: '모든 항목 공유', icon: Zap, desc: '새 기록이\n자동으로 공유' },
          { m: 'filtered' as const, label: '조건부 공유', icon: Filter, desc: '필터 조건에\n맞는 기록만' },
        ]).map(({ m, label, icon: Icon, desc }) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
            style={{
              backgroundColor: mode === m ? 'var(--accent-social)' : 'var(--bg-card)',
              color: mode === m ? 'var(--primary-foreground)' : 'var(--text-sub)',
              border: `1.5px solid ${mode === m ? 'var(--accent-social)' : 'var(--border)'}`,
            }}
          >
            <Icon size={18} />
            <span className="text-[12px] font-semibold">{label}</span>
            <span className="whitespace-pre-line text-center text-[10px] opacity-70">{desc}</span>
          </button>
        ))}
      </div>

      {/* 찜도 자동 포함 토글 — mode가 'all' 또는 'filtered' 일 때 표시 */}
      {mode !== null && (
        <div
          className="flex items-center justify-between rounded-xl px-3 py-2.5"
          style={{ backgroundColor: 'var(--bg-section)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>찜도 자동 포함</span>
            <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
              찜한 식당/와인도 필터 조건에 맞으면 자동으로 추가
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value?.includeBookmarks ?? false}
            onClick={() => {
              onChange({
                ...value ?? { mode: 'all' as const, rules: [], conjunction: 'and' as const },
                includeBookmarks: !(value?.includeBookmarks ?? false),
              })
            }}
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{
              backgroundColor: (value?.includeBookmarks ?? false) ? 'var(--accent-social)' : 'var(--bg-elevated)',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform"
              style={{
                transform: (value?.includeBookmarks ?? false) ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      )}

      {/* 조건부 모드일 때 필터 빌더 */}
      {mode === 'filtered' && (
        <div className="mt-1 flex flex-col gap-3">
          {focusType === 'all' ? (
            <>
              {/* 식당 필터 — 완전 독립 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 px-1">
                  <UtensilsCrossed size={13} style={{ color: 'var(--accent-food)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>식당</span>
                </div>
                <ConditionFilterBar
                  chips={restaurantChips}
                  onChipsChange={handleRestaurantChipsChange}
                  attributes={RESTAURANT_FILTER_ATTRIBUTES}
                  accentType="food"
                  onAdvancedOpen={noop}
                />
              </div>

              {/* 와인 필터 — 완전 독립 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 px-1">
                  <Wine size={13} style={{ color: 'var(--accent-wine)' }} />
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>와인</span>
                </div>
                <ConditionFilterBar
                  chips={wineChips}
                  onChipsChange={handleWineChipsChange}
                  attributes={WINE_FILTER_ATTRIBUTES}
                  accentType="wine"
                  onAdvancedOpen={noop}
                />
              </div>
            </>
          ) : (
            <ConditionFilterBar
              chips={singleChips}
              onChipsChange={handleSingleChipsChange}
              attributes={singleAttributes}
              accentType={focusType === 'wine' ? 'wine' : 'food'}
              onAdvancedOpen={noop}
            />
          )}

          {allRules.length === 0 && (
            <p className="text-[11px] text-[var(--text-hint)]">
              조건을 추가하면 해당 조건에 맞는 기록만 자동으로 공유됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
