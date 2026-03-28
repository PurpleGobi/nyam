'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Toast } from '@/presentation/components/ui/toast'
import { BubbleSelectList } from './bubble-select-list'

interface BubbleSelectItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isShared: boolean
  canShare: boolean
  blockReason: string | null
}

interface ShareToBubbleSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbles: BubbleSelectItem[]
  onShareMultiple: (bubbleIds: string[]) => Promise<void>
}

export function ShareToBubbleSheet({ isOpen, onClose, bubbles, onShareMultiple }: ShareToBubbleSheetProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSharing, setIsSharing] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  if (!isOpen) return null

  const toggleBubble = (bubbleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(bubbleId)) {
        next.delete(bubbleId)
      } else {
        next.add(bubbleId)
      }
      return next
    })
  }

  const handleShare = async () => {
    if (selectedIds.size === 0 || isSharing) return
    setIsSharing(true)
    try {
      const count = selectedIds.size
      await onShareMultiple(Array.from(selectedIds))
      setSelectedIds(new Set())
      setToastMessage(`${count}개 버블에 공유했어요`)
      setToastVisible(true)
      setTimeout(() => onClose(), 1500)
    } finally {
      setIsSharing(false)
    }
  }

  const selectableCount = selectedIds.size

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="flex w-full max-w-[430px] flex-col rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '70vh' }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2">
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)' }}>버블에 공유</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        {/* 버블 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: '40vh' }}>
          <BubbleSelectList
            bubbles={bubbles}
            selectedIds={selectedIds}
            onToggle={toggleBubble}
          />
        </div>

        {/* CTA 버튼 */}
        <div className="px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={selectableCount === 0 || isSharing}
            className="w-full rounded-xl py-[14px] text-[15px] font-bold transition-opacity active:opacity-80 disabled:pointer-events-none"
            style={{
              backgroundColor: selectableCount > 0 ? 'var(--accent-social)' : 'var(--bg-section)',
              color: selectableCount > 0 ? '#FFFFFF' : 'var(--text-hint)',
            }}
          >
            {selectableCount > 0 ? `공유 (${selectableCount}개)` : '버블을 선택해주세요'}
          </button>
        </div>
      </div>
      {toastMessage && (
        <Toast message={toastMessage} visible={toastVisible} onHide={() => { setToastVisible(false); setToastMessage(null) }} />
      )}
    </div>
  )
}
