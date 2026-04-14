'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Plus, X, SlidersHorizontal, Check, MapPin, ChevronDown } from 'lucide-react'
import type { FilterAttribute, CascadingOption, LocationTab } from '@/domain/entities/filter-config'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import { isAdvancedChip, generateChipId, cascadingKey, isCascadingKey, getCascadingBaseKey, getCascadingLevel, CASCADING_ALL, LOCATION_TAB_KEY, LOCATION_CITY_KEY, LOCATION_DETAIL_KEY, isLocationChipKey, childrenCascadeTypeKey, childrenCascadeGradeKey, isGradeSubChipKey, isChildrenCascadeChipKey, parseGradeSubChipKey } from '@/domain/entities/condition-chip'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { InlinePager } from '@/presentation/components/home/inline-pager'

/* ================================================================
   ConditionFilterBar
   - 조건 칩들 (attribute:value ✕)  — 모든 속성 동등 (status 포함)
   - + 버튼 → 속성 선택 팝오버 → 값 선택 팝오버
   - +Advanced Filter → onAdvancedOpen 콜백
   - 칩이 없으면 + 버튼만 표시 (전체보기 상태)
   ================================================================ */

export interface SocialFilterOption {
  id: string
  label: string
  iconUrl?: string | null
  iconName?: string | null
  iconBgColor?: string | null
}

export interface SocialFilterState {
  followingUserId: string | null
  bubbleId: string | null
}

interface ConditionFilterBarProps {
  chips: FilterChipItem[]
  onChipsChange: (chips: FilterChipItem[]) => void
  attributes: FilterAttribute[]
  accentType: 'food' | 'wine' | 'social'
  onAdvancedOpen?: () => void
  recordPage?: number
  recordTotalPages?: number
  onRecordPagePrev?: () => void
  onRecordPageNext?: () => void
  /** 소셜 필터: 팔로잉 유저 목록 */
  socialFollowingUsers?: SocialFilterOption[]
  /** 소셜 필터: 내 버블 목록 */
  socialBubbles?: SocialFilterOption[]
  /** 소셜 필터: 현재 선택 상태 */
  socialFilter?: SocialFilterState
  /** 소셜 필터: 변경 콜백 */
  onSocialFilterChange?: (filter: SocialFilterState) => void
}

/* ── 포탈 팝오버 (버튼 기준 위치) ── */
function Popover({
  anchorRef,
  align = 'left',
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  align?: 'left' | 'right'
  children: React.ReactNode
  onClose: () => void
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const btn = anchorRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const popWidth = 170
    if (align === 'right') {
      if (r.right < popWidth + 8) {
        setStyle({ top: r.bottom + 4, left: Math.max(8, r.left) })
      } else {
        setStyle({ top: r.bottom + 4, right: window.innerWidth - r.right })
      }
    } else {
      setStyle({ top: r.bottom + 4, left: r.left })
    }
  }, [anchorRef, align])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-[200] min-w-[170px] rounded-xl py-1 shadow-lg"
      style={{
        ...style,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        maxHeight: '340px',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

export function ConditionFilterBar({
  chips,
  onChipsChange,
  attributes,
  accentType,
  onAdvancedOpen,
  recordPage,
  recordTotalPages,
  onRecordPagePrev,
  onRecordPageNext,
  socialFollowingUsers,
  socialBubbles,
  socialFilter,
  onSocialFilterChange,
}: ConditionFilterBarProps) {
  const showPager = recordTotalPages != null && recordTotalPages > 1
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<FilterAttribute | null>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // 칩 클릭 → 값 변경 드롭다운
  const [editingChipId, setEditingChipId] = useState<string | null>(null)
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  // cascading-select 다단계 선택 상태
  const [cascadingState, setCascadingState] = useState<{
    attribute: FilterAttribute
    level: number
    currentOptions: CascadingOption[]
  } | null>(null)



  // multi-select 체크박스 상태
  const [multiSelectState, setMultiSelectState] = useState<{
    attribute: FilterAttribute
    selected: Set<string>
  } | null>(null)

  // location 팝오버 상태
  const [locationState, setLocationState] = useState<{
    attribute: FilterAttribute
    tabIndex: number
    level: number       // 0: 도시, 1: 구/생활권
    city: string | null
  } | null>(null)

  // 소셜 필터 하위 드롭다운 열림 상태
  const [socialChipOpen, setSocialChipOpen] = useState<'following' | 'bubble' | null>(null)
  const socialChipRef = useRef<HTMLButtonElement>(null)
  const [locTabIdx, setLocTabIdx] = useState(0)

  const accent = accentType === 'wine' ? 'var(--accent-wine)' : accentType === 'social' ? 'var(--accent-social)' : 'var(--accent-food)'
  const wineClass = accentType === 'wine' ? 'wine' : accentType === 'social' ? 'social' : ''

  // 모든 칩을 동등하게 취급
  const conditionChips = chips.filter((c) => !isAdvancedChip(c)) as ConditionChip[]
  const advancedChips = chips.filter(isAdvancedChip)

  // children-cascade 속성 목록 (options에 children이 있는 select 속성)
  const childrenCascadeAttrs = useMemo(() => attributes.filter(
    (a) => a.type === 'select' && a.options?.some((o) => o.children && o.children.length > 0),
  ), [attributes])

  // 각 children-cascade 속성별 이미 선택된 type values
  const usedCascadeTypes: Map<string, string[]> = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const attr of childrenCascadeAttrs) {
      const typeKey = childrenCascadeTypeKey(attr.key)
      const typeChip = conditionChips.find((c) => c.attribute === typeKey)
      map.set(attr.key, typeChip ? String(typeChip.value).split(',').map((v) => v.trim()) : [])
    }
    return map
  }, [childrenCascadeAttrs, conditionChips])

  // 이미 추가된 속성 키 (중복 방지) — cascading 칩은 base key로 그룹, location/children-cascade 칩 그룹도 고려
  const usedBaseKeys = new Set(conditionChips.map((c) => {
    if (isLocationChipKey(c.attribute)) return 'location'
    // children-cascade (prestige, map_source 등): 내부 키로 그룹
    for (const attr of childrenCascadeAttrs) {
      if (isChildrenCascadeChipKey(c.attribute, attr.key)) return `__cascade_${attr.key}__`
    }
    return isCascadingKey(c.attribute) ? getCascadingBaseKey(c.attribute) : c.attribute
  }))
  const availableAttributes = attributes.filter((a) => {
    if (usedBaseKeys.has(a.key)) return false
    // children-cascade 모드: 아직 선택 안 한 type이 있으면 표시
    if (childrenCascadeAttrs.some((ca) => ca.key === a.key)) {
      const used = usedCascadeTypes.get(a.key) ?? []
      const allTypes = a.options?.map((o) => o.value) ?? []
      return allTypes.some((t) => !used.includes(t))
    }
    return true
  })

  /* ── helpers: cascading 트리에서 레벨별 옵션 찾기 ── */
  const findCascadingOptionsAtLevel = useCallback((
    attr: FilterAttribute,
    level: number,
    currentChips: ConditionChip[],
  ): CascadingOption[] | null => {
    if (!attr.cascadingOptions) return null
    let options: CascadingOption[] = attr.cascadingOptions
    for (let l = 0; l < level; l++) {
      const chipAtLevel = currentChips.find((c) => c.attribute === cascadingKey(attr.key, l))
      if (!chipAtLevel) return null
      const selected = options.find((o) => o.value === String(chipAtLevel.value))
      if (!selected?.children) return null
      options = selected.children
    }
    return options
  }, [])

  /** 칩 attribute label 해석 (cascading은 레벨별 라벨 사용, location은 전용 라벨) */
  const getChipAttrLabel = useCallback((chip: ConditionChip): string => {
    if (chip.attribute === LOCATION_TAB_KEY) return '위치'
    if (chip.attribute === LOCATION_CITY_KEY) {
      const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
      const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
      const tab = tabChip ? tabs[Number(tabChip.value)] : undefined
      return tab?.cascadingLabels[0] ?? '도시'
    }
    if (chip.attribute === LOCATION_DETAIL_KEY) {
      const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
      const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
      const tab = tabChip ? tabs[Number(tabChip.value)] : undefined
      return tab?.cascadingLabels[1] ?? '세부'
    }
    if (isCascadingKey(chip.attribute)) {
      const baseKey = getCascadingBaseKey(chip.attribute)
      const level = getCascadingLevel(chip.attribute)
      const attr = attributes.find((a) => a.key === baseKey)
      return attr?.cascadingLabels?.[level] ?? attr?.label ?? baseKey
    }
    // children-cascade type 칩 (예: prestige_type, map_source_type)
    for (const ca of childrenCascadeAttrs) {
      if (chip.attribute === childrenCascadeTypeKey(ca.key)) return ca.label
    }
    // children-cascade grade 서브칩 (예: prestige_grade:michelin)
    const gradeInfo = parseGradeSubChipKey(chip.attribute)
    if (gradeInfo) {
      const parentAttr = attributes.find((a) => a.key === gradeInfo.baseKey)
      const typeOpt = parentAttr?.options?.find((o) => o.value === gradeInfo.typeValue)
      return typeOpt?.label ?? gradeInfo.typeValue
    }
    return attributes.find((a) => a.key === chip.attribute)?.label ?? chip.attribute
  }, [attributes, conditionChips, childrenCascadeAttrs])

  /* ── handlers ── */
  const handleAddCondition = useCallback((attr: FilterAttribute, value: string) => {
    // children-cascade (prestige, map_source 등): 상위 type칩 1개 (누적) + grade 서브칩 추가
    if (attr.options?.some((o) => o.children && o.children.length > 0)) {
      const typeKey = childrenCascadeTypeKey(attr.key)
      const opt = attr.options?.find((o) => o.value === value)
      const existingTypeChip = chips.find((c) => !isAdvancedChip(c) && c.attribute === typeKey) as ConditionChip | undefined

      let next: FilterChipItem[]
      if (existingTypeChip) {
        const newValue = `${existingTypeChip.value},${value}`
        const newLabel = newValue.split(',').map((v) => attr.options?.find((o) => o.value === v.trim())?.label ?? v).join(', ')
        next = chips.map((c) =>
          c.id === existingTypeChip.id ? { ...c, value: newValue, displayLabel: newLabel } : c,
        )
      } else {
        const typeChip: ConditionChip = {
          id: generateChipId(),
          attribute: typeKey,
          operator: 'eq',
          value,
          displayLabel: opt?.label ?? value,
        }
        next = [...chips, typeChip]
      }
      const gradeChip: ConditionChip = {
        id: generateChipId(),
        attribute: childrenCascadeGradeKey(attr.key, value),
        operator: 'eq',
        value: CASCADING_ALL,
        displayLabel: '전체',
      }
      next.push(gradeChip)
      onChipsChange(next)

      const usedAfter = [...(usedCascadeTypes.get(attr.key) ?? []), value]
      const remaining = attr.options?.filter((o) => !usedAfter.includes(o.value)) ?? []
      if (remaining.length === 0) {
        setSelectedAttribute(null)
        setIsAddOpen(false)
      }
      setCascadingState(null)
      return
    }

    // top-level 또는 children에서 option 탐색
    let option = attr.options?.find((o) => o.value === value)
    if (!option) {
      for (const parent of attr.options ?? []) {
        const child = parent.children?.find((c) => c.value === value)
        if (child) { option = child; break }
      }
    }
    const newChip: ConditionChip = {
      id: generateChipId(),
      attribute: attr.key,
      operator: 'eq',
      value,
      displayLabel: option?.label ?? value,
    }
    onChipsChange([...chips, newChip])
    setSelectedAttribute(null)
    setIsAddOpen(false)
    setCascadingState(null)

  }, [chips, onChipsChange, usedCascadeTypes])

  /** multi-select에서 editingChipId를 추적하는 ref (실시간 적용에 필요) */
  const multiSelectChipIdRef = useRef<string | null>(null)

  /** multi-select 실시간 적용 — 체크 토글할 때마다 칩을 즉시 업데이트 */
  const applyMultiSelectImmediate = useCallback((attr: FilterAttribute, selected: Set<string>) => {
    if (selected.size === 0) {
      if (multiSelectChipIdRef.current) {
        onChipsChange(chips.filter((c) => c.id !== multiSelectChipIdRef.current))
        multiSelectChipIdRef.current = null
      }
      return
    }
    const selectedValues = Array.from(selected)
    const combinedValue = selectedValues.join(',')
    const combinedLabel = selectedValues
      .map((v) => attr.options?.find((o) => o.value === v)?.label ?? v)
      .join(', ')

    if (multiSelectChipIdRef.current) {
      onChipsChange(chips.map((c) =>
        c.id === multiSelectChipIdRef.current
          ? { ...c, value: combinedValue, displayLabel: combinedLabel }
          : c,
      ))
    } else {
      const newId = generateChipId()
      multiSelectChipIdRef.current = newId
      const newChip: ConditionChip = {
        id: newId,
        attribute: attr.key,
        operator: 'eq',
        value: combinedValue,
        displayLabel: combinedLabel,
      }
      onChipsChange([...chips, newChip])
    }
  }, [chips, onChipsChange])

  /** location 탭+도시 선택 → 도시 칩 바로 생성 (탭 칩 없음) */
  const handleLocationCityDirectSelect = useCallback((tabIndex: number, cityValue: string, cityLabel: string) => {
    if (!locationState) return
    const tabs = locationState.attribute.locationTabs ?? []
    const tab = tabs[tabIndex]
    if (!tab) return

    const cityOption = tab.cascadingOptions.find((o) => o.value === cityValue)
    const hasChildren = cityOption?.children && cityOption.children.length > 0

    // 탭 정보를 city 칩에 내부 보관 (filterKey 등에 활용)
    const newChips: ConditionChip[] = [
      {
        id: generateChipId(),
        attribute: LOCATION_TAB_KEY,
        operator: 'eq',
        value: String(tabIndex),
        displayLabel: tab.label,
        filterKey: tab.fieldKey,
        hidden: true,
      },
      {
        id: generateChipId(),
        attribute: LOCATION_CITY_KEY,
        operator: 'eq',
        value: cityValue,
        displayLabel: cityLabel,
      },
    ]

    if (hasChildren) {
      newChips.push({
        id: generateChipId(),
        attribute: LOCATION_DETAIL_KEY,
        operator: 'eq',
        value: CASCADING_ALL,
        displayLabel: '전체',
        filterKey: tab.fieldKey,
      })
    }

    onChipsChange([...chips.filter((c) => !isAdvancedChip(c) ? !isLocationChipKey(c.attribute) : true), ...newChips])
    setLocationState(null)
    setIsAddOpen(false)
  }, [locationState, chips, onChipsChange])

  /** location: 내 위치 선택 (기존 nearby 로직) */
  const handleLocationNearby = useCallback(() => {
    const newChip: ConditionChip = {
      id: generateChipId(),
      attribute: 'location',
      operator: 'eq',
      value: 'nearby',
      displayLabel: '내 주변',
    }
    onChipsChange([...chips.filter((c) => !isAdvancedChip(c) ? !isLocationChipKey(c.attribute) && c.attribute !== 'location' : true), newChip])
    setLocationState(null)
    setIsAddOpen(false)
  }, [chips, onChipsChange])

  /** location: 도시 선택 → city 칩 업데이트 + detail 칩 자동 생성 */
  const handleLocationCitySelect = useCallback((cityValue: string, cityLabel: string) => {
    const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
    if (!tabChip) return
    const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
    const tabIndex = Number(tabChip.value)
    const tab = tabs[tabIndex]
    if (!tab) return

    // city 칩 업데이트
    const cityOption = tab.cascadingOptions.find((o) => o.value === cityValue)
    const hasChildren = cityOption?.children && cityOption.children.length > 0
    const detailLabel = tab.cascadingLabels[1] ?? '세부'

    const nextChips = chips.map((c) => {
      if (isAdvancedChip(c)) return c
      if (c.attribute === LOCATION_CITY_KEY) {
        return { ...c, value: cityValue, displayLabel: cityLabel }
      }
      return c
    }).filter((c) => !isAdvancedChip(c) ? c.attribute !== LOCATION_DETAIL_KEY : true)

    // detail 칩 자동 생성 (하위 옵션이 있을 때만)
    if (hasChildren) {
      nextChips.push({
        id: generateChipId(),
        attribute: LOCATION_DETAIL_KEY,
        operator: 'eq',
        value: CASCADING_ALL,
        displayLabel: '전체',
        filterKey: tab.fieldKey,
      })
    }

    onChipsChange(nextChips)
    setEditingChipId(null)
  }, [conditionChips, attributes, chips, onChipsChange])

  /** location: detail(구/생활권) 선택 */
  const handleLocationDetailSelect = useCallback((detailValue: string, detailLabel: string) => {
    const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
    if (!tabChip) return
    const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
    const tab = tabs[Number(tabChip.value)]
    if (!tab) return

    onChipsChange(chips.map((c) => {
      if (isAdvancedChip(c)) return c
      if (c.attribute === LOCATION_DETAIL_KEY) {
        return { ...c, value: detailValue, displayLabel: detailLabel, filterKey: tab.fieldKey }
      }
      return c
    }))
    setEditingChipId(null)
  }, [conditionChips, attributes, chips, onChipsChange])

  /** cascading-select 값 선택 → 선택된 칩 + 나머지 레벨 "전체" 칩 일괄 생성 */
  const handleCascadingSelect = useCallback((opt: CascadingOption) => {
    if (!cascadingState) return
    const { attribute: attr, level } = cascadingState
    const totalLevels = attr.cascadingLabels?.length ?? 1
    const baseKey = attr.key

    // 기존 cascading 칩 제거 (현재 레벨 이상)
    const kept = chips.filter((c) => {
      if (isAdvancedChip(c)) return true
      if (!isCascadingKey(c.attribute)) return true
      if (getCascadingBaseKey(c.attribute) !== baseKey) return true
      return getCascadingLevel(c.attribute) < level
    })

    // 현재 레벨: 선택된 값
    const fieldKeys = attr.cascadingFieldKeys
    const newChips: ConditionChip[] = [{
      id: generateChipId(),
      attribute: cascadingKey(baseKey, level),
      operator: 'eq',
      value: opt.value,
      displayLabel: opt.label,
      filterKey: fieldKeys?.[level],
    }]

    // 나머지 하위 레벨: "전체" 플레이스홀더
    for (let l = level + 1; l < totalLevels; l++) {
      newChips.push({
        id: generateChipId(),
        attribute: cascadingKey(baseKey, l),
        operator: 'eq',
        value: CASCADING_ALL,
        displayLabel: '전체',
        filterKey: fieldKeys?.[l],
      })
    }

    onChipsChange([...kept, ...newChips])
    setCascadingState(null)
    setIsAddOpen(false)
  }, [cascadingState, chips, onChipsChange])

  const handleRemoveChip = useCallback((chipId: string) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip) {
      onChipsChange(chips.filter((c) => c.id !== chipId))
      setEditingChipId(null)
      setCascadingState(null)
      return
    }

    // location 칩 그룹 삭제
    if (isLocationChipKey(chip.attribute)) {
      if (chip.attribute === LOCATION_TAB_KEY) {
        // tab 삭제 → 전체 location 칩 그룹 제거
        onChipsChange(chips.filter((c) => isAdvancedChip(c) || !isLocationChipKey(c.attribute)))
      } else if (chip.attribute === LOCATION_CITY_KEY) {
        // city 삭제 → 전체 location 칩 그룹 제거
        onChipsChange(chips.filter((c) => isAdvancedChip(c) || !isLocationChipKey(c.attribute)))
      } else if (chip.attribute === LOCATION_DETAIL_KEY) {
        // detail 삭제 → "전체"로 리셋
        onChipsChange(chips.map((c) => {
          if (isAdvancedChip(c)) return c
          if (c.attribute === LOCATION_DETAIL_KEY) return { ...c, value: CASCADING_ALL, displayLabel: '전체' }
          return c
        }))
      }
    } else if (isCascadingKey(chip.attribute)) {
      const baseKey = getCascadingBaseKey(chip.attribute)
      const level = getCascadingLevel(chip.attribute)
      // 레벨 0(최상위) 삭제 → 전체 cascading 그룹 제거
      if (level === 0) {
        onChipsChange(chips.filter((c) => {
          if (isAdvancedChip(c)) return true
          if (!isCascadingKey(c.attribute)) return true
          return getCascadingBaseKey(c.attribute) !== baseKey
        }))
      } else {
        // 하위 칩 삭제 → 해당 칩 + 더 깊은 레벨을 "전체"로 전환
        onChipsChange(chips.map((c) => {
          if (isAdvancedChip(c)) return c
          if (!isCascadingKey(c.attribute)) return c
          if (getCascadingBaseKey(c.attribute) !== baseKey) return c
          if (getCascadingLevel(c.attribute) >= level) {
            return { ...c, value: CASCADING_ALL, displayLabel: '전체' }
          }
          return c
        }))
      }
    } else if (childrenCascadeAttrs.some((ca) => chip.attribute === childrenCascadeTypeKey(ca.key))) {
      // children-cascade type 칩 삭제 → 해당 cascade 그룹 전체 제거
      const baseKey = chip.attribute.slice(0, -5) // remove '_type'
      onChipsChange(chips.filter((c) => !isAdvancedChip(c) ? !isChildrenCascadeChipKey(c.attribute, baseKey) : true))
    } else {
      onChipsChange(chips.filter((c) => c.id !== chipId))
    }
    setEditingChipId(null)
    setCascadingState(null)
  }, [chips, conditionChips, onChipsChange, childrenCascadeAttrs])

  /** 칩 값 변경 (일반 select) */
  const handleChangeChipValue = useCallback((chipId: string, newValue: string) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip) return
    const attr = attributes.find((a) => a.key === chip.attribute)
    // top-level 또는 children에서 option 탐색
    let option = attr?.options?.find((o) => o.value === newValue)
    if (!option) {
      for (const parent of attr?.options ?? []) {
        const child = parent.children?.find((c) => c.value === newValue)
        if (child) { option = child; break }
      }
    }
    onChipsChange(chips.map((c) =>
      c.id === chipId
        ? { ...c, value: newValue, displayLabel: option?.label ?? newValue }
        : c,
    ))
    setEditingChipId(null)
  }, [chips, conditionChips, attributes, onChipsChange])

  /** cascading 칩 값 변경 → 현재 칩 업데이트 + 하위 레벨 "전체"로 리셋 */
  const handleChangeCascadingChipValue = useCallback((chipId: string, opt: CascadingOption) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip || !isCascadingKey(chip.attribute)) return
    const baseKey = getCascadingBaseKey(chip.attribute)
    const level = getCascadingLevel(chip.attribute)
    const attr = attributes.find((a) => a.key === baseKey)
    if (!attr) return
    const totalLevels = attr.cascadingLabels?.length ?? 1

    // "전체" 선택 시
    if (opt.value === CASCADING_ALL) {
      // 현재 칩을 전체로 + 하위 레벨도 전체로 리셋
      const nextChips = chips.map((c) => {
        if (isAdvancedChip(c)) return c
        if (!isCascadingKey(c.attribute)) return c
        if (getCascadingBaseKey(c.attribute) !== baseKey) return c
        const cl = getCascadingLevel(c.attribute)
        if (cl >= level) return { ...c, value: CASCADING_ALL, displayLabel: '전체' }
        return c
      })
      onChipsChange(nextChips)
      setEditingChipId(null)
      return
    }

    // 현재 칩 값 변경 + 하위 레벨 "전체"로 리셋
    const nextChips = chips.map((c) => {
      if (isAdvancedChip(c)) return c
      if (!isCascadingKey(c.attribute)) return c
      if (getCascadingBaseKey(c.attribute) !== baseKey) return c
      const cl = getCascadingLevel(c.attribute)
      if (c.id === chipId) return { ...c, value: opt.value, displayLabel: opt.label }
      if (cl > level) return { ...c, value: CASCADING_ALL, displayLabel: '전체' }
      return c
    })
    onChipsChange(nextChips)
    setEditingChipId(null)
  }, [chips, conditionChips, attributes, onChipsChange])

  const closeAll = useCallback(() => {
    setIsAddOpen(false)
    setSelectedAttribute(null)
    setEditingChipId(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)

  }, [])

  /** 칩 클릭 → 토글 or 편집 팝오버 */
  const handleChipClick = useCallback((chip: ConditionChip) => {
    if (editingChipId === chip.id) {
      // 토글 해제 → 모든 팝오버 닫기
      closeAll()
      return
    }
    // 새 칩 편집 시작: 이전 상태 초기화
    setEditingChipId(chip.id)
    setIsAddOpen(false)
    setSelectedAttribute(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)

    // multi-select 칩이면 바로 multiSelectState 활성화
    const msAttr = attributes.find((a) => a.key === chip.attribute && a.type === 'multi-select')
    if (msAttr) {
      const currentValues = new Set(String(chip.value).split(',').map((v) => v.trim()))
      multiSelectChipIdRef.current = chip.id
      setMultiSelectState({ attribute: msAttr, selected: currentValues })
      return
    }
    // location 칩 그룹은 editingChipId만 설정 (팝오버는 렌더에서 처리)
    // 기존 단일 location 칩도 동일하게 처리
  }, [editingChipId, attributes, closeAll])

  const handleAddClick = useCallback(() => {
    setEditingChipId(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)
    setIsAddOpen((prev) => {
      if (prev) setSelectedAttribute(null)
      return !prev
    })
  }, [])

  const handleAdvancedClick = useCallback(() => {
    closeAll()
    onAdvancedOpen?.()
  }, [closeAll, onAdvancedOpen])

  return (
    <div className="flex items-center px-4 py-2" style={{ backgroundColor: 'var(--bg)' }}>
      <FilterChipGroup className="min-w-0 flex-1">
        {/* 조건 칩들 — status 포함 모든 속성 동등, cascading은 레벨별 라벨, location 칩 그룹은 전용 렌더 */}
        {conditionChips.filter((c) => !c.hidden).map((chip) => {
          const attrLabel = getChipAttrLabel(chip)
          const isAllPlaceholder = chip.value === CASCADING_ALL
          const isLocChild = chip.attribute === LOCATION_DETAIL_KEY
          const isCascadeGrade = isGradeSubChipKey(chip.attribute)
          const isChildChip = isLocChild || isCascadeGrade
          const isLocTab = chip.attribute === LOCATION_TAB_KEY
          return (
            <button
              key={chip.id}
              ref={(el) => { if (el) chipRefs.current.set(chip.id, el); else chipRefs.current.delete(chip.id) }}
              type="button"
              className={`filter-chip ${isAllPlaceholder ? '' : 'active'} ${wineClass}`}
              style={isAllPlaceholder ? { opacity: 0.6, borderStyle: 'dashed' } : undefined}
              onClick={() => handleChipClick(chip)}
            >
              <span style={{ opacity: 0.7, fontSize: '11px' }}>{attrLabel}</span>
              {isChildChip ? (
                <span className="flex items-center gap-0.5">
                  {chip.displayLabel}
                  <ChevronDown size={14} />
                </span>
              ) : (
                chip.displayLabel
              )}
              {/* child 칩(location detail, prestige grade) → X 없음 (드롭다운으로 변경) */}
              {!isChildChip && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleRemoveChip(chip.id) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleRemoveChip(chip.id) } }}
                  style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}
                >
                  <X size={10} style={{ opacity: 0.6 }} />
                </span>
              )}
            </button>
          )
        })}

        {/* Advanced 칩 */}
        {advancedChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`filter-chip active ${wineClass}`}
            onClick={() => handleRemoveChip(chip.id)}
          >
            <SlidersHorizontal size={10} style={{ opacity: 0.7 }} />
            {chip.displayLabel}
            <X size={10} style={{ opacity: 0.6 }} />
          </button>
        ))}

        {/* 소셜 필터 칩 — 팔로잉/버블 보기 필터 활성 시 자동 생성 */}
        {(() => {
          const viewChip = conditionChips.find((c) => c.attribute === 'view')
          const viewValues = viewChip ? String(viewChip.value).split(',') : []
          const hasFollowing = viewValues.includes('following') && socialFollowingUsers && socialFollowingUsers.length > 0
          const hasBubble = viewValues.includes('bubble') && socialBubbles && socialBubbles.length > 0
          const followingLabel = socialFilter?.followingUserId
            ? socialFollowingUsers?.find((u) => u.id === socialFilter.followingUserId)?.label ?? '선택됨'
            : '전체'
          const bubbleLabel = socialFilter?.bubbleId
            ? socialBubbles?.find((b) => b.id === socialFilter.bubbleId)?.label ?? '선택됨'
            : '전체'
          return (
            <>
              {hasFollowing && (
                <button
                  ref={(el) => { if (el) socialChipRef.current = el }}
                  type="button"
                  className={`filter-chip ${socialFilter?.followingUserId ? 'active' : ''} ${wineClass}`}
                  style={!socialFilter?.followingUserId ? { opacity: 0.6, borderStyle: 'dashed' } : undefined}
                  onClick={() => setSocialChipOpen(socialChipOpen === 'following' ? null : 'following')}
                >
                  <span style={{ opacity: 0.7, fontSize: '11px' }}>팔로잉</span>
                  <span className="flex items-center gap-0.5">
                    {followingLabel}
                    <ChevronDown size={14} />
                  </span>
                </button>
              )}
              {hasBubble && (
                <button
                  ref={(el) => { if (el) socialChipRef.current = el }}
                  type="button"
                  className={`filter-chip ${socialFilter?.bubbleId ? 'active' : ''} ${wineClass}`}
                  style={!socialFilter?.bubbleId ? { opacity: 0.6, borderStyle: 'dashed' } : undefined}
                  onClick={() => setSocialChipOpen(socialChipOpen === 'bubble' ? null : 'bubble')}
                >
                  <span style={{ opacity: 0.7, fontSize: '11px' }}>버블</span>
                  <span className="flex items-center gap-0.5">
                    {bubbleLabel}
                    <ChevronDown size={14} />
                  </span>
                </button>
              )}
            </>
          )
        })()}

        {/* + 버튼 */}
        <button
          ref={addBtnRef}
          type="button"
          onClick={handleAddClick}
          className="filter-chip"
          style={{ padding: '6px 8px', color: isAddOpen ? accent : undefined }}
        >
          <Plus size={14} style={{ transition: 'transform .15s', transform: isAddOpen ? 'rotate(45deg)' : '' }} />
          <span className="text-[12px] font-medium">필터 추가</span>
        </button>
      </FilterChipGroup>

      {showPager && onRecordPagePrev && onRecordPageNext && (
        <InlinePager
          currentPage={recordPage ?? 1}
          totalPages={recordTotalPages ?? 1}
          onPrev={onRecordPagePrev}
          onNext={onRecordPageNext}
        />
      )}

      {/* ── 속성 선택 팝오버 (Portal) ── */}
      {isAddOpen && !selectedAttribute && !cascadingState && !multiSelectState && !locationState && (
        <Popover anchorRef={addBtnRef} align="right" onClose={closeAll}>
          <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
            속성 선택
          </div>
          {availableAttributes.map((attr) => (
            <button
              key={attr.key}
              type="button"
              onClick={() => {
                if (attr.type === 'cascading-select' && attr.cascadingOptions) {
                  setCascadingState({ attribute: attr, level: 0, currentOptions: attr.cascadingOptions })
                } else if (attr.type === 'location') {
                  setLocationState({ attribute: attr, tabIndex: 0, level: 0, city: null })
                } else if (attr.type === 'multi-select') {
                  // 편집 중인 칩이 있으면 기존 value 파싱
                  const existingChip = editingChipId
                    ? conditionChips.find((c) => c.id === editingChipId && c.attribute === attr.key)
                    : null
                  const initialSelected = existingChip
                    ? new Set(String(existingChip.value).split(',').map((v) => v.trim()))
                    : new Set<string>()
                  setMultiSelectState({ attribute: attr, selected: initialSelected })
                } else {
                  setSelectedAttribute(attr)
                }
              }}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {attr.label}
            </button>
          ))}
          {availableAttributes.length === 0 && (
            <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-hint)' }}>
              추가 가능한 속성이 없습니다
            </div>
          )}
          {onAdvancedOpen && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <button
                type="button"
                onClick={handleAdvancedClick}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px] font-medium"
                style={{ color: accent }}
              >
                <SlidersHorizontal size={13} />
                + Advanced Filter
              </button>
            </>
          )}
        </Popover>
      )}

      {/* ── 값 선택 팝오버 (일반 select) ── */}
      {isAddOpen && selectedAttribute && selectedAttribute.type !== 'multi-select' && !cascadingState && (
        <Popover anchorRef={addBtnRef} align="right" onClose={closeAll}>
          <button
            type="button"
            onClick={() => setSelectedAttribute(null)}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
            style={{ color: 'var(--text-hint)' }}
          >
            ← {selectedAttribute.label}
          </button>
          {(selectedAttribute.options?.some((o) => o.children && o.children.length > 0)
            ? selectedAttribute.options?.filter((o) => !(usedCascadeTypes.get(selectedAttribute.key) ?? []).includes(o.value))
            : selectedAttribute.options
          )?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleAddCondition(selectedAttribute, opt.value)}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {opt.label}
            </button>
          ))}
        </Popover>
      )}

      {/* ── multi-select 체크박스 팝오버 (실시간 적용) ── */}
      {multiSelectState && (
        <Popover anchorRef={editingChipId ? { current: chipRefs.current.get(editingChipId) ?? null } : addBtnRef} align="right" onClose={() => {
          setMultiSelectState(null)
          setIsAddOpen(false)
          setSocialChipOpen(null)
          multiSelectChipIdRef.current = null
        }}>
          <button
            type="button"
            onClick={() => { setMultiSelectState(null); setSelectedAttribute(null); setSocialChipOpen(null); multiSelectChipIdRef.current = null }}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
            style={{ color: 'var(--text-hint)' }}
          >
            ← {multiSelectState.attribute.label}
          </button>
          {multiSelectState.attribute.options?.map((opt, idx, arr) => {
            const isChecked = multiSelectState.selected.has(opt.value)
            const prevGroup = idx > 0 ? arr[idx - 1].group : undefined
            const showGroupDivider = opt.group !== undefined && opt.group !== prevGroup
            return (
              <div key={opt.value}>
                {showGroupDivider && (
                  <div
                    className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      color: 'var(--text-hint)',
                      borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                      marginTop: idx > 0 ? 4 : undefined,
                      paddingTop: idx > 0 ? 6 : undefined,
                    }}
                  >
                    {opt.group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(multiSelectState.selected)
                    if (isChecked) {
                      next.delete(opt.value)
                      // 해제 시 소셜 필터도 초기화
                      if (opt.value === 'following' && onSocialFilterChange && socialFilter) {
                        onSocialFilterChange({ ...socialFilter, followingUserId: null })
                      }
                      if (opt.value === 'bubble' && onSocialFilterChange && socialFilter) {
                        onSocialFilterChange({ ...socialFilter, bubbleId: null })
                      }
                    } else {
                      next.add(opt.value)
                    }
                    setMultiSelectState({ ...multiSelectState, selected: next })
                    applyMultiSelectImmediate(multiSelectState.attribute, next)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  <span>{opt.label}</span>
                  {isChecked && <Check size={14} style={{ color: accent }} />}
                </button>
              </div>
            )
          })}
        </Popover>
      )}

      {/* ── 소셜 필터 팝오버 ── */}
      {socialChipOpen && (
        <Popover anchorRef={socialChipRef} align="left" onClose={() => setSocialChipOpen(null)}>
          {(() => {
            const isFollowing = socialChipOpen === 'following'
            const items = isFollowing ? socialFollowingUsers : socialBubbles
            const currentId = isFollowing ? socialFilter?.followingUserId : socialFilter?.bubbleId
            if (!items) return null
            return (
              <>
                <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                  {isFollowing ? '팔로잉 선택' : '버블 선택'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!onSocialFilterChange || !socialFilter) return
                    if (isFollowing) onSocialFilterChange({ ...socialFilter, followingUserId: null })
                    else onSocialFilterChange({ ...socialFilter, bubbleId: null })
                    setSocialChipOpen(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-[13px]"
                  style={{ color: 'var(--text)' }}
                >
                  <span>전체</span>
                  {!currentId && <Check size={14} style={{ color: accent }} />}
                </button>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!onSocialFilterChange || !socialFilter) return
                      if (isFollowing) onSocialFilterChange({ ...socialFilter, followingUserId: currentId === item.id ? null : item.id })
                      else onSocialFilterChange({ ...socialFilter, bubbleId: currentId === item.id ? null : item.id })
                      setSocialChipOpen(null)
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-[13px]"
                    style={{ color: 'var(--text)' }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {(item.iconName || item.iconBgColor) ? (
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                          style={{ backgroundColor: item.iconBgColor ?? 'var(--bg-elevated)' }}
                        >
                          <BubbleIcon icon={item.iconName ?? null} size={12} />
                        </span>
                      ) : item.iconUrl ? (
                        <Image src={item.iconUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                      ) : null}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {currentId === item.id && <Check size={14} style={{ color: accent }} />}
                  </button>
                ))}
              </>
            )
          })()}
        </Popover>
      )}

      {/* ── location 초기 선택 팝오버: 내 위치 + 탭(행정구역/생활권) 내 도시 선택 ── */}
      {locationState && (() => {
        const { attribute: locAttr } = locationState
        const tabs: LocationTab[] = locAttr.locationTabs ?? []
        const currentTab = tabs[locTabIdx]
        return (
          <Popover anchorRef={addBtnRef} align="right" onClose={closeAll}>
            <button
              type="button"
              onClick={() => { setLocationState(null); setSelectedAttribute(null) }}
              className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
              style={{ color: 'var(--text-hint)' }}
            >
              ← {locAttr.label}
            </button>
            {/* 내 위치 버튼 */}
            <button
              type="button"
              onClick={handleLocationNearby}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium transition-colors"
              style={{ color: accent }}
            >
              <MapPin size={14} />
              내 위치 (반경 1km)
            </button>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            {/* 탭 전환 (행정구역/생활권) */}
            <div className="flex gap-1 px-3 pb-1">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.fieldKey}
                  type="button"
                  onClick={() => setLocTabIdx(idx)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: idx === locTabIdx ? accent : 'transparent',
                    color: idx === locTabIdx ? 'var(--bg)' : 'var(--text-hint)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 도시 목록 */}
            {currentTab?.cascadingOptions.map((city) => (
              <button
                key={city.value}
                type="button"
                onClick={() => handleLocationCityDirectSelect(locTabIdx, city.value, city.label)}
                className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                {city.label}
              </button>
            ))}
          </Popover>
        )
      })()}

      {/* ── cascading-select 초기 선택 팝오버 (레벨 0) ── */}
      {isAddOpen && cascadingState && (
        <Popover anchorRef={addBtnRef} align="right" onClose={closeAll}>
          <button
            type="button"
            onClick={() => setCascadingState(null)}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
            style={{ color: 'var(--text-hint)' }}
          >
            ← {cascadingState.attribute.cascadingLabels?.[0] ?? cascadingState.attribute.label}
          </button>
          {cascadingState.currentOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleCascadingSelect(opt)}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
              style={{ color: 'var(--text)' }}
            >
              {opt.label}
            </button>
          ))}
        </Popover>
      )}

      {/* ── 칩 값 변경 팝오버 (Portal) ── */}
      {editingChipId && (() => {
        const chip = conditionChips.find((c) => c.id === editingChipId)
        if (!chip) return null
        const chipBtnRef = { current: chipRefs.current.get(editingChipId) ?? null }

        // cascading 칩 편집
        if (isCascadingKey(chip.attribute)) {
          const baseKey = getCascadingBaseKey(chip.attribute)
          const level = getCascadingLevel(chip.attribute)
          const attr = attributes.find((a) => a.key === baseKey)
          if (!attr) return null

          // 상위 레벨이 "전체"이면 선택 불가 → 안내 메시지
          const parentIsAll = level > 0 && conditionChips.some((c) =>
            isCascadingKey(c.attribute)
            && getCascadingBaseKey(c.attribute) === baseKey
            && getCascadingLevel(c.attribute) < level
            && c.value === CASCADING_ALL,
          )

          const options = parentIsAll ? null : findCascadingOptionsAtLevel(attr, level, conditionChips)
          const levelLabel = attr.cascadingLabels?.[level] ?? attr.label
          const allOption: CascadingOption = { value: CASCADING_ALL, label: '전체' }

          return (
            <Popover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                {levelLabel}
              </div>
              {parentIsAll ? (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-hint)' }}>
                  상위 항목을 먼저 선택하세요
                </div>
              ) : (
                <>
                  {/* 전체 옵션 */}
                  <button
                    type="button"
                    onClick={() => handleChangeCascadingChipValue(editingChipId, allOption)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    전체
                    {chip.value === CASCADING_ALL && <Check size={14} style={{ color: accent }} />}
                  </button>
                  <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
                  {options?.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChangeCascadingChipValue(editingChipId, opt)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                      style={{ color: 'var(--text)' }}
                    >
                      {opt.label}
                      {String(chip.value) === opt.value && <Check size={14} style={{ color: accent }} />}
                    </button>
                  ))}
                </>
              )}
            </Popover>
          )
        }

        // multi-select 칩은 onClick에서 직접 팝오버 상태를 설정하므로 여기서는 스킵
        if (attributes.find((a) => a.key === chip.attribute && a.type === 'multi-select')) {
          return null
        }
        // location tab 칩 클릭 → 편집 불가 (X 삭제만 가능)
        if (chip.attribute === LOCATION_TAB_KEY) {
          return null
        }
        // 기존 단일 location 칩 (nearby 등)
        if (chip.attribute === 'location') {
          return null
        }
        // location city 칩 클릭 → 도시 선택 드롭다운
        if (chip.attribute === LOCATION_CITY_KEY) {
          const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
          const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
          const tab = tabChip ? tabs[Number(tabChip.value)] : undefined
          if (!tab) return null
          const cityLabel = tab.cascadingLabels[0] ?? '도시'
          return (
            <Popover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                {cityLabel}
              </div>
              {tab.cascadingOptions.map((cityOpt) => (
                <button
                  key={cityOpt.value}
                  type="button"
                  onClick={() => { handleLocationCitySelect(cityOpt.value, cityOpt.label); setEditingChipId(null) }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  {cityOpt.label}
                  {String(chip.value) === cityOpt.value && <Check size={14} style={{ color: accent }} />}
                </button>
              ))}
            </Popover>
          )
        }
        // location detail 칩 클릭 → 구/생활권 선택 드롭다운
        if (chip.attribute === LOCATION_DETAIL_KEY) {
          const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
          const cityChip = conditionChips.find((c) => c.attribute === LOCATION_CITY_KEY)
          const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
          const tab = tabChip ? tabs[Number(tabChip.value)] : undefined
          if (!tab || !cityChip || cityChip.value === CASCADING_ALL) return null
          const cityOption = tab.cascadingOptions.find((o) => o.value === String(cityChip.value))
          const detailOptions = cityOption?.children ?? []
          const detailLabel = tab.cascadingLabels[1] ?? '세부'
          return (
            <Popover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                {detailLabel}
              </div>
              {/* 전체 옵션 */}
              <button
                type="button"
                onClick={() => {
                  handleLocationDetailSelect(CASCADING_ALL, '전체')
                  setEditingChipId(null)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                전체
                {chip.value === CASCADING_ALL && <Check size={14} style={{ color: accent }} />}
              </button>
              <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
              {detailOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { handleLocationDetailSelect(opt.value, opt.label); setEditingChipId(null) }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  {opt.label}
                  {String(chip.value) === opt.value && <Check size={14} style={{ color: accent }} />}
                </button>
              ))}
            </Popover>
          )
        }

        // grade sub-chip 편집 (multi-select children에서 자동 생성된 칩)
        const gradeMatch = chip.attribute.match(/^(.+)_grade:(.+)$/)
        if (gradeMatch) {
          const parentKey = gradeMatch[1]
          const typeValue = gradeMatch[2]
          const parentAttr = attributes.find((a) => a.key === parentKey)
          const parentOpt = parentAttr?.options?.find((o) => o.value === typeValue)
          if (!parentOpt?.children) return null
          return (
            <Popover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                {parentOpt.label}
              </div>
              <button
                type="button"
                onClick={() => {
                  onChipsChange(chips.map((c) =>
                    c.id === editingChipId ? { ...c, value: CASCADING_ALL, displayLabel: '전체' } : c,
                  ))
                  setEditingChipId(null)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                style={{ color: accent }}
              >
                전체
                {String(chip.value) === CASCADING_ALL && <Check size={14} style={{ color: accent }} />}
              </button>
              <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
              {parentOpt.children.map((child) => (
                <button
                  key={child.value}
                  type="button"
                  onClick={() => {
                    onChipsChange(chips.map((c) =>
                      c.id === editingChipId ? { ...c, value: child.value, displayLabel: child.label } : c,
                    ))
                    setEditingChipId(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  {child.label}
                  {String(chip.value) === child.value && <Check size={14} style={{ color: accent }} />}
                </button>
              ))}
            </Popover>
          )
        }

        // 일반 select 칩 편집
        const attr = attributes.find((a) => a.key === chip.attribute)
        if (!attr?.options) return null
        return (
          <Popover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
            <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
              {attr.label}
            </div>
            {attr.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChangeChipValue(editingChipId, opt.value)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                {opt.label}
                {String(chip.value) === opt.value && <Check size={14} style={{ color: accent }} />}
              </button>
            ))}
          </Popover>
        )
      })()}
    </div>
  )
}
