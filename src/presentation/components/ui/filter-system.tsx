'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Save, Layers, Trash2 } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute, FilterAttributeType } from '@/domain/entities/filter-config'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'

/* ================================================================
   FilterSystem — Notion 스타일 필터 패널 (공통 컴포넌트)
   SSOT: DESIGN_SYSTEM.md §7-B, 04_filter_sort.md §3
   사용처: 홈, 버블, Discover 등 모든 필터 가능 페이지
   ================================================================ */

// ─── 연산자 정의 ───

const SELECT_OPERATORS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
]

const TEXT_OPERATORS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
]

const RANGE_OPERATORS = [
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
]

function getOperatorsForType(type: FilterAttributeType) {
  switch (type) {
    case 'select':
    case 'multi-select':
      return SELECT_OPERATORS
    case 'range':
      return RANGE_OPERATORS
    case 'text':
      return TEXT_OPERATORS
  }
}

// ─── 필터 규칙 그룹 (AND-of-ORs 지원) ───

export interface FilterGroup {
  conjunction: 'and' | 'or'
  rules: FilterRule[]
}

// ─── Props ───

export interface FilterSystemProps {
  rules: FilterRule[]
  conjunction: 'and' | 'or'
  attributes: FilterAttribute[]
  onRulesChange: (rules: FilterRule[]) => void
  onConjunctionChange: (conjunction: 'and' | 'or') => void
  chipName?: string
  onChipNameChange?: (name: string) => void
  onSaveAsChip?: (name?: string) => void
  activeChipId?: string | null
  onDeleteChip?: (chipId: string) => void
  accentColor?: string
}

// ─── 필터 규칙 행 ───

function FilterRuleRow({
  index, rule, attributes, onUpdate, onDelete, accentColor,
}: {
  index: number
  rule: FilterRule
  attributes: FilterAttribute[]
  onUpdate: (index: number, updated: FilterRule) => void
  onDelete: (index: number) => void
  accentColor?: string
}) {
  const selectedAttr = attributes.find((a) => a.key === rule.attribute)
  const operators = selectedAttr ? getOperatorsForType(selectedAttr.type) : SELECT_OPERATORS

  const handleAttributeChange = (key: string) => {
    const attr = attributes.find((a) => a.key === key)
    const ops = attr ? getOperatorsForType(attr.type) : SELECT_OPERATORS
    const defaultValue = attr?.options?.[0]?.value ?? ''
    onUpdate(index, {
      ...rule,
      attribute: key,
      operator: ops[0].value as FilterRule['operator'],
      value: defaultValue,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <NyamSelect
        options={attributes.map((a) => ({ value: a.key, label: a.label }))}
        value={rule.attribute}
        onChange={handleAttributeChange}
        accentColor={accentColor}
      />
      <NyamSelect
        options={operators}
        value={rule.operator}
        onChange={(op) => onUpdate(index, { ...rule, operator: op as FilterRule['operator'] })}
        accentColor={accentColor}
      />
      {selectedAttr?.options ? (
        <NyamSelect
          options={selectedAttr.options}
          value={String(rule.value ?? '')}
          onChange={(val) => onUpdate(index, { ...rule, value: val })}
          accentColor={accentColor}
        />
      ) : (
        <input
          type="text"
          value={String(rule.value ?? '')}
          onChange={(e) => onUpdate(index, { ...rule, value: e.target.value })}
          placeholder="값 입력"
          className="nyam-input"
          style={{ flex: 1, fontSize: '12px', padding: '5px 10px' }}
        />
      )}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--text-hint)' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

// ─── + 필터 추가 드롭다운 ───

function AddFilterDropdown({
  onAddRule,
  onAddGroup,
}: {
  onAddRule: () => void
  onAddGroup: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors"
        style={{ color: 'var(--text-hint)' }}
      >
        <Plus size={12} style={{ opacity: 0.5 }} />
        필터 추가
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', left: 0, top: '100%', zIndex: 90,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
            padding: '4px', minWidth: '180px',
          }}
        >
          <button
            type="button"
            onClick={() => { onAddRule(); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Plus size={14} style={{ color: 'var(--text-hint)' }} />
            필터 추가
          </button>
          <button
            type="button"
            onClick={() => { onAddGroup(); setOpen(false) }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] font-medium transition-colors"
            style={{ color: 'var(--text)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Layers size={14} style={{ color: 'var(--text-hint)' }} />
            필터 그룹 추가
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 메인 FilterSystem 컴포넌트 ───

export function FilterSystem({
  rules,
  conjunction,
  attributes,
  onRulesChange,
  onConjunctionChange,
  chipName = '',
  onChipNameChange,
  onSaveAsChip,
  activeChipId,
  onDeleteChip,
  accentColor,
}: FilterSystemProps) {
  const handleAddRule = () => {
    const firstAttr = attributes[0]
    if (!firstAttr) return
    const newRule: FilterRule = {
      attribute: firstAttr.key,
      operator: 'eq',
      value: firstAttr.options?.[0]?.value ?? '',
    }
    onRulesChange([...rules, newRule])
  }

  const [subGroups, setSubGroups] = useState<FilterRule[][]>([])

  const handleAddGroup = () => {
    const firstAttr = attributes[0]
    if (!firstAttr) return
    setSubGroups([...subGroups, [{
      attribute: firstAttr.key,
      operator: 'eq',
      value: firstAttr.options?.[0]?.value ?? '',
    }]])
  }

  const handleUpdateRule = (index: number, updated: FilterRule) => {
    const next = [...rules]
    next[index] = updated
    onRulesChange(next)
  }

  const handleDeleteRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index))
  }

  const toggleConjunction = () => {
    onConjunctionChange(conjunction === 'and' ? 'or' : 'and')
  }

  const canSave = rules.length > 0 && chipName.trim().length > 0

  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* 규칙 목록 */}
      <div className="flex flex-col gap-2">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* conjunction 라벨 */}
            <div className="w-10 shrink-0 text-right">
              {index === 0 ? (
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)' }}>
                  Where
                </span>
              ) : (
                <button
                  type="button"
                  onClick={toggleConjunction}
                  className="rounded-md px-1.5 py-0.5 transition-colors"
                  style={{
                    fontSize: '11px', fontWeight: 600,
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-sub)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {conjunction === 'and' ? 'AND' : 'OR'}
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <FilterRuleRow
                index={index}
                rule={rule}
                attributes={attributes}
                onUpdate={handleUpdateRule}
                onDelete={handleDeleteRule}
                accentColor={accentColor}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 서브 그룹 (AND 고정) */}
      {subGroups.map((groupRules, gi) => (
        <div
          key={gi}
          className="mt-2 rounded-lg p-3"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-hint)', textTransform: 'uppercase' }}>
              AND 그룹
            </span>
            <button
              type="button"
              onClick={() => setSubGroups(subGroups.filter((_, i) => i !== gi))}
              style={{ color: 'var(--text-hint)' }}
            >
              <X size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {groupRules.map((rule, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <div className="w-10 shrink-0 text-right">
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)' }}>
                    {ri === 0 ? 'Where' : 'AND'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <FilterRuleRow
                    index={ri}
                    rule={rule}
                    attributes={attributes}
                    onUpdate={(idx, updated) => {
                      const next = [...subGroups]
                      next[gi] = [...next[gi]]
                      next[gi][idx] = updated
                      setSubGroups(next)
                    }}
                    onDelete={(idx) => {
                      const next = [...subGroups]
                      next[gi] = next[gi].filter((_, i) => i !== idx)
                      if (next[gi].length === 0) {
                        setSubGroups(next.filter((_, i) => i !== gi))
                      } else {
                        setSubGroups(next)
                      }
                    }}
                    accentColor={accentColor}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const firstAttr = attributes[0]
              if (!firstAttr) return
              const next = [...subGroups]
              next[gi] = [...next[gi], {
                attribute: firstAttr.key,
                operator: 'eq' as const,
                value: firstAttr.options?.[0]?.value ?? '',
              }]
              setSubGroups(next)
            }}
            className="mt-2 flex items-center gap-1 text-[11px] font-medium"
            style={{ color: 'var(--text-hint)' }}
          >
            <Plus size={11} /> 조건 추가
          </button>
        </div>
      ))}

      {/* 하단 액션: + 필터 추가 | 칩 이름 | 삭제 | 저장 */}
      <div className="mt-3 flex items-center gap-2">
        <AddFilterDropdown
          onAddRule={handleAddRule}
          onAddGroup={handleAddGroup}
        />

        {/* 칩 이름 입력 */}
        <input
          type="text"
          value={chipName}
          onChange={(e) => onChipNameChange?.(e.target.value)}
          placeholder="칩 이름"
          maxLength={20}
          className="nyam-input"
          style={{ flex: 1, fontSize: '12px', padding: '5px 10px' }}
        />

        {/* 삭제 (기존 칩 선택 시에만 표시) */}
        {activeChipId && onDeleteChip && (
          <button
            type="button"
            onClick={() => onDeleteChip(activeChipId)}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors"
            style={{ color: 'var(--negative, #e55)' }}
          >
            <Trash2 size={12} />
            삭제
          </button>
        )}

        {/* 저장 */}
        <button
          type="button"
          onClick={() => { if (canSave) onSaveAsChip?.(chipName.trim()) }}
          disabled={!canSave}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors"
          style={{
            color: canSave ? 'var(--text-sub)' : 'var(--text-hint)',
            opacity: canSave ? 1 : 0.5,
            cursor: canSave ? 'pointer' : 'not-allowed',
          }}
        >
          <Save size={12} />
          저장
        </button>
      </div>
    </div>
  )
}
