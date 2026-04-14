'use client'

import { useRouter } from 'next/navigation'
import { Users, ChevronLeft, Settings } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleMiniHeaderProps {
  bubbleId: string
  name: string
  description: string | null
  icon: string | null
  iconBgColor: string | null
  memberCount: number
  /** 뒤로가기 표시 여부 (상세페이지에서 true) */
  showBack?: boolean
}

/**
 * 버블 미니 헤더 — 버블 상세 + 버블 컨텍스트 상세페이지에서 공용.
 * 스티키 영역에 1줄로 표시되어 현재 버블 컨텍스트를 알려줌.
 */
export function BubbleMiniHeader({
  bubbleId,
  name,
  description,
  icon,
  iconBgColor,
  memberCount,
  showBack = false,
}: BubbleMiniHeaderProps) {
  const router = useRouter()

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5"
      style={{ backgroundColor: 'var(--accent-social-light)', borderBottom: '1px solid var(--border)' }}
    >
      {showBack && (
        <button
          type="button"
          onClick={() => router.push(`/bubbles/${bubbleId}`)}
          className="flex shrink-0 items-center justify-center"
          style={{ color: 'var(--accent-social)' }}
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <div
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-md"
        style={{ backgroundColor: iconBgColor ?? 'var(--accent-social)', color: '#FFFFFF' }}
      >
        <BubbleIcon icon={icon} size={12} />
      </div>
      <button
        type="button"
        onClick={() => router.push(`/bubbles/${bubbleId}`)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{name}</span>
        {description && (
          <span className="ml-1.5 truncate text-[10px]" style={{ color: 'var(--text-hint)' }}>{description}</span>
        )}
      </button>
      <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold" style={{ color: 'var(--accent-social)' }}>
        <Users size={10} />
        {memberCount}
      </span>
      <button
        type="button"
        onClick={() => router.push(`/bubbles/${bubbleId}/settings`)}
        className="flex shrink-0 items-center justify-center"
        style={{ color: 'var(--text-hint)', padding: '2px' }}
      >
        <Settings size={14} />
      </button>
    </div>
  )
}
