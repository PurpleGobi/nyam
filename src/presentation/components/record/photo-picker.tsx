'use client'

import { useRef, useCallback, useState } from 'react'
import { Camera, ImageIcon, X, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import type { PendingPhoto } from '@/domain/entities/record-photo'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { PhotoCropEditor } from '@/presentation/components/record/photo-crop-editor'

interface PhotoPickerProps {
  photos: PendingPhoto[]
  onAddFiles: (files: File[]) => void
  onRemovePhoto: (photoId: string) => void
  onReplacePhoto?: (photoId: string, newFile: File) => void
  onTogglePublic?: (photoId: string) => void
  isUploading: boolean
  isMaxReached: boolean
  theme: 'food' | 'wine'
}

export function PhotoPicker({
  photos,
  onAddFiles,
  onRemovePhoto,
  onReplacePhoto,
  onTogglePublic,
  isUploading,
  isMaxReached,
  theme,
}: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<PendingPhoto | null>(null)

  const accentVar = theme === 'food' ? '--accent-food' : '--accent-wine'

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      onAddFiles(Array.from(fileList))
    },
    [onAddFiles],
  )

  const handleThumbnailClick = useCallback(
    (photo: PendingPhoto) => {
      if (!onReplacePhoto) return
      if (photo.status === 'uploading') return
      setEditingPhoto(photo)
    },
    [onReplacePhoto],
  )

  const handleCropDone = useCallback(
    (croppedFile: File) => {
      if (editingPhoto && onReplacePhoto) {
        onReplacePhoto(editingPhoto.id, croppedFile)
      }
      setEditingPhoto(null)
    },
    [editingPhoto, onReplacePhoto],
  )

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex flex-col gap-1">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
          사진 ({photos.length}/{PHOTO_CONSTANTS.MAX_PHOTOS})
        </span>
        {photos.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            사진은 기본 비공개 · 탭하여 편집/공개 전환
          </span>
        )}
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
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '10px',
              cursor: onReplacePhoto ? 'pointer' : undefined,
            }}
            onClick={() => handleThumbnailClick(photo)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL은 next/image 사용 불가 */}
            <img
              src={photo.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />

            {/* 공개/비공개 토글 */}
            {onTogglePublic && (
              <button
                type="button"
                className="absolute bottom-1 left-1 flex items-center gap-0.5"
                style={{
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  backgroundColor: photo.isPublic ? 'rgba(34,197,94,0.85)' : 'rgba(0,0,0,0.55)',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
                onClick={(e) => { e.stopPropagation(); onTogglePublic(photo.id) }}
              >
                {photo.isPublic ? <Eye size={10} /> : <EyeOff size={10} />}
                {photo.isPublic ? '공개' : '비공개'}
              </button>
            )}

            {/* 순서 번호 (공개 토글 없을 때만) */}
            {!onTogglePublic && (
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
            )}

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
              onClick={(e) => { e.stopPropagation(); onRemovePhoto(photo.id) }}
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

      {/* 크롭 에디터 모달 */}
      {editingPhoto && (
        <PhotoCropEditor
          imageUrl={editingPhoto.previewUrl}
          onDone={handleCropDone}
          onCancel={() => setEditingPhoto(null)}
        />
      )}
    </div>
  )
}
