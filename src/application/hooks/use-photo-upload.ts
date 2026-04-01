'use client'

import { useState, useCallback } from 'react'
import type { PendingPhoto } from '@/domain/entities/record-photo'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { imageService } from '@/shared/di/container'

interface UsePhotoUploadReturn {
  photos: PendingPhoto[]
  addFiles: (files: File[]) => void
  /** 편집 모드: 기존 업로드된 사진을 PendingPhoto 상태로 초기화 */
  initExistingPhotos: (existing: { id: string; url: string; orderIndex: number; isPublic: boolean }[]) => void
  removePhoto: (photoId: string) => Promise<void>
  replacePhoto: (photoId: string, newFile: File) => void
  reorderPhotos: (fromIndex: number, toIndex: number) => void
  togglePublic: (photoId: string) => void
  uploadAll: (userId: string, recordId: string) => Promise<{ url: string; orderIndex: number; isPublic: boolean }[]>
  isUploading: boolean
  error: string | null
  isMaxReached: boolean
}

export function usePhotoUpload(): UsePhotoUploadReturn {
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMaxReached = photos.length >= PHOTO_CONSTANTS.MAX_PHOTOS

  const initExistingPhotos = useCallback(
    (existing: { id: string; url: string; orderIndex: number; isPublic: boolean }[]) => {
      // 기존 사진을 'uploaded' 상태의 PendingPhoto로 변환
      // file은 빈 Blob (리사이즈 불필요 — 이미 업로드됨)
      const mapped: PendingPhoto[] = existing.map((p) => ({
        id: p.id,
        file: new File([], 'existing.webp', { type: 'image/webp' }),
        previewUrl: p.url,
        orderIndex: p.orderIndex,
        status: 'uploaded' as const,
        uploadedUrl: p.url,
        isPublic: p.isPublic,
      }))
      setPhotos(mapped)
    },
    [],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const acceptedTypes: readonly string[] = PHOTO_CONSTANTS.ACCEPTED_TYPES
      const validFiles = files
        .filter((f) => acceptedTypes.includes(f.type))
        .filter((f) => f.size <= PHOTO_CONSTANTS.MAX_FILE_SIZE)

      const remaining = PHOTO_CONSTANTS.MAX_PHOTOS - photos.length
      if (remaining <= 0) return
      const toAdd = validFiles.slice(0, remaining)

      const newPhotos: PendingPhoto[] = toAdd.map((file, i) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        orderIndex: photos.length + i,
        status: 'pending' as const,
        isPublic: true,
      }))

      setPhotos((prev) => [...prev, ...newPhotos])
    },
    [photos.length],
  )

  const removePhoto = useCallback(
    async (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId)
      if (!photo) return

      URL.revokeObjectURL(photo.previewUrl)

      if (photo.status === 'uploaded' && photo.uploadedUrl) {
        try {
          await imageService.deleteImage(photo.uploadedUrl)
        } catch {
          // Storage 삭제 실패해도 목록에서는 제거
        }
      }

      setPhotos((prev) =>
        prev
          .filter((p) => p.id !== photoId)
          .map((p, i) => ({ ...p, orderIndex: i })),
      )
    },
    [photos],
  )

  const replacePhoto = useCallback((photoId: string, newFile: File) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p
        URL.revokeObjectURL(p.previewUrl)
        return {
          ...p,
          file: newFile,
          previewUrl: URL.createObjectURL(newFile),
          status: 'pending' as const,
          uploadedUrl: undefined,
        }
      }),
    )
  }, [])

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((p, i) => ({ ...p, orderIndex: i }))
    })
  }, [])

  const togglePublic = useCallback((photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, isPublic: !p.isPublic } : p)),
    )
  }, [])

  const uploadAll = useCallback(
    async (userId: string, recordId: string) => {
      setIsUploading(true)
      setError(null)

      const results: { url: string; orderIndex: number; isPublic: boolean }[] = []

      for (const photo of photos) {
        if (photo.status === 'uploaded' && photo.uploadedUrl) {
          results.push({ url: photo.uploadedUrl, orderIndex: photo.orderIndex, isPublic: photo.isPublic })
          continue
        }

        try {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: 'uploading' as const } : p)),
          )

          const blob = await imageService.resizeImage(photo.file)
          const url = await imageService.uploadImage(userId, recordId, blob, photo.id)

          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id ? { ...p, status: 'uploaded' as const, uploadedUrl: url } : p,
            ),
          )
          results.push({ url, orderIndex: photo.orderIndex, isPublic: photo.isPublic })
        } catch {
          setPhotos((prev) =>
            prev.map((p) => (p.id === photo.id ? { ...p, status: 'error' as const } : p)),
          )
          setError(`사진 업로드 실패: ${photo.file.name}`)
        }
      }

      setIsUploading(false)
      return results
    },
    [photos],
  )

  return { photos, initExistingPhotos, addFiles, removePhoto, replacePhoto, reorderPhotos, togglePublic, uploadAll, isUploading, error, isMaxReached }
}
