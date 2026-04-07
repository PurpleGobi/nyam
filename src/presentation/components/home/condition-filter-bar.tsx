'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Plus, X, SlidersHorizontal, Check, MapPin } from 'lucide-react'
import type { FilterAttribute, CascadingOption, LocationTab } from '@/domain/entities/filter-config'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import { isAdvancedChip, generateChipId, cascadingKey, isCascadingKey, getCascadingBaseKey, getCascadingLevel, CASCADING_ALL } from '@/domain/entities/condition-chip'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
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
  onAdvancedOpen: () => void
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
  const [socialSubOpen, setSocialSubOpen] = useState<'following' | 'bubble' | null>(null)

  const accent = accentType === 'wine' ? 'var(--accent-wine)' : accentType === 'social' ? 'var(--accent-social)' : 'var(--accent-food)'
  const wineClass = accentType === 'wine' ? 'wine' : accentType === 'social' ? 'social' : ''

  // 모든 칩을 동등하게 취급
  const conditionChips = chips.filter((c) => !isAdvancedChip(c)) as ConditionChip[]
  const advancedChips = chips.filter(isAdvancedChip)

  // 이미 추가된 속성 키 (중복 방지) — cascading 칩은 base key로 그룹
  const usedBaseKeys = new Set(conditionChips.map((c) =>
    isCascadingKey(c.attribute) ? getCascadingBaseKey(c.attribute) : c.attribute,
  ))
  const availableAttributes = attributes.filter((a) => !usedBaseKeys.has(a.key))

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

  /** 칩 attribute label 해석 (cascading은 레벨별 라벨 사용) */
  const getChipAttrLabel = useCallback((chip: ConditionChip): string => {
    if (isCascadingKey(chip.attribute)) {
      const baseKey = getCascadingBaseKey(chip.attribute)
      const level = getCascadingLevel(chip.attribute)
      const attr = attributes.find((a) => a.key === baseKey)
      return attr?.cascadingLabels?.[level] ?? attr?.label ?? baseKey
    }
    return attributes.find((a) => a.key === chip.attribute)?.label ?? chip.attribute
  }, [attributes])

  /* ── handlers ── */
  const handleAddCondition = useCallback((attr: FilterAttribute, value: string) => {
    const option = attr.options?.find((o) => o.value === value)
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
  }, [chips, onChipsChange])

  /** multi-select에서 editingChipId를 추적하는 ref (실시간 적용에 필요) */
  const multiSelectChipIdRef = useRef<string | null>(null)

  /** multi-select 실시간 적용 — 체크 토글할 때마다 칩을 즉시 업데이트 */
  const applyMultiSelectImmediate = useCallback((attr: FilterAttribute, selected: Set<string>) => {
    if (selected.size === 0) {
      // 전부 해제 → 칩 제거
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
      // 기존 칩 업데이트
      onChipsChange(chips.map((c) =>
        c.id === multiSelectChipIdRef.current
          ? { ...c, value: combinedValue, displayLabel: combinedLabel }
          : c,
      ))
    } else {
      // 신규 칩 생성
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

  /** location 선택: 내 위치 또는 구/생활권 선택 → 칩 생성 */
  const handleLocationSelect = useCallback((value: string, displayLabel: string, filterKey?: string) => {
    if (!locationState) return
    const newChip: ConditionChip = {
      id: editingChipId ?? generateChipId(),
      attribute: 'location',
      operator: 'eq',
      value,
      displayLabel,
      filterKey,
    }
    if (editingChipId) {
      onChipsChange(chips.map((c) => c.id === editingChipId ? newChip : c))
      setEditingChipId(null)
    } else {
      onChipsChange([...chips, newChip])
    }
    setLocationState(null)
    setIsAddOpen(false)
  }, [locationState, editingChipId, chips, onChipsChange])

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
    if (chip && isCascadingKey(chip.attribute)) {
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
    } else {
      onChipsChange(chips.filter((c) => c.id !== chipId))
    }
    setEditingChipId(null)
    setCascadingState(null)
  }, [chips, conditionChips, onChipsChange])

  /** 칩 값 변경 (일반 select) */
  const handleChangeChipValue = useCallback((chipId: string, newValue: string) => {
    const chip = conditionChips.find((c) => c.id === chipId)
    if (!chip) return
    const attr = attributes.find((a) => a.key === chip.attribute)
    const option = attr?.options?.find((o) => o.value === newValue)
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
    // location 칩이면 바로 locationState 활성화
    if (chip.attribute === 'location') {
      const locAttr = attributes.find((a) => a.key === 'location' && a.type === 'location')
      if (locAttr) {
        setLocationState({ attribute: locAttr, tabIndex: 0, level: 0, city: null })
      }
    }
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
    onAdvancedOpen()
  }, [closeAll, onAdvancedOpen])

  return (
    <div className="flex items-center px-4 py-2" style={{ backgroundColor: 'var(--bg)' }}>
      <FilterChipGroup className="min-w-0 flex-1">
        {/* 조건 칩들 — status 포함 모든 속성 동등, cascading은 레벨별 라벨 */}
        {conditionChips.map((chip) => {
          const attrLabel = getChipAttrLabel(chip)
          const isAllPlaceholder = chip.value === CASCADING_ALL
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
              {chip.displayLabel}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleRemoveChip(chip.id) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleRemoveChip(chip.id) } }}
                style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}
              >
                <X size={10} style={{ opacity: 0.6 }} />
              </span>
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
          {selectedAttribute.options?.map((opt) => (
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
          setSocialSubOpen(null)
          multiSelectChipIdRef.current = null
        }}>
          <button
            type="button"
            onClick={() => { setMultiSelectState(null); setSelectedAttribute(null); setSocialSubOpen(null); multiSelectChipIdRef.current = null }}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
            style={{ color: 'var(--text-hint)' }}
          >
            ← {multiSelectState.attribute.label}
          </button>
          {multiSelectState.attribute.options?.map((opt, idx, arr) => {
            const isChecked = multiSelectState.selected.has(opt.value)
            const prevGroup = idx > 0 ? arr[idx - 1].group : undefined
            const showGroupDivider = opt.group !== undefined && opt.group !== prevGroup
            const hasSocialSub = (opt.value === 'following' && socialFollowingUsers && socialFollowingUsers.length > 0)
              || (opt.value === 'bubble' && socialBubbles && socialBubbles.length > 0)
            const isSocialSubOpen = socialSubOpen === opt.value && isChecked && hasSocialSub
            const socialItems = opt.value === 'following' ? socialFollowingUsers : opt.value === 'bubble' ? socialBubbles : undefined
            const currentSocialId = opt.value === 'following' ? socialFilter?.followingUserId : opt.value === 'bubble' ? socialFilter?.bubbleId : null
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
                <div className="flex w-full items-center justify-between">
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
                        setSocialSubOpen(null)
                      } else {
                        next.add(opt.value)
                      }
                      setMultiSelectState({ ...multiSelectState, selected: next })
                      applyMultiSelectImmediate(multiSelectState.attribute, next)
                    }}
                    className="flex flex-1 items-center justify-between px-3 py-2 text-left text-[13px] transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    <span>{opt.label}</span>
                    {isChecked && !hasSocialSub && <Check size={14} style={{ color: accent }} />}
                  </button>
                  {/* ▾ 소셜 하위 필터 토글 */}
                  {isChecked && hasSocialSub && (
                    <button
                      type="button"
                      onClick={() => setSocialSubOpen(isSocialSubOpen ? null : opt.value as 'following' | 'bubble')}
                      className="flex items-center gap-0.5 px-2 py-2 text-[11px]"
                      style={{ color: accent }}
                    >
                      <Check size={14} style={{ color: accent }} />
                      <span style={{
                        fontSize: '9px',
                        transition: 'transform .15s',
                        transform: isSocialSubOpen ? 'rotate(180deg)' : '',
                      }}>▾</span>
                    </button>
                  )}
                </div>
                {/* 소셜 하위 목록 (인라인 확장) */}
                {isSocialSubOpen && socialItems && (
                  <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', margin: '0 8px 4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onSocialFilterChange || !socialFilter) return
                        if (opt.value === 'following') onSocialFilterChange({ ...socialFilter, followingUserId: null })
                        if (opt.value === 'bubble') onSocialFilterChange({ ...socialFilter, bubbleId: null })
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-[12px]"
                      style={{ color: 'var(--text)' }}
                    >
                      <span>전체</span>
                      {!currentSocialId && <Check size={12} style={{ color: accent }} />}
                    </button>
                    {socialItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!onSocialFilterChange || !socialFilter) return
                          const isSame = currentSocialId === item.id
                          if (opt.value === 'following') {
                            onSocialFilterChange({ ...socialFilter, followingUserId: isSame ? null : item.id })
                          }
                          if (opt.value === 'bubble') {
                            onSocialFilterChange({ ...socialFilter, bubbleId: isSame ? null : item.id })
                          }
                        }}
                        className="flex w-full items-center justify-between px-3 py-1.5 text-[12px]"
                        style={{ color: 'var(--text)' }}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {item.iconUrl ? (
                            <Image
                              src={item.iconUrl}
                              alt=""
                              width={16}
                              height={16}
                              className="h-4 w-4 rounded-full object-cover"
                            />
                          ) : item.iconBgColor ? (
                            <span
                              className="flex h-4 w-4 items-center justify-center rounded-full text-[8px]"
                              style={{ backgroundColor: item.iconBgColor, color: 'var(--bg)' }}
                            >
                              {item.label.charAt(0)}
                            </span>
                          ) : null}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {currentSocialId === item.id && <Check size={12} style={{ color: accent }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </Popover>
      )}

      {/* ── location 팝오버 ── */}
      {locationState && (() => {
        const { attribute: locAttr, tabIndex, level, city } = locationState
        const tabs: LocationTab[] = locAttr.locationTabs ?? []
        const currentTab = tabs[tabIndex]

        // 도시 선택 후 → 구/생활권 목록
        if (level === 1 && city && currentTab) {
          const cityOption = currentTab.cascadingOptions.find((o) => o.value === city)
          const subOptions = cityOption?.children ?? []
          return (
            <Popover anchorRef={editingChipId ? { current: chipRefs.current.get(editingChipId) ?? null } : addBtnRef} align="right" onClose={closeAll}>
              <button
                type="button"
                onClick={() => setLocationState((prev) => prev ? { ...prev, level: 0, city: null } : null)}
                className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
                style={{ color: 'var(--text-hint)' }}
              >
                ← {city}
              </button>
              {subOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleLocationSelect(opt.value, opt.label, currentTab.fieldKey)}
                  className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
                  style={{ color: 'var(--text)' }}
                >
                  {opt.label}
                </button>
              ))}
            </Popover>
          )
        }

        // 기본: 내 위치 + 탭 + 도시 목록
        return (
          <Popover anchorRef={editingChipId ? { current: chipRefs.current.get(editingChipId) ?? null } : addBtnRef} align="right" onClose={closeAll}>
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
              onClick={() => handleLocationSelect('nearby', '내 주변')}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium transition-colors"
              style={{ color: accent }}
            >
              <MapPin size={14} />
              내 위치 (반경 1km)
            </button>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
            {/* 탭 전환 */}
            {tabs.length > 1 && (
              <div className="flex gap-0 px-3 pb-1">
                {tabs.map((tab, idx) => (
                  <button
                    key={tab.fieldKey}
                    type="button"
                    onClick={() => setLocationState((prev) => prev ? { ...prev, tabIndex: idx, level: 0, city: null } : null)}
                    className="flex-1 py-1.5 text-center text-[12px] font-medium"
                    style={{
                      color: idx === tabIndex ? accent : 'var(--text-hint)',
                      borderBottom: idx === tabIndex ? `2px solid ${accent}` : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {/* 도시 목록 */}
            {currentTab?.cascadingOptions.map((cityOpt) => (
              <button
                key={cityOpt.value}
                type="button"
                onClick={() => {
                  if (cityOpt.children && cityOpt.children.length > 0) {
                    setLocationState((prev) => prev ? { ...prev, level: 1, city: cityOpt.value } : null)
                  } else {
                    handleLocationSelect(cityOpt.value, cityOpt.label, currentTab.fieldKey)
                  }
                }}
                className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                {cityOpt.label}
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

        // multi-select / location 칩은 onClick에서 직접 팝오버 상태를 설정하므로 여기서는 스킵
        if (attributes.find((a) => a.key === chip.attribute && a.type === 'multi-select')) {
          return null
        }
        if (chip.attribute === 'location') {
          return null
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
