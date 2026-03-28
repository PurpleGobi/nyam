'use client'

import { useState, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RecordPhoto } from '@/domain/entities/record-photo'

interface PhotoGalleryProps {
  photos: RecordPhoto[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const handlePrev = useCallback(() => {
    setFullscreenIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))
  }, [])

  const handleNext = useCallback(() => {
    setFullscreenIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev))
  }, [photos.length])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchEndX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    const SWIPE_THRESHOLD = 50
    if (diff > SWIPE_THRESHOLD) handleNext()
    else if (diff < -SWIPE_THRESHOLD) handlePrev()
  }, [handleNext, handlePrev])

  if (photos.length === 0) return null

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setFullscreenIndex(i)}
            className="shrink-0 overflow-hidden rounded-lg"
            style={{ height: '192px', width: '192px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {fullscreenIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 닫기 버튼 (우상단) */}
          <button
            type="button"
            onClick={() => setFullscreenIndex(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <X size={24} color="#FFFFFF" />
          </button>

          {/* 이전 */}
          {fullscreenIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </button>
          )}

          {/* 다음 */}
          {fullscreenIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <ChevronRight size={24} color="#FFFFFF" />
            </button>
          )}

          {/* 사진 — 핀치 줌 지원 */}
          <div
            className="flex items-center justify-center overflow-auto"
            style={{ touchAction: 'pinch-zoom', maxHeight: '80vh', maxWidth: '90vw' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[fullscreenIndex].url}
              alt=""
              className="max-h-[80vh] max-w-[90vw] object-contain"
              style={{ touchAction: 'pinch-zoom' }}
            />
          </div>

          {/* Dot indicator (하단 중앙) */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: i === fullscreenIndex ? '8px' : '6px',
                    height: i === fullscreenIndex ? '8px' : '6px',
                    backgroundColor: i === fullscreenIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
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
