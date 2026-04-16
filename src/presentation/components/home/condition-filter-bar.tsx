'use client'

import { useCallback, useRef } from 'react'
import { Plus, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import { isAdvancedChip, CASCADING_ALL, LOCATION_DETAIL_KEY, isGradeSubChipKey } from '@/domain/entities/condition-chip'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { InlinePager } from '@/presentation/components/home/inline-pager'
import { FilterPopoverGroup } from '@/presentation/components/home/filter-popover-group'
import { useConditionChipHandlers } from '@/presentation/hooks/use-condition-chip-handlers'

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
  const addBtnRef = useRef<HTMLButtonElement>(null)

  const accent = accentType === 'wine' ? 'var(--accent-wine)' : accentType === 'social' ? 'var(--accent-social)' : 'var(--accent-food)'
  const wineClass = accentType === 'wine' ? 'wine' : accentType === 'social' ? 'social' : ''

  const handlers = useConditionChipHandlers({
    chips,
    onChipsChange,
    attributes,
    socialFilter,
    onSocialFilterChange,
  })

  const {
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
    availableAttributes,
    usedCascadeTypes,
    multiSelectChipIdRef,
    setSocialChipOpen,
    setLocTabIdx,
    setSelectedAttribute,
    setCascadingState,
    setMultiSelectState,
    setLocationState,
    setIsAddOpen,
    setEditingChipId,
    getChipAttrLabel,
    handleRemoveChip,
    handleChipClick,
    handleAddClick,
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
    closeAll,
    navigateToAttributeList,
  } = handlers

  const handleAdvancedClick = useCallback(() => {
    closeAll()
    onAdvancedOpen?.()
  }, [closeAll, onAdvancedOpen])

  return (
    <div className="flex items-center px-4 py-2" style={{ backgroundColor: 'var(--bg)' }}>
      <FilterChipGroup className="min-w-0 flex-1">
        {/* 조건 칩들 */}
        {conditionChips.filter((c) => !c.hidden).map((chip) => {
          const attrLabel = getChipAttrLabel(chip)
          const isAllPlaceholder = chip.value === CASCADING_ALL
          const isLocChild = chip.attribute === LOCATION_DETAIL_KEY
          const isCascadeGrade = isGradeSubChipKey(chip.attribute)
          const isChildChip = isLocChild || isCascadeGrade
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

        {/* 소셜 필터 칩 */}
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

      <FilterPopoverGroup
        accent={accent}
        addBtnRef={addBtnRef}
        chipRefs={chipRefs}
        isAddOpen={isAddOpen}
        selectedAttribute={selectedAttribute}
        editingChipId={editingChipId}
        replacingChipIdRef={replacingChipIdRef}
        cascadingState={cascadingState}
        multiSelectState={multiSelectState}
        locationState={locationState}
        socialChipOpen={socialChipOpen}
        socialChipRef={socialChipRef}
        locTabIdx={locTabIdx}
        conditionChips={conditionChips}
        availableAttributes={availableAttributes}
        usedCascadeTypes={usedCascadeTypes}
        attributes={attributes}
        chips={chips}
        multiSelectChipIdRef={multiSelectChipIdRef}
        socialFollowingUsers={socialFollowingUsers}
        socialBubbles={socialBubbles}
        socialFilter={socialFilter}
        onSocialFilterChange={onSocialFilterChange}
        onChipsChange={onChipsChange}
        closeAll={closeAll}
        setSelectedAttribute={setSelectedAttribute}
        setCascadingState={setCascadingState}
        setMultiSelectState={setMultiSelectState}
        setLocationState={setLocationState}
        setSocialChipOpen={setSocialChipOpen}
        setLocTabIdx={setLocTabIdx}
        setIsAddOpen={setIsAddOpen}
        setEditingChipId={setEditingChipId}
        handleAddCondition={handleAddCondition}
        handleCascadingSelect={handleCascadingSelect}
        applyMultiSelectImmediate={applyMultiSelectImmediate}
        handleLocationCityDirectSelect={handleLocationCityDirectSelect}
        handleLocationNearby={handleLocationNearby}
        handleLocationCitySelect={handleLocationCitySelect}
        handleLocationDetailSelect={handleLocationDetailSelect}
        handleChangeChipValue={handleChangeChipValue}
        handleChangeCascadingChipValue={handleChangeCascadingChipValue}
        findCascadingOptionsAtLevel={findCascadingOptionsAtLevel}
        navigateToAttributeList={navigateToAttributeList}
        onAdvancedOpen={onAdvancedOpen}
        handleAdvancedClick={handleAdvancedClick}
      />
    </div>
  )
}
