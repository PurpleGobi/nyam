'use client'

import { useRef, useCallback } from 'react'
import { Camera, ImageIcon, X, Loader2, AlertCircle } from 'lucide-react'
import type { PendingPhoto } from '@/domain/entities/record-photo'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

interface PhotoPickerProps {
  photos: PendingPhoto[]
  onAddFiles: (files: File[]) => void
  onRemovePhoto: (photoId: string) => void
  isUploading: boolean
  isMaxReached: boolean
  theme: 'food' | 'wine'
}

export function PhotoPicker({
  photos,
  onAddFiles,
  onRemovePhoto,
  isUploading,
  isMaxReached,
  theme,
}: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const accentVar = theme === 'food' ? '--accent-food' : '--accent-wine'

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      onAddFiles(Array.from(fileList))
    },
    [onAddFiles],
  )

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
          사진 ({photos.length}/{PHOTO_CONSTANTS.MAX_PHOTOS})
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {/* 카메라 버튼 */}
        {!isMaxReached && (
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 transition-colors active:bg-[var(--border)]"
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '10px',
              border: '1.5px dashed var(--border)',
              backgroundColor: 'var(--bg-card)',
            }}
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
          >
            <Camera size={22} style={{ color: 'var(--text-hint)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>촬영</span>
          </button>
        )}

        {/* 갤러리 버튼 */}
        {!isMaxReached && (
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 transition-colors active:bg-[var(--border)]"
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '10px',
              border: '1.5px dashed var(--border)',
              backgroundColor: 'var(--bg-card)',
            }}
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageIcon size={22} style={{ color: 'var(--text-hint)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>앨범</span>
          </button>
        )}

        {/* 미리보기 */}
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative overflow-hidden"
            style={{ aspectRatio: '1 / 1', borderRadius: '10px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL은 next/image 사용 불가 */}
            <img
              src={photo.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />

            {/* 순서 번호 */}
            <div
              className="absolute bottom-1 left-1 flex items-center justify-center"
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              {photo.orderIndex + 1}
            </div>

            {/* 삭제 버튼 */}
            <button
              type="button"
              className="absolute right-1 top-1 flex items-center justify-center"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
              onClick={() => onRemovePhoto(photo.id)}
            >
              <X size={14} color="#FFFFFF" />
            </button>

            {/* 업로드 상태 오버레이 */}
            {photo.status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <Loader2 size={24} color="#FFFFFF" className="animate-spin" />
              </div>
            )}
            {photo.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(185,28,28,0.3)' }}>
                <AlertCircle size={24} color="#FFFFFF" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={PHOTO_CONSTANTS.ACCEPTED_TYPES.join(',')}
        multiple
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        className="hidden"
      />
    </div>
  )
}
