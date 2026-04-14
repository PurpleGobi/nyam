'use client'

import { useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface BubblePickerItem {
  id: string
  name: string
  description?: string | null
  icon: string | null
  iconBgColor: string | null
}

interface BubblePickerSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbles: BubblePickerItem[]
  /** 버블 선택 시 콜백 */
  onSelect: (bubbleId: string) => void
  isLoading?: boolean
  /** 버블별 중복 아이템 수 (선택한 아이템 중 이미 해당 버블에 있는 개수) */
  duplicateCounts?: Map<string, number>
  /** 시트 제목 (기본: "어디에 추가할까요?") */
  title?: string
}

export function BubblePickerSheet({
  isOpen,
  onClose,
  bubbles,
  onSelect,
  isLoading = false,
  duplicateCounts,
  title,
}: BubblePickerSheetProps) {
  const router = useRouter()

  const handleSelect = useCallback((bubbleId: string) => {
    onSelect(bubbleId)
    onClose()
  }, [onSelect, onClose])

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title ?? '어디에 추가할까요?'}>
      <div>
        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : bubbles.map((bubble) => {
            const dupCount = duplicateCounts?.get(bubble.id) ?? 0
            return (
              <button
                key={bubble.id}
                type="button"
                onClick={() => handleSelect(bubble.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors active:scale-[0.98]"
                style={{
                  backgroundColor: dupCount > 0 ? 'var(--status-error-light, rgba(239,68,68,0.08))' : 'transparent',
                }}
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
                  {dupCount > 0 ? (
                    <p className="text-[12px] font-medium" style={{ color: 'var(--status-error, #ef4444)' }}>
                      {dupCount}개 이미 등록됨
                    </p>
                  ) : bubble.description ? (
                    <p className="truncate text-[12px]" style={{ color: 'var(--text-hint)' }}>
                      {bubble.description}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* 새 버블 만들기 — 로딩 중엔 숨김 */}
        {!isLoading && (
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
        )}
      </div>
    </BottomSheet>
  )
}
