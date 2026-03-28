'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Share2, UtensilsCrossed, Wine } from 'lucide-react'
import { WishlistButton } from '@/presentation/components/detail/wishlist-button'

interface HeroThumbnailData {
  icon: string
  name: string
  backgroundUrl: string | null
  orientation: 'horizontal' | 'vertical'
}

interface HeroCarouselProps {
  photos: string[]
  fallbackIcon: 'restaurant' | 'wine'
  thumbnail: HeroThumbnailData | null
  isWishlisted: boolean
  onWishlistToggle: () => void
  onShare: () => void
}

export function HeroCarousel({
  photos,
  fallbackIcon,
  thumbnail,
  isWishlisted,
  onWishlistToggle,
  onShare,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [thumbHidden, setThumbHidden] = useState(false)
  const touchStartX = useRef(0)
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasPhotos = photos.length > 0
  const IconComponent = fallbackIcon === 'restaurant' ? UtensilsCrossed : Wine

  // 자동 전환 (4초 간격)
  useEffect(() => {
    if (photos.length <= 1) return
    autoTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    }, 4000)
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current) }
  }, [photos.length])

  // 스와이프
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    if (autoTimerRef.current) clearInterval(autoTimerRef.current)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      setCurrentIndex((prev) =>
        diff > 0
          ? (prev + 1) % photos.length
          : (prev - 1 + photos.length) % photos.length,
      )
    }
    // 재시작 자동전환
    if (photos.length > 1) {
      autoTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length)
      }, 4000)
    }
  }, [photos.length])

  // 히어로 썸네일 숨기기
  const handleCarouselClick = useCallback(() => {
    if (thumbnail) setThumbHidden(true)
  }, [thumbnail])

  // 바깥 클릭 시 복원 (document level)
  useEffect(() => {
    if (!thumbHidden) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-hero-carousel]')) {
        setThumbHidden(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [thumbHidden])

  const isHorizontal = thumbnail?.orientation === 'horizontal'

  return (
    <div
      data-hero-carousel
      className="relative w-full overflow-hidden"
      style={{ height: '224px' }}
      onClick={handleCarouselClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasPhotos ? (
        <>
          <div
            className="flex h-full transition-transform duration-[400ms] ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="h-full w-full shrink-0 object-cover"
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

      {/* 히어로 썸네일 */}
      {thumbnail && (
        <div
          className="absolute overflow-hidden"
          style={{
            bottom: '14px',
            left: '16px',
            width: isHorizontal ? '160px' : '110px',
            height: isHorizontal ? '110px' : '160px',
            borderRadius: isHorizontal ? '12px' : '6px',
            border: '2.5px solid rgba(255,255,255,0.85)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            backgroundImage: thumbnail.backgroundUrl ? `url(${thumbnail.backgroundUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: thumbnail.backgroundUrl ? undefined : 'var(--bg-elevated)',
            transform: thumbHidden ? 'translateX(-200px)' : 'translateX(0)',
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center bg-black/30">
            <IconComponent size={28} color="#FFFFFF" />
            <span
              className="mt-1 px-1 text-center"
              style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase' }}
            >
              {thumbnail.name}
            </span>
          </div>
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
  )
}
