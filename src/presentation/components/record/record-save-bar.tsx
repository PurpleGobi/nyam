'use client'

import { Loader2 } from 'lucide-react'

interface RecordSaveBarProps {
  variant: 'food' | 'wine'
  onSave: () => void
  isLoading: boolean
  disabled?: boolean
  label?: string
}

export function RecordSaveBar({ variant, onSave, isLoading, disabled = false, label = '저장' }: RecordSaveBarProps) {
  const bgColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div
      className="sticky bottom-0 w-full"
      style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || isLoading}
        className="flex w-full items-center justify-center transition-opacity"
        style={{
          height: '48px',
          borderRadius: 'var(--r-md)',
          backgroundColor: bgColor,
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 700,
          opacity: disabled || isLoading ? 0.5 : 1,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : label}
      </button>
    </div>
  )
}
