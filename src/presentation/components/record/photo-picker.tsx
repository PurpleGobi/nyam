'use client'

import { useRef, useCallback, useState } from 'react'
import { Camera, ImageIcon, X, Loader2, AlertCircle, Eye, EyeOff, Star } from 'lucide-react'
import type { PendingPhoto } from '@/domain/entities/record-photo'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { PhotoCropEditor } from '@/presentation/components/record/photo-crop-editor'

interface PhotoPickerProps {
  photos: PendingPhoto[]
  onAddFiles: (files: File[]) => void
  onRemovePhoto: (photoId: string) => void
  onReplacePhoto?: (photoId: string, newFile: File) => void
  onReorderPhotos?: (fromIndex: number, toIndex: number) => void
  onTogglePublic?: (photoId: string) => void
  isUploading: boolean
  isMaxReached: boolean
  theme: 'food' | 'wine' | 'social'
}

export function PhotoPicker({
  photos,
  onAddFiles,
  onRemovePhoto,
  onReplacePhoto,
  onReorderPhotos,
  onTogglePublic,
  isUploading,
  isMaxReached,
  theme,
}: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<PendingPhoto | null>(null)

  // 드래그 상태
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 모바일 터치 드래그 상태
  const touchState = useRef<{
    photoIndex: number
    startY: number
    startX: number
    isDragging: boolean
    longPressTimer: ReturnType<typeof setTimeout> | null
  } | null>(null)

  const accentVar = theme === 'food' ? '--accent-food' : theme === 'social' ? '--accent-social' : '--accent-wine'

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

  // ── 데스크탑 드래그 핸들러 ──
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex && onReorderPhotos) {
      onReorderPhotos(dragIndex, dragOverIndex)
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, dragOverIndex, onReorderPhotos])

  // ── 모바일 터치 드래그 (long press → drag) ──
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    const timer = setTimeout(() => {
      if (touchState.current) {
        touchState.current.isDragging = true
        setDragIndex(index)
      }
    }, 300)
    touchState.current = {
      photoIndex: index,
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: false,
      longPressTimer: timer,
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchState.current.startX)
    const dy = Math.abs(touch.clientY - touchState.current.startY)

    // 롱프레스 전 움직이면 취소
    if (!touchState.current.isDragging && (dx > 10 || dy > 10)) {
      if (touchState.current.longPressTimer) clearTimeout(touchState.current.longPressTimer)
      touchState.current = null
      return
    }

    if (!touchState.current.isDragging) return

    // 드래그 중 — 현재 위치의 사진 인덱스 계산
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (el) {
      const photoEl = el.closest('[data-photo-index]')
      if (photoEl) {
        const overIdx = Number(photoEl.getAttribute('data-photo-index'))
        setDragOverIndex(overIdx)
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current) return
    if (touchState.current.longPressTimer) clearTimeout(touchState.current.longPressTimer)

    if (touchState.current.isDragging && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex && onReorderPhotos) {
      onReorderPhotos(dragIndex, dragOverIndex)
    }
    touchState.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }, [dragIndex, dragOverIndex, onReorderPhotos])

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2 flex flex-col gap-1">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
          사진 ({photos.length}/{PHOTO_CONSTANTS.MAX_PHOTOS})
        </span>
        {photos.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
            사진은 기본 공개 · 탭하여 비공개 전환 · 길게 눌러 순서 변경
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
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            data-photo-index={index}
            className="relative overflow-hidden"
            draggable={!!onReorderPhotos && photo.status !== 'uploading'}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => onReorderPhotos ? handleTouchStart(e, index) : undefined}
            onTouchMove={onReorderPhotos ? handleTouchMove : undefined}
            onTouchEnd={onReorderPhotos ? handleTouchEnd : undefined}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '10px',
              cursor: onReorderPhotos ? 'grab' : onReplacePhoto ? 'pointer' : undefined,
              opacity: dragIndex === index ? 0.5 : 1,
              outline: dragOverIndex === index && dragIndex !== index ? `2px solid var(${accentVar})` : undefined,
              outlineOffset: '-2px',
              transition: 'opacity 150ms, outline 150ms',
            }}
            onClick={() => dragIndex === null && handleThumbnailClick(photo)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL은 next/image 사용 불가 */}
            <img
              src={photo.previewUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />

            {/* 대표사진 배지 (첫 번째 사진) */}
            {index === 0 && (
              <div
                className="absolute left-1 top-1 flex items-center gap-0.5"
                style={{
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  backgroundColor: `var(${accentVar})`,
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'var(--text-inverse)',
                  lineHeight: '14px',
                }}
              >
                <Star size={8} fill="var(--text-inverse)" />
                대표
              </div>
            )}

            {/* 드래그 핸들 힌트 (대표사진이 아닌 경우 좌상단 순서 번호) */}
            {index > 0 && onReorderPhotos && (
              <div
                className="absolute left-1 top-1 flex items-center justify-center"
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-inverse)',
                }}
              >
                {index + 1}
              </div>
            )}

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
                  color: 'var(--text-inverse)',
                }}
                onClick={(e) => { e.stopPropagation(); onTogglePublic(photo.id) }}
              >
                {photo.isPublic ? <Eye size={10} /> : <EyeOff size={10} />}
                {photo.isPublic ? '공개' : '비공개'}
              </button>
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
              <X size={14} color="var(--text-inverse)" />
            </button>

            {/* 업로드 상태 오버레이 */}
            {photo.status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                <Loader2 size={24} color="var(--text-inverse)" className="animate-spin" />
              </div>
            )}
            {photo.status === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(185,28,28,0.3)' }}>
                <AlertCircle size={24} color="var(--text-inverse)" />
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
