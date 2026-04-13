'use client'

import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface BubblePickerSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbles: Bubble[]
  /** 선택된 대상 수 (표시용) */
  selectedCount: number
  /** 버블 선택 시 콜백 */
  onSelect: (bubbleId: string) => void
}

export function BubblePickerSheet({
  isOpen,
  onClose,
  bubbles,
  selectedCount,
  onSelect,
}: BubblePickerSheetProps) {
  const router = useRouter()

  const handleSelect = useCallback((bubbleId: string) => {
    onSelect(bubbleId)
    onClose()
  }, [onSelect, onClose])

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-4 pb-6 pt-2">
        <p className="mb-4 text-[15px] font-bold" style={{ color: 'var(--text)' }}>
          {selectedCount}개를 어디에 추가할까요?
        </p>

        <div className="flex flex-col">
          {bubbles.map((bubble) => (
            <button
              key={bubble.id}
              type="button"
              onClick={() => handleSelect(bubble.id)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors active:scale-[0.98]"
              style={{ backgroundColor: 'transparent' }}
            >
              {/* 버블 아이콘 */}
              <div
                className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)',
                  color: '#FFFFFF',
                }}
              >
                <BubbleIcon icon={bubble.icon} size={20} />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.name}
                </p>
                {bubble.description && (
                  <p className="truncate text-[12px]" style={{ color: 'var(--text-hint)' }}>
                    {bubble.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 새 버블 만들기 */}
        <button
          type="button"
          onClick={() => { onClose(); router.push('/bubbles/create') }}
          className="mt-2 flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-3 py-3 transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}
        >
          <div
            className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <Plus size={20} style={{ color: 'var(--text-hint)' }} />
          </div>
          <span className="text-[14px] font-medium">새 버블 만들기</span>
        </button>
      </div>
    </BottomSheet>
  )
}
