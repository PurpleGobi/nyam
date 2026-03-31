'use client'

import { useState, useCallback, useRef } from 'react'
import { Share2, UtensilsCrossed, Wine } from 'lucide-react'
import { WishlistButton } from '@/presentation/components/detail/wishlist-button'
import { PopupWindow } from '@/presentation/components/ui/popup-window'

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

            {/* dot indicator — 넓은 터치 영역으로 순환 */}
            {photos.length > 1 && (
              <button
                type="button"
                className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1.5"
                style={{ padding: '12px 20px' }}
                onClick={(e) => { e.stopPropagation(); goNext() }}
              >
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all"
                    style={{
                      width: i === currentIndex ? '16px' : '6px',
                      height: '6px',
                      backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                      borderRadius: '3px',
                    }}
                  />
                ))}
              </button>
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
      <PopupWindow isOpen={popupIndex !== null} onClose={() => setPopupIndex(null)}>
        {popupIndex !== null && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 200, pointerEvents: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[popupIndex]}
              alt=""
              onClick={handlePopupClick}
              className="rounded-2xl shadow-lg"
              style={{ maxWidth: 'min(90vw, 500px)', maxHeight: '70vh', objectFit: 'contain', cursor: 'pointer', pointerEvents: 'auto' }}
              draggable={false}
            />
          </div>
        )}
      </PopupWindow>
    </>
  )
}
