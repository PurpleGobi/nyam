'use client'

import { useState, useEffect } from 'react'
import { X, LocateFixed, Loader2 } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute, FilterAttributeType, CascadingOption } from '@/domain/entities/filter-config'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'
import { useCurrentLocation } from '@/application/hooks/use-current-location'

interface FilterRuleRowProps {
  index: number
  rule: FilterRule
  attributes: FilterAttribute[]
  onUpdate: (index: number, updated: FilterRule) => void
  onDelete: (index: number) => void
  conjunction: 'and' | 'or'
  onConjunctionChange: (c: 'and' | 'or') => void
  accentColor?: string
}

const SELECT_OPERATORS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
]

const TEXT_OPERATORS = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
]

const RANGE_OPERATORS = [
  { value: 'gte', label: '이상' },
  { value: 'lt', label: '미만' },
]

function getOperatorsForType(type: FilterAttributeType) {
  switch (type) {
    case 'select':
    case 'multi-select':
    case 'cascading-select':
    case 'location':
      return SELECT_OPERATORS
    case 'range':
      return RANGE_OPERATORS
    case 'text':
      return TEXT_OPERATORS
  }
}

function findCascadingPath(options: CascadingOption[], targetValue: string): string[] | null {
  for (const opt of options) {
    if (!opt.children) {
      if (opt.value === targetValue) return [opt.value]
    } else {
      const childPath = findCascadingPath(opt.children, targetValue)
      if (childPath) return [opt.value, ...childPath]
    }
  }
  return null
}

function CascadingSelect({
  options, labels, value, onChange, accentColor, attributeKey,
}: {
  options: CascadingOption[]; labels?: string[]; value: string
  onChange: (value: string) => void; accentColor?: string; attributeKey?: string
}) {
  const { location, isLoading: locationLoading, refresh } = useCurrentLocation()
  const existingPath = value ? findCascadingPath(options, value) : null
  const [selections, setSelections] = useState<string[]>(existingPath ?? [])

  useEffect(() => {
    if (!value) { setSelections([]); return }
    const path = findCascadingPath(options, value)
    if (path) setSelections(path)
  }, [value, options])

  useEffect(() => {
    if (!location || value) return
    const tv = attributeKey === 'area' ? location.area : location.district
    if (!tv) return
    const path = findCascadingPath(options, tv)
    if (path) { setSelections(path); onChange(tv) }
  }, [location, value, attributeKey, options, onChange])

  const applyCurrentLocation = () => {
    refresh()
    if (!location) return
    const tv = attributeKey === 'area' ? location.area : location.district
    if (!tv) return
    const path = findCascadingPath(options, tv)
    if (path) { setSelections(path); onChange(tv) }
  }

  const levels: { options: CascadingOption[]; placeholder: string }[] = []
  let current = options
  let depth = 0
  while (current.length > 0) {
    levels.push({ options: current, placeholder: labels?.[depth] ?? '' })
    const selected = selections[depth]
    if (!selected) break
    const found = current.find((o) => o.value === selected)
    if (!found?.children) break
    current = found.children
    depth++
  }

  const handleChange = (levelIndex: number, val: string) => {
    const next = [...selections.slice(0, levelIndex), val]
    setSelections(next)
    let node = options
    for (let i = 0; i <= levelIndex; i++) {
      const found = node.find((o) => o.value === (i === levelIndex ? val : next[i]))
      if (!found) break
      if (found.children && found.children.length > 0) { node = found.children }
      else { onChange(val); return }
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={applyCurrentLocation}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded transition-colors"
        style={{ color: 'var(--accent-social)' }}
        title="현위치"
      >
        {locationLoading
          ? <Loader2 size={11} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
          : <LocateFixed size={11} />
        }
      </button>
      {levels.map((level, i) => (
        <NyamSelect
          key={`${i}-${selections.slice(0, i).join('/')}`}
          options={level.options.map((o) => ({ value: o.value, label: o.label }))}
          value={selections[i] ?? ''}
          onChange={(val) => handleChange(i, val)}
          placeholder={level.placeholder}
          accentColor={accentColor}
          autoWidth
        />
      ))}
    </div>
  )
}

export function FilterRuleRow({
  index, rule, attributes, onUpdate, onDelete,
  conjunction, onConjunctionChange, accentColor,
}: FilterRuleRowProps) {
  const selectedAttr = attributes.find((a) => a.key === rule.attribute)
  const operators = selectedAttr ? getOperatorsForType(selectedAttr.type) : SELECT_OPERATORS
  const isCascading = selectedAttr?.type === 'cascading-select' && selectedAttr.cascadingOptions

  const handleAttributeChange = (key: string) => {
    const attr = attributes.find((a) => a.key === key)
    const ops = attr ? getOperatorsForType(attr.type) : SELECT_OPERATORS
    const defaultValue = attr?.type === 'cascading-select' ? '' : (attr?.options?.[0]?.value ?? '')
    onUpdate(index, { ...rule, attribute: key, operator: ops[0].value as FilterRule['operator'], value: defaultValue })
  }

  return (
    <div className="group flex items-center gap-1 py-[3px]">
      {/* conjunction 라벨 — 2번째 룰부터만 표시 */}
      {index > 0 && (
        <button
          type="button"
          onClick={() => onConjunctionChange(conjunction === 'and' ? 'or' : 'and')}
          className="w-[28px] shrink-0 text-[11px] transition-colors"
          style={{ color: 'var(--text-hint)' }}
        >
          {conjunction === 'and' ? 'And' : 'Or'}
        </button>
      )}

      {/* 속성 */}
      <NyamSelect
        options={attributes.map((a) => ({ value: a.key, label: a.label }))}
        value={rule.attribute}
        onChange={handleAttributeChange}
        accentColor={accentColor}
        autoWidth
      />

      {/* range 타입: 값 → 연산자 순서 (자연스러운 한국어: "50,000원 이상") */}
      {selectedAttr?.type === 'range' ? (
        <>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={String(rule.value ?? '')}
              onChange={(e) => onUpdate(index, { ...rule, value: e.target.value ? Number(e.target.value) : '' })}
              placeholder="금액"
              className="h-[26px] w-[80px] rounded px-2 text-right text-[12px] outline-none"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>원</span>
          </div>
          <NyamSelect
            options={operators}
            value={rule.operator}
            onChange={(op) => onUpdate(index, { ...rule, operator: op as FilterRule['operator'] })}
            accentColor={accentColor}
            autoWidth
          />
        </>
      ) : (
        <>
          {/* 연산자 */}
          <NyamSelect
            options={operators}
            value={rule.operator}
            onChange={(op) => onUpdate(index, { ...rule, operator: op as FilterRule['operator'] })}
            accentColor={accentColor}
            autoWidth
          />

          {/* 값 */}
          {isCascading ? (
            <CascadingSelect
              options={selectedAttr.cascadingOptions!}
              labels={selectedAttr.cascadingLabels}
              value={String(rule.value ?? '')}
              onChange={(val) => onUpdate(index, { ...rule, value: val })}
              accentColor={accentColor}
              attributeKey={selectedAttr.key}
            />
          ) : selectedAttr?.options ? (
            <NyamSelect
              options={selectedAttr.options}
              value={String(rule.value ?? '')}
              onChange={(val) => onUpdate(index, { ...rule, value: val })}
              accentColor={accentColor}
              autoWidth
            />
          ) : (
            <input
              type="text"
              value={String(rule.value ?? '')}
              onChange={(e) => onUpdate(index, { ...rule, value: e.target.value })}
              placeholder="값 입력"
              className="h-[26px] min-w-[60px] rounded px-2 text-[12px] outline-none"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          )}
        </>
      )}

      {/* 삭제 — hover 시만 표시 */}
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--text-hint)' }}
      >
        <X size={12} />
      </button>
    </div>
  )
}
