'use client'

import { useRef, useCallback } from 'react'
import { Heart } from 'lucide-react'

interface BookmarkButtonProps {
  isBookmarked: boolean
  onToggle: () => void
  /** 히어로 위치에서는 흰색 아이콘, 카드에서는 기본 색상 */
  variant?: 'hero' | 'card'
  size?: number
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  variant = 'card',
  size = 20,
}: BookmarkButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(() => {
    const el = btnRef.current
    if (el) {
      el.classList.remove('bookmark-add', 'bookmark-remove')
      // Force reflow to restart animation
      void el.offsetWidth
      el.classList.add(isBookmarked ? 'bookmark-remove' : 'bookmark-add')
    }
    onToggle()
  }, [isBookmarked, onToggle])

  const color = variant === 'hero'
    ? (isBookmarked ? '#FF6038' : 'rgba(255,255,255,0.85)')
    : (isBookmarked ? '#FF6038' : 'var(--text-hint)')

  return (
    <div
      ref={btnRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } }}
      className="flex cursor-pointer items-center justify-center"
    >
      <Heart
        size={size}
        style={{ color }}
        fill={isBookmarked ? color : 'transparent'}
      />
    </div>
  )
}
