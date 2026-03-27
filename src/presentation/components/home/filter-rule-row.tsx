'use client'

import { Trash2 } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'

interface FilterRuleRowProps {
  index: number
  rule: FilterRule
  attributes: FilterAttribute[]
  onUpdate: (index: number, updated: FilterRule) => void
  onDelete: (index: number) => void
}

const TEXT_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'contains', label: '포함' },
  { value: 'not_contains', label: '미포함' },
  { value: 'is_null', label: '비어있음' },
  { value: 'is_not_null', label: '비어있지 않음' },
]

const NUMBER_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_null', label: '비어있음' },
  { value: 'is_not_null', label: '비어있지 않음' },
]

const BOOLEAN_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
]

const SELECT_OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'is_null', label: '비어있음' },
  { value: 'is_not_null', label: '비어있지 않음' },
]

function getOperatorsForType(type: FilterAttribute['type']) {
  switch (type) {
    case 'text': return TEXT_OPERATORS
    case 'number': return NUMBER_OPERATORS
    case 'boolean': return BOOLEAN_OPERATORS
    case 'select': return SELECT_OPERATORS
  }
}

function isNullishOperator(op: string): boolean {
  return op === 'is_null' || op === 'is_not_null'
}

export function FilterRuleRow({ index, rule, attributes, onUpdate, onDelete }: FilterRuleRowProps) {
  const selectedAttr = attributes.find((a) => a.key === rule.attribute)
  const operators = selectedAttr ? getOperatorsForType(selectedAttr.type) : TEXT_OPERATORS
  const showValueInput = !isNullishOperator(rule.operator)

  const handleAttributeChange = (key: string) => {
    const attr = attributes.find((a) => a.key === key)
    const ops = attr ? getOperatorsForType(attr.type) : TEXT_OPERATORS
    onUpdate(index, {
      ...rule,
      attribute: key,
      operator: ops[0].value as FilterRule['operator'],
      value: attr?.type === 'boolean' ? true : '',
    })
  }

  const handleOperatorChange = (op: string) => {
    onUpdate(index, {
      ...rule,
      operator: op as FilterRule['operator'],
      value: isNullishOperator(op) ? null : rule.value,
    })
  }

  const handleValueChange = (val: string) => {
    let parsed: string | number | boolean = val
    if (selectedAttr?.type === 'number' && val !== '') {
      parsed = Number(val)
    }
    if (selectedAttr?.type === 'boolean') {
      parsed = val === 'true'
    }
    onUpdate(index, { ...rule, value: parsed })
  }

  return (
    <div className="flex items-center gap-2">
      <NyamSelect
        options={attributes.map((a) => ({ value: a.key, label: a.label }))}
        value={rule.attribute}
        onChange={handleAttributeChange}
      />

      <NyamSelect
        options={operators}
        value={rule.operator}
        onChange={handleOperatorChange}
      />

      {showValueInput && (
        <>
          {selectedAttr?.type === 'select' && selectedAttr.options ? (
            <NyamSelect
              options={selectedAttr.options.map((o) => ({ value: o, label: o }))}
              value={String(rule.value ?? '')}
              onChange={handleValueChange}
            />
          ) : selectedAttr?.type === 'boolean' ? (
            <NyamSelect
              options={[
                { value: 'true', label: '예' },
                { value: 'false', label: '아니오' },
              ]}
              value={String(rule.value ?? 'true')}
              onChange={handleValueChange}
            />
          ) : (
            <input
              type={selectedAttr?.type === 'number' ? 'number' : 'text'}
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
        </>
      )}

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
