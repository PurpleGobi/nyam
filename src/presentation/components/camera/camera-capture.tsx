'use client'

import { useRef, useCallback } from 'react'
import { Camera, ImagePlus, List, Wine, UtensilsCrossed } from 'lucide-react'

interface CameraCaptureProps {
  targetType: 'restaurant' | 'wine'
  onCapture: (file: File) => void
  onSearchFallback: () => void
  onShelfMode?: () => void
  onReceiptMode?: () => void
  isRecognizing: boolean
  /** 업로드 완료된 사진 URL — 미리보기용 */
  previewUrl?: string | null
}

export function CameraCapture({
  targetType,
  onCapture,
  onSearchFallback,
  onShelfMode,
  onReceiptMode,
  isRecognizing,
  previewUrl,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const handleCameraCapture = useCallback(() => {
    if (inputRef.current) {
      if (isMobile) {
        inputRef.current.setAttribute('capture', 'environment')
      } else {
        inputRef.current.removeAttribute('capture')
      }
      inputRef.current.click()
    }
  }, [isMobile])

  const handleAlbumClick = useCallback(() => {
    if (albumInputRef.current) {
      albumInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      onCapture(file)
      e.target.value = ''
    },
    [onCapture],
  )

  const isRestaurant = targetType === 'restaurant'
  const IconComponent = isRestaurant ? UtensilsCrossed : Wine

  return (
    <div className="flex flex-col items-center px-6 py-8">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={albumInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative mb-4 flex aspect-square w-full max-w-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            {isRecognizing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
                <p className="mt-3 text-[13px] font-medium text-white">{isRestaurant ? '식당 검색 중...' : '와인 검색 중...'}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <IconComponent
              size={48}
              className={isRestaurant ? 'text-[var(--accent-food)]' : 'text-[var(--accent-wine)]'}
            />
            <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
              {isRestaurant ? '음식 사진을 촬영하세요' : '라벨을 맞춰주세요'}
            </p>

            <button
              type="button"
              onClick={handleCameraCapture}
              disabled={isRecognizing}
              className={`mt-6 flex h-16 w-16 items-center justify-center rounded-full disabled:opacity-50 ${
                isRestaurant ? 'bg-[var(--accent-food)]' : 'bg-[var(--accent-wine)]'
              }`}
            >
              {isRecognizing ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={28} color="#FFFFFF" />
              )}
            </button>
          </>
        )}
      </div>

      <p className="mb-6 text-center text-[13px] text-[var(--text-sub)]">
        {isRestaurant
          ? '음식 또는 식당 사진을 촬영하면 자동으로 인식합니다'
          : '와인 라벨을 촬영하면 자동으로 인식합니다'}
      </p>

      <div className={`flex w-full justify-center gap-3 ${targetType === 'wine' ? 'flex-wrap' : ''}`}>
        <button
          type="button"
          onClick={handleAlbumClick}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)]"
        >
          <ImagePlus size={18} />
          앨범에서 추가
        </button>

        <button
          type="button"
          onClick={onSearchFallback}
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)]"
        >
          <List size={18} />
          {isRestaurant ? '목록에서 추가' : '이름으로 검색'}
        </button>

        {targetType === 'wine' && onShelfMode && (
          <button
            type="button"
            onClick={onShelfMode}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)]"
          >
            진열장
          </button>
        )}
        {targetType === 'wine' && onReceiptMode && (
          <button
            type="button"
            onClick={onReceiptMode}
            className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)]"
          >
            영수증
          </button>
        )}
      </div>
    </div>
  )
}
