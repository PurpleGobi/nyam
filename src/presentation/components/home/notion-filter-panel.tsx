'use client'

import { Plus, Save } from 'lucide-react'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import { FilterRuleRow } from '@/presentation/components/home/filter-rule-row'

interface NotionFilterPanelProps {
  rules: FilterRule[]
  conjunction: 'and' | 'or'
  attributes: FilterAttribute[]
  onRulesChange: (rules: FilterRule[]) => void
  onConjunctionChange: (conjunction: 'and' | 'or') => void
  onSaveAsChip: () => void
  accentColor?: string
}

export function NotionFilterPanel({
  rules,
  conjunction,
  attributes,
  onRulesChange,
  onConjunctionChange,
  onSaveAsChip,
  accentColor,
}: NotionFilterPanelProps) {
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

  return (
    <div
      className="mx-4 rounded-xl p-4"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      {/* 규칙 목록 */}
      <div className="flex flex-col gap-2">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            {/* conjunction 라벨 (첫 번째 행: Where, 이후: AND/OR 토글) */}
            <div className="w-12 shrink-0 text-right">
              {index === 0 ? (
                <span
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--text-hint)' }}
                >
                  Where
                </span>
              ) : (
                <button
                  type="button"
                  onClick={toggleConjunction}
                  className="rounded-md px-1.5 py-0.5 text-[12px] font-semibold transition-colors"
                  style={{
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

      {/* 하단 액션 */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={handleAddRule}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
          style={{ color: 'var(--text-sub)' }}
        >
          <Plus size={14} />
          필터 추가
        </button>

        {rules.length > 0 && (
          <button
            type="button"
            onClick={onSaveAsChip}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={{ color: 'var(--text-sub)' }}
          >
            <Save size={14} />
            칩으로 저장
          </button>
        )}
      </div>
    </div>
  )
}
