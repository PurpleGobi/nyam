'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord, CreateRecordInput } from '@/domain/entities/record'
import { recordRepo, photoRepo } from '@/shared/di/container'
import { imageService } from '@/shared/di/container'
import type { PendingPhoto } from '@/domain/entities/record-photo'

interface UseSaveRecordReturn {
  saveRecord: (input: CreateRecordInput, photos: PendingPhoto[]) => Promise<DiningRecord | null>
  isLoading: boolean
  error: string | null
}

export function useSaveRecord(): UseSaveRecordReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveRecord = useCallback(async (
    input: CreateRecordInput,
    photos: PendingPhoto[],
  ): Promise<DiningRecord | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. records INSERT
      const record = await recordRepo.create(input)

      // 2. record_photos INSERT (사진 있으면)
      if (photos.length > 0) {
        const uploadedPhotos: { url: string; orderIndex: number }[] = []
        for (const photo of photos) {
          const blob = await imageService.resizeImage(photo.file)
          const url = await imageService.uploadImage(input.userId, record.id, blob, photo.id)
          uploadedPhotos.push({ url, orderIndex: photo.orderIndex })
        }
        if (uploadedPhotos.length > 0) {
          await photoRepo.savePhotos(record.id, uploadedPhotos)
        }
      }

      // 3. wishlists UPDATE
      await recordRepo.markWishlistVisited(input.userId, input.targetId, input.targetType)

      return record
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { saveRecord, isLoading, error }
}
