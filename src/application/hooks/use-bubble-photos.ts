'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BubblePhoto } from '@/domain/entities/bubble-photo'
import { bubblePhotoRepo, imageService } from '@/shared/di/container'

/**
 * 버블 사진 관리 훅
 * - fetch: 버블 사진 목록 조회
 * - save: 업로드된 사진 DB 저장
 * - delete: 사진 삭제 (Storage + DB)
 */
export function useBubblePhotos(bubbleId: string | null) {
  const [photos, setPhotos] = useState<BubblePhoto[]>([])
  const [isLoading, setIsLoading] = useState(!!bubbleId)

  useEffect(() => {
    if (!bubbleId) return
    let cancelled = false
    bubblePhotoRepo.getPhotosByBubbleId(bubbleId)
      .then((data) => { if (!cancelled) setPhotos(data) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [bubbleId])

  const savePhotos = useCallback(async (
    targetBubbleId: string,
    userId: string,
    uploadedPhotos: { url: string; orderIndex: number }[],
  ) => {
    const saved = await bubblePhotoRepo.savePhotos(targetBubbleId, userId, uploadedPhotos)
    setPhotos((prev) => [...prev, ...saved])
    return saved
  }, [])

  const deletePhoto = useCallback(async (photoId: string, url: string) => {
    await bubblePhotoRepo.deletePhoto(photoId)
    try { await imageService.deleteImage(url) } catch { /* storage 삭제 실패해도 진행 */ }
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }, [])

  return { photos, isLoading, savePhotos, deletePhoto }
}
