'use client'

import { useState } from 'react'
import { Plus, X, Save, Trash2 } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import { FilterRuleRow } from '@/presentation/components/home/filter-rule-row'

/* ================================================================
   FilterSystem — Notion Advanced Filter (3단 중첩 지원)
   ================================================================ */

/** 재귀적 필터 그룹 — 룰 + 하위 그룹 */
export interface NestedFilterGroup {
  conjunction: 'and' | 'or'
  rules: FilterRule[]
  groups: NestedFilterGroup[]
}

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
  onClose?: () => void
}

const DEPTH_BG = [
  'rgba(0,0,0,0.03)',
  'rgba(0,0,0,0.05)',
  'rgba(0,0,0,0.07)',
]

function makeDefaultRule(attributes: FilterAttribute[]): FilterRule {
  const first = attributes[0]
  return {
    attribute: first?.key ?? '',
    operator: 'eq',
    value: first?.type === 'cascading-select' ? '' : (first?.options?.[0]?.value ?? ''),
  }
}

/** 재귀 그룹 렌더러 */
function FilterGroupView({
  group,
  onChange,
  onDelete,
  attributes,
  accentColor,
  depth,
  isFirst,
  parentConjunction,
  onParentConjunctionChange,
}: {
  group: NestedFilterGroup
  onChange: (updated: NestedFilterGroup) => void
  onDelete: () => void
  attributes: FilterAttribute[]
  accentColor?: string
  depth: number
  isFirst: boolean
  parentConjunction: 'and' | 'or'
  onParentConjunctionChange: (c: 'and' | 'or') => void
}) {
  const maxDepth = 3

  const updateRule = (idx: number, updated: FilterRule) => {
    const next = [...group.rules]
    next[idx] = updated
    onChange({ ...group, rules: next })
  }

  const deleteRule = (idx: number) => {
    const nextRules = group.rules.filter((_, i) => i !== idx)
    if (nextRules.length === 0 && group.groups.length === 0) {
      onDelete()
    } else {
      onChange({ ...group, rules: nextRules })
    }
  }

  const updateSubGroup = (idx: number, updated: NestedFilterGroup) => {
    const next = [...group.groups]
    next[idx] = updated
    onChange({ ...group, groups: next })
  }

  const deleteSubGroup = (idx: number) => {
    onChange({ ...group, groups: group.groups.filter((_, i) => i !== idx) })
  }

  const totalItems = group.rules.length + group.groups.length

  return (
    <div className="flex items-start gap-1 py-[3px]">
      {/* 부모 기준 conjunction */}
      {!isFirst && (
        <button
          type="button"
          onClick={() => onParentConjunctionChange(parentConjunction === 'and' ? 'or' : 'and')}
          className="w-[28px] shrink-0 pt-[5px] text-[11px]"
          style={{ color: 'var(--text-hint)' }}
        >
          {parentConjunction === 'and' ? 'And' : 'Or'}
        </button>
      )}

      {/* 그룹 박스 */}
      <div
        className="min-w-0 flex-1 rounded-lg px-1.5 py-0.5"
        style={{
          backgroundColor: DEPTH_BG[Math.min(depth, DEPTH_BG.length - 1)],
          border: '1px solid var(--border)',
        }}
      >
        {/* 그룹 내 룰 */}
        {group.rules.map((rule, ri) => (
          <FilterRuleRow
            key={ri}
            index={ri}
            rule={rule}
            attributes={attributes}
            onUpdate={updateRule}
            onDelete={deleteRule}
            conjunction={group.conjunction}
            onConjunctionChange={(c) => onChange({ ...group, conjunction: c })}
            accentColor={accentColor}
          />
        ))}

        {/* 그룹 내 하위 그룹 (재귀) */}
        {group.groups.map((sub, si) => (
          <FilterGroupView
            key={`sub-${si}`}
            group={sub}
            onChange={(updated) => updateSubGroup(si, updated)}
            onDelete={() => deleteSubGroup(si)}
            attributes={attributes}
            accentColor={accentColor}
            depth={depth + 1}
            isFirst={group.rules.length === 0 && si === 0}
            parentConjunction={group.conjunction}
            onParentConjunctionChange={(c) => onChange({ ...group, conjunction: c })}
          />
        ))}

        {/* 그룹 내 추가 버튼 */}
        <div className="flex items-center gap-2 py-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...group, rules: [...group.rules, makeDefaultRule(attributes)] })}
            className="flex items-center gap-0.5 text-[10px] font-medium"
            style={{ color: accentColor ?? 'var(--accent-food)' }}
          >
            <Plus size={9} /> 추가
          </button>
          {depth < maxDepth - 1 && (
            <button
              type="button"
              onClick={() => onChange({
                ...group,
                groups: [...group.groups, { conjunction: 'or', rules: [makeDefaultRule(attributes)], groups: [] }],
              })}
              className="flex items-center gap-0.5 text-[10px] font-medium"
              style={{ color: accentColor ?? 'var(--accent-food)' }}
            >
              <Plus size={9} /> 그룹
            </button>
          )}
          <button type="button" onClick={onDelete} style={{ color: 'var(--text-hint)' }}>
            <X size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

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
  onClose,
}: FilterSystemProps) {
  const [groups, setGroups] = useState<NestedFilterGroup[]>([])

  const canSave = rules.length > 0

  return (
    <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* 최상위 룰 */}
      {rules.map((rule, index) => (
        <FilterRuleRow
          key={index}
          index={index}
          rule={rule}
          attributes={attributes}
          onUpdate={(i, updated) => { const n = [...rules]; n[i] = updated; onRulesChange(n) }}
          onDelete={(i) => onRulesChange(rules.filter((_, j) => j !== i))}
          conjunction={conjunction}
          onConjunctionChange={onConjunctionChange}
          accentColor={accentColor}
        />
      ))}

      {/* 최상위 그룹 (재귀) */}
      {groups.map((group, gi) => (
        <FilterGroupView
          key={`g-${gi}`}
          group={group}
          onChange={(updated) => { const n = [...groups]; n[gi] = updated; setGroups(n) }}
          onDelete={() => setGroups(groups.filter((_, i) => i !== gi))}
          attributes={attributes}
          accentColor={accentColor}
          depth={0}
          isFirst={rules.length === 0 && gi === 0}
          parentConjunction={conjunction}
          onParentConjunctionChange={onConjunctionChange}
        />
      ))}

      {/* 추가 버튼 행 */}
      <div className="flex items-center gap-3 py-1.5">
        <button
          type="button"
          onClick={() => onRulesChange([...rules, makeDefaultRule(attributes)])}
          className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium"
          style={{ color: accentColor ?? 'var(--accent-food)' }}
        >
          <Plus size={10} /> 필터 추가
        </button>
        <button
          type="button"
          onClick={() => setGroups([...groups, { conjunction: 'or', rules: [makeDefaultRule(attributes)], groups: [] }])}
          className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium"
          style={{ color: accentColor ?? 'var(--accent-food)' }}
        >
          <Plus size={10} /> 그룹 추가
        </button>
        <button type="button" onClick={onClose} style={{ color: 'var(--text-hint)' }}>
          <X size={13} />
        </button>
      </div>

      {/* 저장 행 */}
      {rules.length > 0 && (
        <div
          className="flex items-center gap-1.5 pt-1.5"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className="relative inline-flex items-center rounded-full px-2.5"
            style={{ border: '1px solid var(--border)', height: '26px' }}
          >
            <span className="pointer-events-none invisible whitespace-pre text-[11px]">
              {chipName || '신규 필터칩'}
            </span>
            <input
              type="text"
              value={chipName}
              onChange={(e) => onChipNameChange?.(e.target.value)}
              placeholder="신규 필터칩"
              maxLength={20}
              className="absolute inset-0 rounded-full bg-transparent px-2.5 text-[11px] outline-none"
              style={{ color: 'var(--text)' }}
            />
          </div>
          {activeChipId && onDeleteChip ? (
            <button
              type="button"
              onClick={() => onDeleteChip(activeChipId)}
              className="flex shrink-0 items-center justify-center"
              style={{ color: '#E54D2E' }}
            >
              <Trash2 size={14} />
            </button>
          ) : canSave ? (
            <button
              type="button"
              onClick={() => onSaveAsChip?.(chipName.trim() || '신규 필터칩')}
              className="flex shrink-0 items-center justify-center"
              style={{ color: accentColor ?? 'var(--accent-food)' }}
            >
              <Save size={14} />
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
