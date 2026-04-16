'use client'

import { Check, SlidersHorizontal, MapPin } from 'lucide-react'
import Image from 'next/image'
import type { FilterAttribute, CascadingOption, LocationTab } from '@/domain/entities/filter-config'
import type { ConditionChip } from '@/domain/entities/condition-chip'
import {
  isAdvancedChip,
  isCascadingKey,
  getCascadingBaseKey,
  getCascadingLevel,
  CASCADING_ALL,
  LOCATION_TAB_KEY,
  LOCATION_CITY_KEY,
  LOCATION_DETAIL_KEY,
} from '@/domain/entities/condition-chip'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { FilterPopover } from '@/presentation/components/home/filter-popover'
import type { SocialFilterState, SocialFilterOption } from '@/presentation/components/home/condition-filter-bar'
import type { CascadingStateValue, MultiSelectStateValue, LocationStateValue } from '@/presentation/hooks/use-condition-chip-handlers'

/** 팝오버 공통 뒤로가기 헤더 */
function PopoverBackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex w-full items-center gap-1 px-3 py-1.5 text-[11px] font-semibold"
      style={{ color: 'var(--text-hint)' }}
    >
      ← {label}
    </button>
  )
}

interface FilterPopoverGroupProps {
  accent: string
  addBtnRef: React.RefObject<HTMLButtonElement | null>
  chipRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>
  // state
  isAddOpen: boolean
  selectedAttribute: FilterAttribute | null
  editingChipId: string | null
  replacingChipIdRef: React.MutableRefObject<string | null>
  cascadingState: CascadingStateValue | null
  multiSelectState: MultiSelectStateValue | null
  locationState: LocationStateValue | null
  socialChipOpen: 'following' | 'bubble' | null
  socialChipRef: React.RefObject<HTMLButtonElement | null>
  locTabIdx: number
  conditionChips: ConditionChip[]
  availableAttributes: FilterAttribute[]
  usedCascadeTypes: Map<string, string[]>
  attributes: FilterAttribute[]
  chips: import('@/domain/entities/condition-chip').FilterChipItem[]
  multiSelectChipIdRef: React.MutableRefObject<string | null>
  // social
  socialFollowingUsers?: SocialFilterOption[]
  socialBubbles?: SocialFilterOption[]
  socialFilter?: SocialFilterState
  onSocialFilterChange?: (filter: SocialFilterState) => void
  // callbacks
  onChipsChange: (chips: import('@/domain/entities/condition-chip').FilterChipItem[]) => void
  closeAll: () => void
  setSelectedAttribute: (attr: FilterAttribute | null) => void
  setCascadingState: (state: CascadingStateValue | null) => void
  setMultiSelectState: (state: MultiSelectStateValue | null) => void
  setLocationState: (state: LocationStateValue | null) => void
  setSocialChipOpen: (v: 'following' | 'bubble' | null) => void
  setLocTabIdx: (idx: number) => void
  setIsAddOpen: (v: boolean) => void
  setEditingChipId: (id: string | null) => void
  // handlers
  handleAddCondition: (attr: FilterAttribute, value: string) => void
  handleCascadingSelect: (opt: CascadingOption) => void
  applyMultiSelectImmediate: (attr: FilterAttribute, selected: Set<string>) => void
  handleLocationCityDirectSelect: (tabIndex: number, cityValue: string, cityLabel: string) => void
  handleLocationNearby: () => void
  handleLocationCitySelect: (cityValue: string, cityLabel: string) => void
  handleLocationDetailSelect: (detailValue: string, detailLabel: string) => void
  handleChangeChipValue: (chipId: string, newValue: string) => void
  handleChangeCascadingChipValue: (chipId: string, opt: CascadingOption) => void
  findCascadingOptionsAtLevel: (attr: FilterAttribute, level: number, currentChips: ConditionChip[]) => CascadingOption[] | null
  navigateToAttributeList: () => void
  onAdvancedOpen?: () => void
  handleAdvancedClick: () => void
}

export function FilterPopoverGroup(props: FilterPopoverGroupProps) {
  const {
    accent,
    addBtnRef,
    chipRefs,
    isAddOpen,
    selectedAttribute,
    editingChipId,
    replacingChipIdRef,
    cascadingState,
    multiSelectState,
    locationState,
    socialChipOpen,
    socialChipRef,
    locTabIdx,
    conditionChips,
    availableAttributes,
    usedCascadeTypes,
    attributes,
    chips,
    multiSelectChipIdRef,
    socialFollowingUsers,
    socialBubbles,
    socialFilter,
    onSocialFilterChange,
    onChipsChange,
    closeAll,
    setSelectedAttribute,
    setCascadingState,
    setMultiSelectState,
    setLocationState,
    setSocialChipOpen,
    setLocTabIdx,
    setIsAddOpen,
    setEditingChipId,
    handleAddCondition,
    handleCascadingSelect,
    applyMultiSelectImmediate,
    handleLocationCityDirectSelect,
    handleLocationNearby,
    handleLocationCitySelect,
    handleLocationDetailSelect,
    handleChangeChipValue,
    handleChangeCascadingChipValue,
    findCascadingOptionsAtLevel,
    navigateToAttributeList,
    onAdvancedOpen,
    handleAdvancedClick,
  } = props

  // 팝오버 앵커: 편집/교체 중이면 칩 위치, 아니면 + 버튼
  const anchorChipId = editingChipId ?? replacingChipIdRef.current
  const popoverAnchorRef = anchorChipId
    ? { get current() { return chipRefs.current.get(anchorChipId) ?? null } }
    : addBtnRef
  const popoverAlign = 'left' as const

  return (
    <>
      {/* ── 속성 선택 팝오버 ── */}
      {isAddOpen && !selectedAttribute && !cascadingState && !multiSelectState && !locationState && (
        <FilterPopover anchorRef={popoverAnchorRef} align={popoverAlign} onClose={closeAll}>
          {availableAttributes.map((attr, idx) => {
            const prevGroup = idx > 0 ? availableAttributes[idx - 1].group : undefined
            const showGroupLabel = attr.group !== undefined && attr.group !== prevGroup
            return (
              <div key={attr.key}>
                {showGroupLabel && (
                  <div
                    className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      color: 'var(--text-hint)',
                      borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                      marginTop: idx > 0 ? 4 : undefined,
                      paddingTop: idx > 0 ? 6 : undefined,
                    }}
                  >
                    {attr.group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (attr.type === 'cascading-select' && attr.cascadingOptions) {
                      setCascadingState({ attribute: attr, level: 0, currentOptions: attr.cascadingOptions })
                    } else if (attr.type === 'location') {
                      setLocationState({ attribute: attr, tabIndex: 0, level: 0, city: null })
                    } else if (attr.type === 'multi-select') {
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
              </div>
            )
          })}
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
        </FilterPopover>
      )}

      {/* ── 값 선택 팝오버 (일반 select) ── */}
      {isAddOpen && selectedAttribute && selectedAttribute.type !== 'multi-select' && !cascadingState && (
        <FilterPopover anchorRef={popoverAnchorRef} align={popoverAlign} onClose={closeAll}>
          <PopoverBackHeader label={selectedAttribute.label} onBack={navigateToAttributeList} />
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
        </FilterPopover>
      )}

      {/* ── multi-select 체크박스 팝오버 ── */}
      {multiSelectState && (
        <FilterPopover anchorRef={popoverAnchorRef} align={popoverAlign} onClose={() => {
          setMultiSelectState(null)
          setIsAddOpen(false)
          setSocialChipOpen(null)
          multiSelectChipIdRef.current = null
        }}>
          <PopoverBackHeader label={multiSelectState.attribute.label} onBack={navigateToAttributeList} />
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
        </FilterPopover>
      )}

      {/* ── 소셜 필터 팝오버 ── */}
      {socialChipOpen && (
        <FilterPopover anchorRef={socialChipRef} align="left" onClose={() => setSocialChipOpen(null)}>
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
        </FilterPopover>
      )}

      {/* ── location 초기 선택 팝오버 ── */}
      {locationState && (() => {
        const { attribute: locAttr } = locationState
        const tabs: LocationTab[] = locAttr.locationTabs ?? []
        const currentTab = tabs[locTabIdx]
        return (
          <FilterPopover anchorRef={popoverAnchorRef} align={popoverAlign} onClose={closeAll}>
            <PopoverBackHeader label={locAttr.label} onBack={navigateToAttributeList} />
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
          </FilterPopover>
        )
      })()}

      {/* ── cascading-select 초기 선택 팝오버 ── */}
      {isAddOpen && cascadingState && (
        <FilterPopover anchorRef={popoverAnchorRef} align={popoverAlign} onClose={closeAll}>
          <PopoverBackHeader label={cascadingState.attribute.cascadingLabels?.[0] ?? cascadingState.attribute.label} onBack={navigateToAttributeList} />
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
        </FilterPopover>
      )}

      {/* ── 칩 값 변경 팝오버 ── */}
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
            <FilterPopover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <PopoverBackHeader label={levelLabel} onBack={navigateToAttributeList} />
              {parentIsAll ? (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-hint)' }}>
                  상위 항목을 먼저 선택하세요
                </div>
              ) : (
                <>
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
            </FilterPopover>
          )
        }

        // multi-select 칩은 onClick에서 직접 팝오버 상태를 설정하므로 스킵
        if (attributes.find((a) => a.key === chip.attribute && a.type === 'multi-select')) {
          return null
        }
        if (chip.attribute === LOCATION_TAB_KEY) return null
        if (chip.attribute === 'location') return null

        // location city 칩
        if (chip.attribute === LOCATION_CITY_KEY) {
          const tabChip = conditionChips.find((c) => c.attribute === LOCATION_TAB_KEY)
          const tabs = attributes.find((a) => a.key === 'location')?.locationTabs ?? []
          const tab = tabChip ? tabs[Number(tabChip.value)] : undefined
          if (!tab) return null
          const cityLabel = tab.cascadingLabels[0] ?? '도시'
          return (
            <FilterPopover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <PopoverBackHeader label={cityLabel} onBack={navigateToAttributeList} />
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
            </FilterPopover>
          )
        }

        // location detail 칩
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
            <FilterPopover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <PopoverBackHeader label={detailLabel} onBack={navigateToAttributeList} />
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
            </FilterPopover>
          )
        }

        // grade sub-chip 편집
        const gradeMatch = chip.attribute.match(/^(.+)_grade:(.+)$/)
        if (gradeMatch) {
          const parentKey = gradeMatch[1]
          const typeValue = gradeMatch[2]
          const parentAttr = attributes.find((a) => a.key === parentKey)
          const parentOpt = parentAttr?.options?.find((o) => o.value === typeValue)
          if (!parentOpt?.children) return null
          return (
            <FilterPopover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
              <PopoverBackHeader label={parentOpt.label} onBack={navigateToAttributeList} />
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
            </FilterPopover>
          )
        }

        // 일반 select 칩 편집
        const attr = attributes.find((a) => a.key === chip.attribute)
        if (!attr?.options) return null
        return (
          <FilterPopover anchorRef={chipBtnRef} align="left" onClose={() => setEditingChipId(null)}>
            <PopoverBackHeader label={attr.label} onBack={navigateToAttributeList} />
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
          </FilterPopover>
        )
      })()}
    </>
  )
}
