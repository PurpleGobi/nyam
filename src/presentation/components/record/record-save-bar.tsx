'use client'

import { Loader2, Trash2 } from 'lucide-react'

interface RecordSaveBarProps {
  variant: 'food' | 'wine'
  onSave: () => void
  isLoading: boolean
  disabled?: boolean
  label?: string
  /** 수정 모드일 때 삭제 콜백 */
  onDelete?: () => void
  isDeleting?: boolean
}

export function RecordSaveBar({ variant, onSave, isLoading, disabled = false, label = '저장', onDelete, isDeleting = false }: RecordSaveBarProps) {
  const bgColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div
      className="sticky bottom-0 w-full"
      style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        zIndex: 20,
      }}
    >
      <div className="flex items-center gap-3">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || isLoading}
            className="flex items-center justify-center shrink-0 transition-opacity"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--negative)',
              color: 'var(--negative)',
              opacity: isDeleting || isLoading ? 0.5 : 1,
              cursor: isDeleting || isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center transition-opacity"
          style={{
            height: '48px',
            borderRadius: 'var(--r-md)',
            backgroundColor: bgColor,
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 700,
            opacity: disabled || isLoading ? 0.5 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : label}
        </button>
      </div>
    </div>
  )
}
