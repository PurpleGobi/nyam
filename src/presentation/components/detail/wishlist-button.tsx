'use client'

import { useRef, useCallback } from 'react'
import { Heart } from 'lucide-react'

interface WishlistButtonProps {
  isWishlisted: boolean
  onToggle: () => void
  /** 히어로 위치에서는 흰색 아이콘, 카드에서는 기본 색상 */
  variant?: 'hero' | 'card'
  size?: number
}

export function WishlistButton({
  isWishlisted,
  onToggle,
  variant = 'card',
  size = 20,
}: WishlistButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback(() => {
    const el = btnRef.current
    if (el) {
      el.classList.remove('wishlist-add', 'wishlist-remove')
      // Force reflow to restart animation
      void el.offsetWidth
      el.classList.add(isWishlisted ? 'wishlist-remove' : 'wishlist-add')
    }
    onToggle()
  }, [isWishlisted, onToggle])

  const color = variant === 'hero'
    ? (isWishlisted ? '#FF6038' : 'rgba(255,255,255,0.85)')
    : (isWishlisted ? '#FF6038' : 'var(--text-hint)')

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center"
    >
      <Heart
        size={size}
        style={{ color }}
        fill={isWishlisted ? color : 'transparent'}
      />
    </button>
  )
}
