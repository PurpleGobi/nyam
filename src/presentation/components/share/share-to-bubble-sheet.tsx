'use client'

import { useState } from 'react'
import { useToast } from '@/presentation/components/ui/toast'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'
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
  const { showToast } = useToast()

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
      showToast(`${count}개 버블에 공유했어요`)
      onClose()
    } finally {
      setIsSharing(false)
    }
  }

  const selectableCount = selectedIds.size

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="버블에 공유" maxHeight="70vh">
      {/* 버블 목록 */}
      <BubbleSelectList
        bubbles={bubbles}
        selectedIds={selectedIds}
        onToggle={toggleBubble}
      />

      {/* CTA 버튼 */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleShare}
          disabled={selectableCount === 0 || isSharing}
          className="w-full rounded-xl py-[14px] text-[15px] font-bold transition-opacity active:opacity-80 disabled:pointer-events-none"
          style={{
            backgroundColor: selectableCount > 0 ? 'var(--accent-social)' : 'var(--bg-section)',
            color: selectableCount > 0 ? 'var(--text-inverse)' : 'var(--text-hint)',
          }}
        >
          {selectableCount > 0 ? `공유 (${selectableCount}개)` : '버블을 선택해주세요'}
        </button>
      </div>
    </BottomSheet>
  )
}
