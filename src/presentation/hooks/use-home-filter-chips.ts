'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { FilterChipItem, AdvancedFilterChip } from '@/domain/entities/condition-chip'
import type { HomeViewType, HomeDbFilters } from '@/domain/repositories/home-repository'
import { chipsToFilterRules, isAdvancedChip, createDefaultViewChip, createBubbleViewChip } from '@/domain/entities/condition-chip'
import { usePersistedFilterState } from '@/application/hooks/use-persisted-filter-state'
import type { SocialFilterState } from '@/presentation/components/home/condition-filter-bar'

/** DB에서 처리할 필터 속성 (SQL WHERE로 처리) */
const DB_FILTER_ATTRIBUTES = new Set([
  'genre', 'district', 'area', 'prestige', 'price_range',
  'wine_type', 'variety', 'country', 'vintage', 'acidity_level', 'sweetness_level',
])

interface UseHomeFilterChipsParams {
  userId: string | null
  activeTab: 'restaurant' | 'wine' | 'bubble'
  activeBubbleId: string | null
  activeBubbleIdParam: string | null
  setFilterRules: (rules: FilterRule[]) => void
  setActiveBubbleId: (id: string | null) => void
  setSocialFilter: React.Dispatch<React.SetStateAction<SocialFilterState>>
}

export function useHomeFilterChips({
  userId,
  activeTab,
  activeBubbleId,
  activeBubbleIdParam,
  setFilterRules,
  setActiveBubbleId,
  setSocialFilter,
}: UseHomeFilterChipsParams) {
  const { loadState, saveState } = usePersistedFilterState(userId)
  const [initializedTabs, setInitializedTabs] = useState<Set<string>>(new Set())

  // ── 조건 칩 상태 ──
  const [conditionChips, setConditionChips] = useState<FilterChipItem[]>([])
  const [mapConditionChips, setMapConditionChips] = useState<FilterChipItem[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [prevTab, setPrevTab] = useState(activeTab)

  // 초기 마운트 + 탭 전환 시 저장된 칩 복원
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    void loadState(activeTab).then((loaded) => {
      if (cancelled) return

      let chips: FilterChipItem[]
      if (activeBubbleIdParam && activeTab !== 'bubble') {
        const nonViewChips = loaded.filter((c) => isAdvancedChip(c) || (c as { attribute: string }).attribute !== 'view')
        chips = [createBubbleViewChip(), ...nonViewChips]
      } else {
        const hasViewChip = loaded.some((c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'view')
        chips = (!hasViewChip && activeTab !== 'bubble')
          ? [createDefaultViewChip(), ...loaded]
          : loaded
      }

      setInitializedTabs((prev) => {
        if (prev.has(activeTab)) return prev
        const next = new Set(prev)
        next.add(activeTab)
        return next
      })
      setConditionChips(chips)
      const rules = chipsToFilterRules(chips)
      setFilterRules(rules)
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, userId, loadState, setFilterRules])

  // 탭 전환 시 아직 로드 안 된 탭이면 칩 초기화
  const handleTabTransition = useCallback((newActiveBubbleId: string | null) => {
    if (prevTab !== activeTab) {
      setPrevTab(activeTab)
      if (!newActiveBubbleId) {
        setSocialFilter({ followingUserId: null, bubbleId: null })
      }
      if (!initializedTabs.has(activeTab)) {
        setConditionChips(activeTab !== 'bubble' ? [createDefaultViewChip()] : [])
      }
    }
  }, [prevTab, activeTab, initializedTabs, setSocialFilter])

  // 칩 변경 → filterRules 동기화 + 저장 + 소셜 필터 정합성
  const handleChipsChange = useCallback((chips: FilterChipItem[]) => {
    setConditionChips(chips)
    const rules = chipsToFilterRules(chips)
    setFilterRules(rules)
    saveState(activeTab, chips)

    const viewChip = chips.find((c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'view')
    if (viewChip) {
      const views = String((viewChip as { value: string }).value).split(',').map((v) => v.trim())
      if (!views.includes('bubble')) {
        setActiveBubbleId(null)
      }
      setSocialFilter((prev) => ({
        followingUserId: views.includes('following') ? prev.followingUserId : null,
        bubbleId: views.includes('bubble') ? prev.bubbleId : null,
      }))
    } else {
      setActiveBubbleId(null)
    }
  }, [setFilterRules, saveState, activeTab, setActiveBubbleId, setSocialFilter])

  // Advanced Filter 적용
  const handleAdvancedApply = useCallback((chip: AdvancedFilterChip) => {
    const hasExisting = conditionChips.some(isAdvancedChip)
    let nextChips: FilterChipItem[]
    if (hasExisting) {
      nextChips = conditionChips.map((c) => isAdvancedChip(c) ? chip : c)
    } else {
      nextChips = [...conditionChips, chip]
    }
    handleChipsChange(nextChips)
  }, [conditionChips, handleChipsChange])

  // ── view 값 추출 ──
  const viewTypes: HomeViewType[] = useMemo(() => {
    if (activeBubbleId) return ['bubble']

    const views: HomeViewType[] = []
    for (const chip of conditionChips) {
      if (isAdvancedChip(chip)) continue
      if (chip.attribute !== 'view') continue
      const vals = String(chip.value).split(',')
      for (const v of vals) {
        const trimmed = v.trim()
        if (trimmed === 'mine' || trimmed === 'bubble' || trimmed === 'following') {
          views.push(trimmed)
        }
      }
    }
    return views
  }, [conditionChips, activeBubbleId])

  // view 칩은 데이터 소스 변경용이므로 filterRules에서 제외
  const nonViewFilterRules = useMemo(() => {
    const rules = chipsToFilterRules(conditionChips)
    return rules.filter((r) => r.attribute !== 'view')
  }, [conditionChips])

  const { dbFilterRules, jsFilterRules } = useMemo(() => {
    const db: FilterRule[] = []
    const js: FilterRule[] = []
    for (const rule of nonViewFilterRules) {
      if (rule.attribute.startsWith('prestige_grade:')) {
        js.push(rule)
      } else if (DB_FILTER_ATTRIBUTES.has(rule.attribute)) {
        db.push(rule)
      } else {
        js.push(rule)
      }
    }
    return { dbFilterRules: db, jsFilterRules: js }
  }, [nonViewFilterRules])

  const homeDbFilters: HomeDbFilters | undefined = useMemo(() => {
    if (dbFilterRules.length === 0) return undefined
    const filters: HomeDbFilters = {}
    for (const rule of dbFilterRules) {
      switch (rule.attribute) {
        case 'genre': filters.genre = String(rule.value); break
        case 'district': filters.district = String(rule.value); break
        case 'area': filters.area = String(rule.value); break
        case 'prestige': filters.prestige = String(rule.value); break
        case 'price_range': filters.priceRange = Number(rule.value); break
        case 'wine_type': filters.wineType = String(rule.value); break
        case 'variety': filters.variety = String(rule.value); break
        case 'country': filters.country = String(rule.value); break
        case 'vintage':
          filters.vintage = Number(rule.value)
          filters.vintageOp = rule.operator === 'lte' ? 'lte' : 'eq'
          break
        case 'acidity_level': filters.acidity = Number(rule.value); break
        case 'sweetness_level': filters.sweetness = Number(rule.value); break
      }
    }
    return filters
  }, [dbFilterRules])

  return {
    conditionChips,
    setConditionChips,
    mapConditionChips,
    setMapConditionChips,
    isAdvancedOpen,
    setIsAdvancedOpen,
    handleChipsChange,
    handleAdvancedApply,
    handleTabTransition,
    viewTypes,
    dbFilterRules,
    jsFilterRules,
    homeDbFilters,
  }
}
