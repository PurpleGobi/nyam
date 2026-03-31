'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import type { AdvancedFilterChip } from '@/domain/entities/condition-chip'
import { generateChipId } from '@/domain/entities/condition-chip'
import { FilterSystem } from '@/presentation/components/ui/filter-system'

/* ================================================================
   AdvancedFilterPanel
   — 필터칩 바 바로 아래에 floating panel로 표시
   — 기존 FilterSystem(Notion 스타일) 재사용
   — "적용" 시 AdvancedFilterChip을 생성하여 콜백
   ================================================================ */

interface AdvancedFilterSheetProps {
  isOpen: boolean
  onClose: () => void
  onApply: (chip: AdvancedFilterChip) => void
  attributes: FilterAttribute[]
  accentType: 'food' | 'wine'
  editingChip?: AdvancedFilterChip | null
}

export function AdvancedFilterSheet({
  isOpen,
  onClose,
  onApply,
  attributes,
  accentType,
  editingChip,
}: AdvancedFilterSheetProps) {
  const [rules, setRules] = useState<FilterRule[]>(editingChip?.rules ?? [])
  const [conjunction, setConjunction] = useState<'and' | 'or'>(editingChip?.conjunction ?? 'and')
  const panelRef = useRef<HTMLDivElement>(null)

  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'

  // 열릴 때 editing 칩이 있으면 로드
  useEffect(() => {
    if (isOpen) {
      setRules(editingChip?.rules ?? [])
      setConjunction(editingChip?.conjunction ?? 'and')
    }
  }, [isOpen, editingChip])

  // 바깥 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      onClose()
    }
    // 다음 tick에 등록 (열기 클릭 이벤트와 충돌 방지)
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [isOpen, onClose])

  // Escape로 닫기
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleApply = useCallback(() => {
    if (rules.length === 0) return
    const chip: AdvancedFilterChip = {
      id: editingChip?.id ?? generateChipId(),
      attribute: '__advanced__',
      rules,
      conjunction,
      displayLabel: `${rules.length}개 조건`,
    }
    onApply(chip)
    setRules([])
    setConjunction('and')
    onClose()
  }, [rules, conjunction, editingChip, onApply, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="mx-4 rounded-xl shadow-lg md:mx-8"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        animation: 'slide-down 0.2s ease-out',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-sub)' }}>
          Advanced Filter
        </span>
        <button type="button" onClick={onClose} style={{ color: 'var(--text-hint)' }}>
          <X size={14} />
        </button>
      </div>

      {/* 필터 빌더 — overflow visible로 드롭다운 노출 허용 */}
      <div style={{ position: 'relative' }}>
        <FilterSystem
          rules={rules}
          conjunction={conjunction}
          attributes={attributes}
          onRulesChange={setRules}
          onConjunctionChange={setConjunction}
          accentColor={accentColor}
        />
      </div>

      {/* 적용 버튼 */}
      <div
        className="flex items-center justify-end gap-2 px-3 py-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
          style={{ color: 'var(--text-sub)' }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={rules.length === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: accentColor }}
        >
          <Check size={12} />
          적용
        </button>
      </div>
    </div>
  )
}
