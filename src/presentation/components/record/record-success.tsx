'use client'

import { CheckCircle, Share2 } from 'lucide-react'

interface RecordSuccessProps {
  variant: 'food' | 'wine'
  targetName: string
  targetMeta: string
  photoError?: string | null
  exifWarning?: string | null
  onAddMore: () => void
  onAddAnother: () => void
  onGoHome: () => void
  onShareToBubble?: () => void
}

export function RecordSuccess({
  variant,
  targetName,
  targetMeta,
  photoError,
  exifWarning,
  onAddMore,
  onAddAnother,
  onGoHome,
  onShareToBubble,
}: RecordSuccessProps) {
  const accentColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <CheckCircle size={48} style={{ color: accentColor }} />

      <h2
        className="mt-4"
        style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}
      >
        추가되었습니다!
      </h2>

      <p
        className="mt-1"
        style={{ fontSize: '14px', color: 'var(--text-sub)' }}
      >
        {targetName} · {targetMeta}
      </p>

      {exifWarning && (
        <p
          className="mt-2 text-center"
          style={{ fontSize: '12px', color: 'var(--text-hint)', lineHeight: 1.4 }}
        >
          {exifWarning}
        </p>
      )}

      {photoError && (
        <p
          className="mt-3 text-center"
          style={{ fontSize: '12px', color: 'var(--destructive)', lineHeight: 1.4 }}
        >
          {photoError}
        </p>
      )}

      <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
        <button
          type="button"
          onClick={onAddMore}
          className="flex w-full items-center justify-center transition-opacity active:opacity-80"
          style={{
            height: '48px',
            borderRadius: 'var(--r-md)',
            backgroundColor: accentColor,
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          내용 추가하기
        </button>

        {onShareToBubble && (
          <button
            type="button"
            onClick={onShareToBubble}
            className="flex w-full items-center justify-center gap-2 transition-opacity active:opacity-80"
            style={{
              height: '48px',
              borderRadius: 'var(--r-md)',
              backgroundColor: 'transparent',
              border: '1.5px solid var(--accent-social)',
              color: 'var(--accent-social)',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            <Share2 size={16} /> 버블에 공유
          </button>
        )}

        <button
          type="button"
          onClick={onAddAnother}
          className="flex w-full items-center justify-center transition-opacity active:opacity-80"
          style={{
            height: '48px',
            borderRadius: 'var(--r-md)',
            backgroundColor: 'transparent',
            border: `1.5px solid ${accentColor}`,
            color: accentColor,
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          한 곳 더 추가
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="flex w-full items-center justify-center transition-opacity active:opacity-80"
          style={{
            height: '44px',
            color: 'var(--text-sub)',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
