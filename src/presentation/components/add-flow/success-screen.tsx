'use client'

import { Check, Plus, Home } from 'lucide-react'

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accentColor }}>
        <Check size={32} strokeWidth={3} className="text-text-inverse" />
      </div>
      <h2 className="mb-2" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
        추가되었습니다!
      </h2>
      <p className="mt-1" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
        {targetName}{targetMeta ? ` · ${targetMeta}` : ''}
      </p>

      <div className="mt-10 flex w-full max-w-[280px] flex-col gap-3">
        <button type="button" onClick={onAddDetail}
          className="w-full rounded-xl py-3.5 text-[15px] font-semibold"
          style={{ backgroundColor: accentColor, color: 'var(--text-inverse)' }}>
          내용 추가하기
        </button>
        <button type="button" onClick={onAddAnother}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3.5 text-[15px] font-medium text-[var(--text)]">
          <Plus size={16} />
          한 곳 더 추가
        </button>
        <button type="button" onClick={onGoHome}
          className="flex w-full items-center justify-center gap-1.5 py-3 text-[14px] font-medium text-[var(--text-sub)]">
          <Home size={16} />
          홈으로
        </button>
      </div>
    </div>
  )
}
