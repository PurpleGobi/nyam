'use client'

import { useState } from 'react'
import { Heart, Share2, UtensilsCrossed, Wine } from 'lucide-react'

interface HeroCarouselProps {
  photos: string[]
  fallbackIcon: 'restaurant' | 'wine'
  isWishlisted: boolean
  onWishlistToggle: () => void
  onShare?: () => void
}

export function HeroCarousel({
  photos,
  fallbackIcon,
  isWishlisted,
  onWishlistToggle,
  onShare,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const hasPhotos = photos.length > 0
  const IconComponent = fallbackIcon === 'restaurant' ? UtensilsCrossed : Wine
  const accentColor = fallbackIcon === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="relative w-full" style={{ aspectRatio: '16 / 10' }}>
      {hasPhotos ? (
        <div className="relative h-full w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[currentIndex]}
            alt=""
            className="h-full w-full object-cover"
          />
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? '16px' : '6px',
                    backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <IconComponent size={48} style={{ color: accentColor, opacity: 0.3 }} />
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="absolute right-3 top-3 flex gap-2">
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <Share2 size={18} color="#FFFFFF" />
          </button>
        )}
        <button
          type="button"
          onClick={onWishlistToggle}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
        >
          <Heart
            size={18}
            color="#FFFFFF"
            fill={isWishlisted ? '#FFFFFF' : 'transparent'}
          />
        </button>
      </div>
    </div>
  )
}
