'use client'

import { Check, ArrowRight, Users } from 'lucide-react'
import type { OnboardingBubbleTemplate } from '@/domain/entities/onboarding'

interface BubbleCreateStepProps {
  templates: OnboardingBubbleTemplate[]
  createdBubbleIds: string[]
  isLoading: boolean
  onCreateBubble: (template: OnboardingBubbleTemplate) => void
  onNext: () => void
}

export function BubbleCreateStep({
  templates,
  createdBubbleIds,
  isLoading,
  onCreateBubble,
  onNext,
}: BubbleCreateStepProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-6 pt-6">
        <h2 className="text-[20px] font-bold" style={{ color: 'var(--text)' }}>
          나만의 버블을 만들어보세요
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-sub)' }}>
          가족, 친구, 직장 동료와 맛집을 공유할 수 있어요
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-6 pb-28">
        {templates.map((t, idx) => {
          const isCreated = idx < createdBubbleIds.length
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !isCreated && !isLoading && onCreateBubble(t)}
              disabled={isCreated || isLoading}
              className="flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                backgroundColor: isCreated ? 'var(--accent-social-light)' : 'var(--bg-card)',
                border: `1.5px solid ${isCreated ? 'var(--accent-social)' : 'var(--border)'}`,
              }}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[24px]"
                style={{ backgroundColor: t.iconBgColor }}
              >
                {t.icon}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{t.name}</p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-sub)' }}>{t.description}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <Users size={11} style={{ color: 'var(--text-hint)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>초대 전용</span>
                </div>
              </div>
              {isCreated && (
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--accent-social)' }}
                >
                  <Check size={14} color="#FFFFFF" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ backgroundColor: 'var(--bg)' }}>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5"
        >
          {createdBubbleIds.length > 0 ? '다음' : '건너뛰기'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
