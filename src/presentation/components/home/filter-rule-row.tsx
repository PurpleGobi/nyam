'use client'

import { Trash2 } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute, FilterAttributeType } from '@/domain/entities/filter-config'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'

interface FilterRuleRowProps {
  index: number
  rule: FilterRule
  attributes: FilterAttribute[]
  onUpdate: (index: number, updated: FilterRule) => void
  onDelete: (index: number) => void
}

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
  { value: 'gte', label: '\u2265' },
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

export function FilterRuleRow({ index, rule, attributes, onUpdate, onDelete }: FilterRuleRowProps) {
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

  const handleOperatorChange = (op: string) => {
    onUpdate(index, { ...rule, operator: op as FilterRule['operator'] })
  }

  const handleValueChange = (val: string) => {
    onUpdate(index, { ...rule, value: val })
  }

  return (
    <div className="flex items-center gap-2">
      {/* 속성 드롭다운 */}
      <NyamSelect
        options={attributes.map((a) => ({ value: a.key, label: a.label }))}
        value={rule.attribute}
        onChange={handleAttributeChange}
      />

      {/* 연산자 드롭다운 */}
      <NyamSelect
        options={operators}
        value={rule.operator}
        onChange={handleOperatorChange}
      />

      {/* 값 드롭다운/입력 */}
      {selectedAttr?.options ? (
        <NyamSelect
          options={selectedAttr.options}
          value={String(rule.value ?? '')}
          onChange={handleValueChange}
        />
      ) : (
        <input
          type="text"
          value={String(rule.value ?? '')}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="값 입력"
          className="h-9 min-w-0 flex-1 rounded-[10px] px-3 text-[13px] outline-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />
      )}

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors"
        style={{ color: 'var(--text-hint)' }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
