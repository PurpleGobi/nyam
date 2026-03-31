'use client'

import { useState, useCallback, useRef } from 'react'
import { Share2, UtensilsCrossed, Wine, X } from 'lucide-react'
import { WishlistButton } from '@/presentation/components/detail/wishlist-button'

interface HeroCarouselProps {
  photos: string[]
  fallbackIcon: 'restaurant' | 'wine'
  isWishlisted: boolean
  onWishlistToggle: () => void
  onShare: () => void
}

export function HeroCarousel({
  photos,
  fallbackIcon,
  isWishlisted,
  onWishlistToggle,
  onShare,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [popupIndex, setPopupIndex] = useState<number | null>(null)

  // 터치 스와이프
  const touchStartX = useRef(0)

  // 마우스 드래그
  const mouseStartX = useRef(0)
  const isDragging = useRef(false)

  const hasPhotos = photos.length > 0
  const IconComponent = fallbackIcon === 'restaurant' ? UtensilsCrossed : Wine

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }, [photos.length])

  // 터치
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 40) goNext()
    else if (diff < -40) goPrev()
  }, [goNext, goPrev])

  // 마우스 드래그
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseStartX.current = e.clientX
    isDragging.current = true
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    const diff = mouseStartX.current - e.clientX
    if (diff > 40) goNext()
    else if (diff < -40) goPrev()
  }, [goNext, goPrev])

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false
  }, [])

  // 사진 클릭 → 팝업
  const handlePhotoClick = useCallback((e: React.MouseEvent) => {
    // 드래그 후 mouseup이면 클릭 무시
    if (Math.abs(mouseStartX.current - e.clientX) > 10) return
    setPopupIndex(currentIndex)
  }, [currentIndex])

  // 팝업에서 사진 클릭 → 순환
  const handlePopupClick = useCallback(() => {
    setPopupIndex((prev) => prev !== null ? (prev + 1) % photos.length : null)
  }, [photos.length])

  // 팝업 터치 스와이프
  const popupTouchStartX = useRef(0)
  const handlePopupTouchStart = useCallback((e: React.TouchEvent) => {
    popupTouchStartX.current = e.touches[0].clientX
  }, [])
  const handlePopupTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = popupTouchStartX.current - e.changedTouches[0].clientX
    if (diff > 40) setPopupIndex((prev) => prev !== null ? (prev + 1) % photos.length : null)
    else if (diff < -40) setPopupIndex((prev) => prev !== null ? (prev - 1 + photos.length) % photos.length : null)
  }, [photos.length])

  return (
    <>
      <div
        className="relative w-full overflow-hidden select-none"
        style={{ height: '224px', cursor: hasPhotos ? 'grab' : undefined }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={hasPhotos ? handlePhotoClick : undefined}
      >
        {hasPhotos ? (
          <>
            <div
              className="flex h-full transition-transform duration-[400ms] ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)`, pointerEvents: 'none' }}
            >
              {photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="h-full w-full shrink-0 object-cover"
                  draggable={false}
                />
              ))}
            </div>

            {/* 하단 그라디언트 오버레이 */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{
                height: '80px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
              }}
            />

            {/* dot indicator */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(i) }}
                    className="rounded-full transition-all"
                    style={{
                      width: i === currentIndex ? '16px' : '6px',
                      height: '6px',
                      backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                      borderRadius: '3px',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <IconComponent size={28} style={{ color: 'var(--text-hint)' }} />
          </div>
        )}

        {/* 좋아요/공유 버튼 — 우하단 */}
        <div className="absolute flex gap-3" style={{ bottom: '10px', right: '12px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onShare() }}
          >
            <Share2 size={20} style={{ color: 'rgba(255,255,255,0.85)' }} />
          </button>
          <span onClick={(e) => e.stopPropagation()}>
            <WishlistButton
              isWishlisted={isWishlisted}
              onToggle={onWishlistToggle}
              variant="hero"
              size={20}
            />
          </span>
        </div>
      </div>

      {/* 사진 팝업 */}
      {popupIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onClick={handlePopupClick}
          onTouchStart={handlePopupTouchStart}
          onTouchEnd={handlePopupTouchEnd}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPopupIndex(null) }}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <X size={24} color="#FFFFFF" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[popupIndex]}
            alt=""
            className="max-h-[80vh] max-w-[90vw] object-contain"
            style={{ touchAction: 'pinch-zoom' }}
            draggable={false}
          />

          {/* dot indicator */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === popupIndex ? '8px' : '6px',
                    height: i === popupIndex ? '8px' : '6px',
                    backgroundColor: i === popupIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    transition: 'all 150ms ease-out',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
