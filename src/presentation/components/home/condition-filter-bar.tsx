'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, SlidersHorizontal, Check } from 'lucide-react'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import type { FilterChipItem, ConditionChip } from '@/domain/entities/condition-chip'
import { isAdvancedChip, generateChipId } from '@/domain/entities/condition-chip'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { InlinePager } from '@/presentation/components/home/inline-pager'

/* ================================================================
   ConditionFilterBar
   - 조건 칩들 (attribute:value ✕)  — 모든 속성 동등 (status 포함)
   - + 버튼 → 속성 선택 팝오버 → 값 선택 팝오버
   - +Advanced Filter → onAdvancedOpen 콜백
   - 칩이 없으면 + 버튼만 표시 (전체보기 상태)
   ================================================================ */

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
}: ConditionFilterBarProps) {
  const showPager = recordTotalPages != null && recordTotalPages > 1
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<FilterAttribute | null>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  const accent = accentType === 'wine' ? 'var(--accent-wine)' : accentType === 'social' ? 'var(--accent-social)' : 'var(--accent-food)'
  const wineClass = accentType === 'wine' ? 'wine' : accentType === 'social' ? 'social' : ''

  // 모든 칩을 동등하게 취급
  const conditionChips = chips.filter((c) => !isAdvancedChip(c)) as ConditionChip[]
  const advancedChips = chips.filter(isAdvancedChip)

  // 이미 추가된 속성 키 (중복 방지)
  const usedKeys = new Set(conditionChips.map((c) => c.attribute))
  const availableAttributes = attributes.filter((a) => !usedKeys.has(a.key))

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
  }, [chips, onChipsChange])

  const handleRemoveChip = useCallback((chipId: string) => {
    onChipsChange(chips.filter((c) => c.id !== chipId))
  }, [chips, onChipsChange])

  const closeAll = useCallback(() => {
    setIsAddOpen(false)
    setSelectedAttribute(null)
  }, [])

  const handleAddClick = useCallback(() => {
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
        {/* 조건 칩들 — status 포함 모든 속성 동등 */}
        {conditionChips.map((chip) => {
          const attrLabel = attributes.find((a) => a.key === chip.attribute)?.label ?? chip.attribute
          return (
            <button
              key={chip.id}
              type="button"
              className={`filter-chip active ${wineClass}`}
              onClick={() => handleRemoveChip(chip.id)}
            >
              <span style={{ opacity: 0.7, fontSize: '11px' }}>{attrLabel}</span>
              {chip.displayLabel}
              <X size={10} style={{ opacity: 0.6 }} />
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
      {isAddOpen && !selectedAttribute && (
        <Popover anchorRef={addBtnRef} align="right" onClose={closeAll}>
          <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
            속성 선택
          </div>
          {availableAttributes.map((attr) => (
            <button
              key={attr.key}
              type="button"
              onClick={() => setSelectedAttribute(attr)}
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

      {/* ── 값 선택 팝오버 (Portal) ── */}
      {isAddOpen && selectedAttribute && (
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
          {selectedAttribute.type === 'cascading-select' && !selectedAttribute.options && (
            <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-hint)' }}>
              Advanced Filter에서 설정하세요
            </div>
          )}
        </Popover>
      )}
    </div>
  )
}
