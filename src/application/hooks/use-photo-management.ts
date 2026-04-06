'use client'

import { useCallback } from 'react'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { photoRepo, imageService } from '@/shared/di/container'

/**
 * photoRepo + imageService 호출을 통합한 hook.
 * record-flow(수정 모드 사진 처리)와 add-flow(사진 업로드) 모두 사용.
 */
export function usePhotoManagement() {
  const savePhotos = useCallback(
    (recordId: string, photos: { url: string; orderIndex: number; isPublic?: boolean; exifLat?: number | null; exifLng?: number | null; capturedAt?: string | null }[]) =>
      photoRepo.savePhotos(recordId, photos),
    [],
  )

  const deletePhoto = useCallback(
    (photoId: string) => photoRepo.deletePhoto(photoId),
    [],
  )

  const getPhotosByRecordId = useCallback(
    (recordId: string): Promise<RecordPhoto[]> => photoRepo.getPhotosByRecordId(recordId),
    [],
  )

  const deleteImage = useCallback(
    (url: string) => imageService.deleteImage(url),
    [],
  )

  const resizeAndUploadImage = useCallback(
    async (file: File, userId: string, recordId: string, fileId: string): Promise<string> => {
      const blob = await imageService.resizeImage(file)
      return imageService.uploadImage(userId, recordId, blob, fileId)
    },
    [],
  )

  return { savePhotos, deletePhoto, getPhotosByRecordId, deleteImage, resizeAndUploadImage }
}
