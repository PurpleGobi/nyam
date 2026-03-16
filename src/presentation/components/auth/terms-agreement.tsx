'use client'

import { useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface TermsAgreementProps {
  onAllAgreed: () => void
}

interface TermItem {
  id: string
  label: string
  required: boolean
  url?: string
}

const TERMS: TermItem[] = [
  { id: 'age', label: '만 14세 이상입니다', required: true },
  { id: 'service', label: '서비스 이용약관 동의', required: true, url: '/terms/service' },
  { id: 'privacy', label: '개인정보 처리방침 동의', required: true, url: '/terms/privacy' },
  { id: 'marketing', label: '마케팅 정보 수신 동의', required: false },
]

export function TermsAgreement({ onAllAgreed }: TermsAgreementProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const allChecked = checked.size === TERMS.length
  const requiredAllChecked = TERMS.filter(t => t.required).every(t => checked.has(t.id))

  const toggleAll = () => {
    if (allChecked) {
      setChecked(new Set())
    } else {
      setChecked(new Set(TERMS.map(t => t.id)))
    }
  }

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* All agree */}
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          'flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors',
          allChecked
            ? 'border-[#FF6038] bg-[#FF6038]/5'
            : 'border-neutral-200',
        )}
      >
        <div className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
          allChecked ? 'bg-[#FF6038]' : 'border-2 border-neutral-300',
        )}>
          {allChecked && <Check className="h-4 w-4 text-white" />}
        </div>
        <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
          전체 동의하기
        </span>
      </button>

      {/* Individual terms */}
      <div className="flex flex-col gap-1 px-1">
        {TERMS.map(term => (
          <div key={term.id} className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => toggle(term.id)}
              className="flex items-center gap-3 flex-1"
            >
              <div className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
                checked.has(term.id) ? 'bg-[#FF6038]' : 'border-2 border-neutral-300',
              )}>
                {checked.has(term.id) && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm text-[var(--color-neutral-700)]">
                {term.required ? (
                  <span className="text-[#FF6038] mr-1">[필수]</span>
                ) : (
                  <span className="text-neutral-400 mr-1">[선택]</span>
                )}
                {term.label}
              </span>
            </button>
            {term.url && (
              <a
                href={term.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-neutral-400 hover:text-neutral-600"
              >
                <ChevronRight className="h-4 w-4" />
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={onAllAgreed}
        disabled={!requiredAllChecked}
        className="w-full rounded-xl bg-[#FF6038] py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
      >
        동의하고 계속하기
      </button>
    </div>
  )
}
