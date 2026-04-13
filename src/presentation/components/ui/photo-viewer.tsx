'use client'

import { useState, useCallback, useEffect } from 'react'
import { PopupWindow } from '@/presentation/components/ui/popup-window'

interface PhotoViewerProps {
  photos: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

/**
 * 공통 사진 풀스크린 뷰어
 * PopupWindow 기반 — 블러 배경, 클릭으로 다음 사진 순환, Escape로 닫기
 * 여러 장일 때 dot indicator 표시
 */
export function PhotoViewer({ photos, initialIndex = 0, isOpen, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // isOpen 또는 initialIndex 변경 시 동기화
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex)
  }, [isOpen, initialIndex])

  const handleClick = useCallback(() => {
    if (photos.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % photos.length)
  }, [photos.length])

  if (!isOpen || photos.length === 0) return null

  const safeIndex = currentIndex < photos.length ? currentIndex : 0

  return (
    <PopupWindow isOpen={isOpen} onClose={onClose}>
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 200, pointerEvents: 'none' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[safeIndex]}
          alt=""
          onClick={handleClick}
          className="rounded-2xl shadow-lg"
          style={{ maxWidth: 'min(90vw, 500px)', maxHeight: '70vh', objectFit: 'contain', cursor: photos.length > 1 ? 'pointer' : 'default', pointerEvents: 'auto' }}
          draggable={false}
        />

        {/* dot indicator */}
        {photos.length > 1 && (
          <div
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-1.5"
            style={{ pointerEvents: 'none' }}
          >
            {photos.map((_, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: i === safeIndex ? '16px' : '6px',
                  height: '6px',
                  backgroundColor: i === safeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  borderRadius: '3px',
                  transition: 'all 150ms ease-out',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </PopupWindow>
  )
}
