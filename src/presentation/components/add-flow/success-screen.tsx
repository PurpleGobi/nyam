'use client'

import { CheckCircle } from 'lucide-react'

interface SuccessScreenProps {
  variant: 'food' | 'wine'
  targetName: string
  targetMeta: string
  onAddDetail: () => void
  onAddAnother: () => void
  onGoHome: () => void
}

export function SuccessScreen({
  variant, targetName, targetMeta, onAddDetail, onAddAnother, onGoHome,
}: SuccessScreenProps) {
  const accentColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <CheckCircle size={48} style={{ color: accentColor }} />
      <h2 className="mt-4" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
        추가되었습니다!
      </h2>
      <p className="mt-1" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
        {targetName} · {targetMeta}
      </p>

      <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
        <button type="button" onClick={onAddDetail}
          className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white"
          style={{ backgroundColor: accentColor }}>
          내용 추가하기
        </button>
        <button type="button" onClick={onAddAnother}
          className="w-full rounded-xl py-3.5 text-[15px] font-medium"
          style={{ border: `1.5px solid ${accentColor}`, color: accentColor }}>
          한 곳 더 추가
        </button>
        <button type="button" onClick={onGoHome}
          className="w-full py-3 text-[14px] font-medium text-[var(--text-sub)]">
          홈으로
        </button>
      </div>
    </div>
  )
}
