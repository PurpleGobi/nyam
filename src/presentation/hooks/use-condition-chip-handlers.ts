'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import type { FilterAttribute, CascadingOption } from '@/domain/entities/filter-config'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import {
  isAdvancedChip,
  generateChipId,
  cascadingKey,
  isCascadingKey,
  getCascadingBaseKey,
  getCascadingLevel,
  CASCADING_ALL,
  LOCATION_TAB_KEY,
  LOCATION_CITY_KEY,
  LOCATION_DETAIL_KEY,
  isLocationChipKey,
  childrenCascadeTypeKey,
  childrenCascadeGradeKey,
  isChildrenCascadeChipKey,
} from '@/domain/entities/condition-chip'
import type { SocialFilterState } from '@/presentation/components/home/condition-filter-bar'

export interface CascadingStateValue {
  attribute: FilterAttribute
  level: number
  currentOptions: CascadingOption[]
}

export interface MultiSelectStateValue {
  attribute: FilterAttribute
  selected: Set<string>
}

export interface LocationStateValue {
  attribute: FilterAttribute
  tabIndex: number
  level: number
  city: string | null
}

export function useConditionChipHandlers({
  chips,
  onChipsChange,
  attributes,
  socialFilter,
  onSocialFilterChange,
}: {
  chips: FilterChipItem[]
  onChipsChange: (chips: FilterChipItem[]) => void
  attributes: FilterAttribute[]
  socialFilter?: SocialFilterState
  onSocialFilterChange?: (filter: SocialFilterState) => void
}) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<FilterAttribute | null>(null)
  const [editingChipId, _setEditingChipId] = useState<string | null>(null)
  const replacingChipIdRef = useRef<string | null>(null)
  /** editingChipId 설정 시 replacingChipIdRef도 함께 초기화 */
  const setEditingChipId = useCallback((id: string | null) => {
    _setEditingChipId(id)
    if (id === null) replacingChipIdRef.current = null
  }, [])
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const [cascadingState, setCascadingState] = useState<CascadingStateValue | null>(null)
  const [multiSelectState, setMultiSelectState] = useState<MultiSelectStateValue | null>(null)
  const [locationState, setLocationState] = useState<LocationStateValue | null>(null)
  const [socialChipOpen, setSocialChipOpen] = useState<'following' | 'bubble' | null>(null)
  const socialChipRef = useRef<HTMLButtonElement>(null)
  const [locTabIdx, setLocTabIdx] = useState(0)

  const conditionChips = chips.filter((c) => !isAdvancedChip(c)) as ConditionChip[]
  const advancedChips = chips.filter(isAdvancedChip)

  // children-cascade 속성 목록
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

  // 이미 추가된 속성 키
  const usedBaseKeys = new Set(conditionChips.map((c) => {
    if (isLocationChipKey(c.attribute)) return 'location'
    for (const attr of childrenCascadeAttrs) {
      if (isChildrenCascadeChipKey(c.attribute, attr.key)) return `__cascade_${attr.key}__`
    }
    return isCascadingKey(c.attribute) ? getCascadingBaseKey(c.attribute) : c.attribute
  }))
  for (const attr of childrenCascadeAttrs) {
    if (usedBaseKeys.has(attr.key)) {
      usedBaseKeys.delete(attr.key)
      usedBaseKeys.add(`__cascade_${attr.key}__`)
    }
  }
  const availableAttributes = attributes.filter((a) => {
    if (a.type === 'multi-select') return true
    if (usedBaseKeys.has(a.key)) return false
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

  /** 칩 attribute label 해석 */
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
    for (const ca of childrenCascadeAttrs) {
      if (chip.attribute === childrenCascadeTypeKey(ca.key)) return ca.label
    }
    const gradeInfo = parseGradeSubChipKeyLocal(chip.attribute)
    if (gradeInfo) {
      const parentAttr = attributes.find((a) => a.key === gradeInfo.baseKey)
      const typeOpt = parentAttr?.options?.find((o) => o.value === gradeInfo.typeValue)
      return typeOpt?.label ?? gradeInfo.typeValue
    }
    return attributes.find((a) => a.key === chip.attribute)?.label ?? chip.attribute
  }, [attributes, conditionChips, childrenCascadeAttrs])

  /** 교체 대상 칩을 제거한 chips 배열 반환 (칩 교체 시 사용) */
  const chipsWithoutReplacing = (base: FilterChipItem[]) => {
    const rid = replacingChipIdRef.current
    return rid ? base.filter((c) => c.id !== rid) : base
  }

  /* ── handlers ── */
  const handleAddCondition = useCallback((attr: FilterAttribute, value: string) => {
    const isCascadeAttr = childrenCascadeAttrs.some((ca) => ca.key === attr.key)
    const selectedOpt = attr.options?.find((o) => o.value === value)
    const hasChildren = selectedOpt?.children && selectedOpt.children.length > 0

    const base = chipsWithoutReplacing(chips)

    if (isCascadeAttr) {
      const typeKey = childrenCascadeTypeKey(attr.key)
      const existingTypeChip = base.find((c) => !isAdvancedChip(c) && c.attribute === typeKey) as ConditionChip | undefined

      let next: FilterChipItem[]
      if (existingTypeChip) {
        const newValue = `${existingTypeChip.value},${value}`
        const newLabel = newValue.split(',').map((v) => attr.options?.find((o) => o.value === v.trim())?.label ?? v).join(', ')
        next = base.map((c) =>
          c.id === existingTypeChip.id ? { ...c, value: newValue, displayLabel: newLabel } : c,
        )
      } else {
        const typeChip: ConditionChip = {
          id: generateChipId(),
          attribute: typeKey,
          operator: 'eq',
          value,
          displayLabel: selectedOpt?.label ?? value,
        }
        next = [...base, typeChip]
      }

      if (hasChildren) {
        const gradeChip: ConditionChip = {
          id: generateChipId(),
          attribute: childrenCascadeGradeKey(attr.key, value),
          operator: 'eq',
          value: CASCADING_ALL,
          displayLabel: '전체',
        }
        next.push(gradeChip)
      }
      onChipsChange(next)

      const usedAfter = [...(usedCascadeTypes.get(attr.key) ?? []), value]
      const remaining = attr.options?.filter((o) => !usedAfter.includes(o.value)) ?? []
      if (remaining.length === 0) {
        setSelectedAttribute(null)
        setIsAddOpen(false)
      }
      setEditingChipId(null)
      setCascadingState(null)
      return
    }

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
    onChipsChange([...base, newChip])
    setSelectedAttribute(null)
    setEditingChipId(null)
    setIsAddOpen(false)
    setCascadingState(null)
  }, [chips, onChipsChange, usedCascadeTypes, childrenCascadeAttrs, setEditingChipId])

  /** multi-select에서 editingChipId를 추적하는 ref */
  const multiSelectChipIdRef = useRef<string | null>(null)

  /** multi-select 실시간 적용 */
  const applyMultiSelectImmediate = useCallback((attr: FilterAttribute, selected: Set<string>) => {
    const base = chipsWithoutReplacing(chips)

    if (selected.size === 0) {
      if (multiSelectChipIdRef.current) {
        onChipsChange(base.filter((c) => c.id !== multiSelectChipIdRef.current))
        multiSelectChipIdRef.current = null
      } else if (editingChipId) {
        onChipsChange(base)
      }
      setEditingChipId(null)
      return
    }
    const selectedValues = Array.from(selected)
    const combinedValue = selectedValues.join(',')
    const combinedLabel = selectedValues
      .map((v) => attr.options?.find((o) => o.value === v)?.label ?? v)
      .join(', ')

    if (multiSelectChipIdRef.current) {
      onChipsChange(base.map((c) =>
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
      onChipsChange([...base, newChip])
    }
  }, [chips, onChipsChange, editingChipId, setEditingChipId])

  /** location 탭+도시 선택 → 도시 칩 바로 생성 */
  const handleLocationCityDirectSelect = useCallback((tabIndex: number, cityValue: string, cityLabel: string) => {
    if (!locationState) return
    const tabs = locationState.attribute.locationTabs ?? []
    const tab = tabs[tabIndex]
    if (!tab) return

    const cityOption = tab.cascadingOptions.find((o) => o.value === cityValue)
    const hasChildren = cityOption?.children && cityOption.children.length > 0

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

    const base = chipsWithoutReplacing(chips)
    onChipsChange([...base.filter((c) => !isAdvancedChip(c) ? !isLocationChipKey(c.attribute) : true), ...newChips])
    setLocationState(null)
    setEditingChipId(null)
    setIsAddOpen(false)
  }, [locationState, chips, onChipsChange, setEditingChipId])

  /** location: 내 위치 선택 */
  const handleLocationNearby = useCallback(() => {
    const newChip: ConditionChip = {
      id: generateChipId(),
      attribute: 'location',
      operator: 'eq',
      value: 'nearby',
      displayLabel: '내 주변',
    }
    const base = chipsWithoutReplacing(chips)
    onChipsChange([...base.filter((c) => !isAdvancedChip(c) ? !isLocationChipKey(c.attribute) && c.attribute !== 'location' : true), newChip])
    setLocationState(null)
    setEditingChipId(null)
    setIsAddOpen(false)
  }, [chips, onChipsChange, setEditingChipId])

  /** location: 도시 선택 → city 칩 업데이트 + detail 칩 자동 생성 */
  const handleLocationCitySelect = useCallback((cityValue: string, cityLabel: string) => {
    const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
    if (!tabChip) return
    const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
    const tabIndex = Number(tabChip.value)
    const tab = tabs[tabIndex]
    if (!tab) return

    const cityOption = tab.cascadingOptions.find((o) => o.value === cityValue)
    const hasChildren = cityOption?.children && cityOption.children.length > 0

    const nextChips = chips.map((c) => {
      if (isAdvancedChip(c)) return c
      if (c.attribute === LOCATION_CITY_KEY) {
        return { ...c, value: cityValue, displayLabel: cityLabel }
      }
      return c
    }).filter((c) => !isAdvancedChip(c) ? c.attribute !== LOCATION_DETAIL_KEY : true)

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
  }, [conditionChips, attributes, chips, onChipsChange, setEditingChipId])

  /** location: detail 선택 */
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
  }, [conditionChips, attributes, chips, onChipsChange, setEditingChipId])

  /** cascading-select 값 선택 */
  const handleCascadingSelect = useCallback((opt: CascadingOption) => {
    if (!cascadingState) return
    const { attribute: attr, level } = cascadingState
    const totalLevels = attr.cascadingLabels?.length ?? 1
    const baseKey = attr.key

    const base = chipsWithoutReplacing(chips)
    const kept = base.filter((c) => {
      if (isAdvancedChip(c)) return true
      if (!isCascadingKey(c.attribute)) return true
      if (getCascadingBaseKey(c.attribute) !== baseKey) return true
      return getCascadingLevel(c.attribute) < level
    })

    const fieldKeys = attr.cascadingFieldKeys
    const newChips: ConditionChip[] = [{
      id: generateChipId(),
      attribute: cascadingKey(baseKey, level),
      operator: 'eq',
      value: opt.value,
      displayLabel: opt.label,
      filterKey: fieldKeys?.[level],
    }]

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
    setEditingChipId(null)
    setIsAddOpen(false)
  }, [cascadingState, chips, onChipsChange, setEditingChipId])

  const handleRemoveChip = useCallback((chipId: string) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip) {
      onChipsChange(chips.filter((c) => c.id !== chipId))
      setEditingChipId(null)
      setCascadingState(null)
      return
    }

    if (isLocationChipKey(chip.attribute)) {
      if (chip.attribute === LOCATION_TAB_KEY) {
        onChipsChange(chips.filter((c) => isAdvancedChip(c) || !isLocationChipKey(c.attribute)))
      } else if (chip.attribute === LOCATION_CITY_KEY) {
        onChipsChange(chips.filter((c) => isAdvancedChip(c) || !isLocationChipKey(c.attribute)))
      } else if (chip.attribute === LOCATION_DETAIL_KEY) {
        onChipsChange(chips.map((c) => {
          if (isAdvancedChip(c)) return c
          if (c.attribute === LOCATION_DETAIL_KEY) return { ...c, value: CASCADING_ALL, displayLabel: '전체' }
          return c
        }))
      }
    } else if (isCascadingKey(chip.attribute)) {
      const baseKey = getCascadingBaseKey(chip.attribute)
      const level = getCascadingLevel(chip.attribute)
      if (level === 0) {
        onChipsChange(chips.filter((c) => {
          if (isAdvancedChip(c)) return true
          if (!isCascadingKey(c.attribute)) return true
          return getCascadingBaseKey(c.attribute) !== baseKey
        }))
      } else {
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
      const baseKey = chip.attribute.slice(0, -5)
      onChipsChange(chips.filter((c) => !isAdvancedChip(c) ? !isChildrenCascadeChipKey(c.attribute, baseKey) : true))
    } else {
      onChipsChange(chips.filter((c) => c.id !== chipId))
    }
    setEditingChipId(null)
    setCascadingState(null)
  }, [chips, conditionChips, onChipsChange, childrenCascadeAttrs, setEditingChipId])

  /** 칩 값 변경 (일반 select) */
  const handleChangeChipValue = useCallback((chipId: string, newValue: string) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip) return
    const attr = attributes.find((a) => a.key === chip.attribute)
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
  }, [chips, conditionChips, attributes, onChipsChange, setEditingChipId])

  /** cascading 칩 값 변경 */
  const handleChangeCascadingChipValue = useCallback((chipId: string, opt: CascadingOption) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip || !isCascadingKey(chip.attribute)) return
    const baseKey = getCascadingBaseKey(chip.attribute)
    const level = getCascadingLevel(chip.attribute)
    const attr = attributes.find((a) => a.key === baseKey)
    if (!attr) return

    if (opt.value === CASCADING_ALL) {
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
  }, [chips, conditionChips, attributes, onChipsChange, setEditingChipId])

  const closeAll = useCallback(() => {
    setIsAddOpen(false)
    setSelectedAttribute(null)
    setEditingChipId(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)
  }, [setEditingChipId])

  /** 칩 클릭 → 토글 or 편집 팝오버 */
  const handleChipClick = useCallback((chip: ConditionChip) => {
    if (editingChipId === chip.id) {
      closeAll()
      return
    }
    setEditingChipId(chip.id)
    replacingChipIdRef.current = chip.id
    setIsAddOpen(false)
    setSelectedAttribute(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)

    const msAttr = attributes.find((a) => a.key === chip.attribute && a.type === 'multi-select')
    if (msAttr) {
      const currentValues = new Set(String(chip.value).split(',').map((v) => v.trim()))
      multiSelectChipIdRef.current = chip.id
      setMultiSelectState({ attribute: msAttr, selected: currentValues })
      return
    }
  }, [editingChipId, attributes, closeAll, setEditingChipId])

  /** 편집/하위 팝오버에서 상위 속성 목록으로 돌아가기 */
  const navigateToAttributeList = useCallback(() => {
    // replacingChipIdRef는 유지 — 다른 속성 선택 시 칩 교체용
    _setEditingChipId(null)  // replacingChipIdRef 초기화 방지
    setSelectedAttribute(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)
    setSocialChipOpen(null)
    multiSelectChipIdRef.current = null
    setIsAddOpen(true)
  }, [])

  const handleAddClick = useCallback(() => {
    setEditingChipId(null)
    setCascadingState(null)
    setMultiSelectState(null)
    setLocationState(null)
    setIsAddOpen((prev) => {
      if (prev) setSelectedAttribute(null)
      return !prev
    })
  }, [setEditingChipId])

  return {
    // state
    isAddOpen,
    selectedAttribute,
    editingChipId,
    replacingChipIdRef,
    chipRefs,
    cascadingState,
    multiSelectState,
    locationState,
    socialChipOpen,
    socialChipRef,
    locTabIdx,
    conditionChips,
    advancedChips,
    childrenCascadeAttrs,
    usedCascadeTypes,
    availableAttributes,
    multiSelectChipIdRef,
    // setters
    setIsAddOpen,
    setSelectedAttribute,
    setEditingChipId,
    setCascadingState,
    setMultiSelectState,
    setLocationState,
    setSocialChipOpen,
    setLocTabIdx,
    // handlers
    findCascadingOptionsAtLevel,
    getChipAttrLabel,
    handleAddCondition,
    applyMultiSelectImmediate,
    handleLocationCityDirectSelect,
    handleLocationNearby,
    handleLocationCitySelect,
    handleLocationDetailSelect,
    handleCascadingSelect,
    handleRemoveChip,
    handleChangeChipValue,
    handleChangeCascadingChipValue,
    closeAll,
    navigateToAttributeList,
    handleChipClick,
    handleAddClick,
  }
}

/** parseGradeSubChipKey inline — avoid circular import */
function parseGradeSubChipKeyLocal(key: string): { baseKey: string; typeValue: string } | null {
  const m = key.match(/^(.+)_grade:(.+)$/)
  if (!m) return null
  return { baseKey: m[1], typeValue: m[2] }
}
