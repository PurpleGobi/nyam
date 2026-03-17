'use client'

import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

interface AiQuestionCardProps {
  question: string
  options: string[]
  type: 'select' | 'freetext'
  value: string
  onChange: (value: string) => void
}

export function AiQuestionCard({ question, options, type, value, onChange }: AiQuestionCardProps) {
  const [customInput, setCustomInput] = useState('')
  const isCustomSelected = value !== '' && !options.includes(value)

  if (type === 'freetext') {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
        <p className="text-base font-semibold text-[var(--color-neutral-800)]">
          {question}
        </p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="자유롭게 작성해주세요..."
          rows={3}
          className="w-full resize-none rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-sm text-[var(--color-neutral-800)] placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none focus:ring-1 focus:ring-[#FF6038]/30"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
      <p className="text-base font-semibold text-[var(--color-neutral-800)]">
        {question}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          if (option === '직접 입력') return null
          const isSelected = value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-[#FF6038] text-white'
                  : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* Custom input toggle */}
      {options.includes('직접 입력') && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isCustomSelected) {
                onChange(customInput || '')
              }
            }}
            className={cn(
              'self-start rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isCustomSelected
                ? 'bg-[#FF6038]/10 text-[#FF6038] border border-[#FF6038]/30'
                : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]',
            )}
          >
            직접 입력
          </button>
          {isCustomSelected && (
            <input
              type="text"
              value={value}
              onChange={(e) => {
                setCustomInput(e.target.value)
                onChange(e.target.value)
              }}
              placeholder="직접 입력해주세요..."
              className="w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-2.5 text-sm text-[var(--color-neutral-800)] placeholder:text-[var(--color-neutral-400)] focus:border-[#FF6038] focus:outline-none focus:ring-1 focus:ring-[#FF6038]/30"
              autoFocus
            />
          )}
        </div>
      )}
    </div>
  )
}
