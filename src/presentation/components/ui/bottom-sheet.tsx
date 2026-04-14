'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  /** 시트 제목 (필수) */
  title: string
  children: ReactNode
  /** 최대 높이 (기본 75vh) */
  maxHeight?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div
        className="bottom-sheet"
        style={maxHeight ? { maxHeight } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <span className="bottom-sheet-title">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity active:opacity-70"
            style={{ backgroundColor: 'var(--bg-section)' }}
          >
            <X size={16} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {children}
        </div>
      </div>
    </>
  )
}
