'use client'

import { useState } from 'react'
import { X, Check, ListPlus } from 'lucide-react'
import { BubbleIcon } from './bubble-icon'

interface AddToBubbleSheetBubble {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  bubbleIconBgColor: string | null
  isIncluded: boolean
}

interface AddToBubbleSheetProps {
  isOpen: boolean
  onClose: () => void
  targetName: string
  bubbles: AddToBubbleSheetBubble[]
  onToggle: (bubbleId: string, include: boolean) => Promise<void>
  isLoading?: boolean
}

export function AddToBubbleSheet({
  isOpen,
  onClose,
  targetName,
  bubbles,
  onToggle,
  isLoading = false,
}: AddToBubbleSheetProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleToggle = async (bubbleId: string, currentlyIncluded: boolean) => {
    if (togglingId) return
    setTogglingId(bubbleId)
    try {
      await onToggle(bubbleId, !currentlyIncluded)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[480px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '70vh' }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <ListPlus size={18} style={{ color: 'var(--accent-social)' }} />
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>리스트에 추가</span>
          </div>
          <button type="button" onClick={onClose} className="p-1">
            <X size={20} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        {/* 대상 이름 */}
        <div className="px-4 pb-2">
          <span className="text-[13px]" style={{ color: 'var(--text-sub)' }}>
            {targetName}
          </span>
        </div>

        {/* 버블 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: '40vh' }}>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : bubbles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <ListPlus size={32} style={{ color: 'var(--text-hint)' }} />
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-sub)' }}>
                아직 버블이 없어요
              </p>
              <p className="text-[12px]" style={{ color: 'var(--text-hint)' }}>
                버블을 만들어보세요!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {bubbles.map((b) => {
                const isToggling = togglingId === b.bubbleId
                return (
                  <button
                    key={b.bubbleId}
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(b.bubbleId, b.isIncluded)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:opacity-70"
                    style={{
                      backgroundColor: b.isIncluded ? 'color-mix(in srgb, var(--accent-social) 8%, transparent)' : 'transparent',
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: b.bubbleIconBgColor ?? 'var(--accent-social-light)' }}
                    >
                      <BubbleIcon icon={b.bubbleIcon} size={18} />
                    </div>
                    <span className="flex-1 text-left text-[14px] font-medium" style={{ color: 'var(--text)' }}>
                      {b.bubbleName}
                    </span>
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                      style={{
                        backgroundColor: b.isIncluded ? 'var(--accent-social)' : 'var(--bg-section)',
                        border: b.isIncluded ? 'none' : '1.5px solid var(--border)',
                      }}
                    >
                      {b.isIncluded && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 하단 여백 (safe area) */}
        <div className="h-8" />
      </div>
    </div>
  )
}
