'use client'

import { Heart } from 'lucide-react'

interface WishlistButtonProps {
  isWishlisted: boolean
  onToggle: () => void
  variant?: 'hero' | 'card'
  size?: number
}

export function WishlistButton({
  isWishlisted,
  onToggle,
  variant = 'card',
  size = 20,
}: WishlistButtonProps) {
  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          width: '36px',
          height: '36px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Heart
          size={size}
          color="#FFFFFF"
          fill={isWishlisted ? '#FFFFFF' : 'transparent'}
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-center transition-transform active:scale-90"
    >
      <Heart
        size={size}
        color={isWishlisted ? 'var(--negative)' : 'var(--text-hint)'}
        fill={isWishlisted ? 'var(--negative)' : 'transparent'}
      />
    </button>
  )
}
