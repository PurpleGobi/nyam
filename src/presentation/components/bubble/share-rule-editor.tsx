'use client'

import { useState } from 'react'
import { Filter, Zap } from 'lucide-react'
import type { BubbleShareRule } from '@/domain/entities/bubble'
import type { FilterRule } from '@/domain/entities/saved-filter'
import type { FilterAttribute } from '@/domain/entities/filter-config'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { FilterSystem } from '@/presentation/components/ui/filter-system'

/* ================================================================
   ShareRuleEditor — 버블 공유 규칙 설정 UI
   "모든 항목 공유" 토글 + "조건부" 시 FilterSystem 재사용
   ================================================================ */

interface ShareRuleEditorProps {
  value: BubbleShareRule | null
  onChange: (rule: BubbleShareRule | null) => void
  focusType?: 'restaurant' | 'wine' | 'all'
}

function getAttributes(focusType: string): FilterAttribute[] {
  switch (focusType) {
    case 'restaurant': return RESTAURANT_FILTER_ATTRIBUTES
    case 'wine': return WINE_FILTER_ATTRIBUTES
    default: return [...RESTAURANT_FILTER_ATTRIBUTES, ...WINE_FILTER_ATTRIBUTES]
  }
}

export function ShareRuleEditor({ value, onChange, focusType = 'all' }: ShareRuleEditorProps) {
  const mode = value?.mode ?? 'all'
  const [filterTab, setFilterTab] = useState<'restaurant' | 'wine'>(
    focusType === 'wine' ? 'wine' : 'restaurant',
  )
  const attributes = focusType === 'all' ? getAttributes(filterTab) : getAttributes(focusType)

  const handleModeChange = (newMode: 'all' | 'filtered') => {
    if (newMode === 'all') {
      onChange({ mode: 'all', rules: [], conjunction: 'and' })
    } else {
      onChange({ mode: 'filtered', rules: value?.rules ?? [], conjunction: value?.conjunction ?? 'and' })
    }
  }

  const handleRulesChange = (rules: FilterRule[]) => {
    onChange({
      mode: 'filtered',
      rules: rules.map((r) => ({
        conjunction: r.conjunction,
        attribute: r.attribute,
        operator: r.operator,
        value: r.value,
      })),
      conjunction: value?.conjunction ?? 'and',
    })
  }

  const handleConjunctionChange = (conjunction: 'and' | 'or') => {
    onChange({ ...value, mode: 'filtered', rules: value?.rules ?? [], conjunction })
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-[var(--text-sub)]">공유 규칙</span>

      {/* 모드 선택 */}
      <div className="flex gap-2">
        {([
          { m: 'all' as const, label: '모든 항목 공유', icon: Zap, desc: '새 기록이\n자동으로 공유' },
          { m: 'filtered' as const, label: '조건부 공유', icon: Filter, desc: '필터 조건에\n맞는 기록만' },
        ]).map(({ m, label, icon: Icon, desc }) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 transition-colors"
            style={{
              backgroundColor: mode === m ? 'var(--accent-social)' : 'var(--bg-card)',
              color: mode === m ? '#FFFFFF' : 'var(--text-sub)',
              border: `1.5px solid ${mode === m ? 'var(--accent-social)' : 'var(--border)'}`,
            }}
          >
            <Icon size={18} />
            <span className="text-[12px] font-semibold">{label}</span>
            <span className="whitespace-pre-line text-center text-[10px] opacity-70">{desc}</span>
          </button>
        ))}
      </div>

      {/* 조건부 모드일 때 필터 빌더 */}
      {mode === 'filtered' && (
        <div className="mt-1 flex flex-col gap-2">
          {/* focusType이 all이면 식당/와인 탭 */}
          {focusType === 'all' && (
            <div className="flex gap-1">
              {(['restaurant', 'wine'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
                  style={{
                    backgroundColor: filterTab === tab ? 'var(--accent-social)' : 'var(--bg-card)',
                    color: filterTab === tab ? '#FFFFFF' : 'var(--text-sub)',
                    border: `1px solid ${filterTab === tab ? 'var(--accent-social)' : 'var(--border)'}`,
                  }}
                >
                  {tab === 'restaurant' ? '식당' : '와인'}
                </button>
              ))}
            </div>
          )}

          <FilterSystem
            rules={(value?.rules ?? []) as FilterRule[]}
            conjunction={value?.conjunction ?? 'and'}
            attributes={attributes}
            onRulesChange={handleRulesChange}
            onConjunctionChange={handleConjunctionChange}
            accentColor="var(--accent-social)"
          />

          {(value?.rules?.length ?? 0) === 0 && (
            <p className="text-[11px] text-[var(--text-hint)]">
              조건을 추가하면 해당 조건에 맞는 기록만 자동으로 공유됩니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
