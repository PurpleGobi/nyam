// src/domain/repositories/photo-repository.ts
// R1: 외부 의존 0

import type { RecordPhoto } from '@/domain/entities/record-photo'

export interface PhotoRepository {
  savePhotos(recordId: string, photos: { url: string; orderIndex: number; isPublic?: boolean; exifLat?: number | null; exifLng?: number | null; capturedAt?: string | null }[]): Promise<RecordPhoto[]>
  getPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>
  deletePhoto(photoId: string): Promise<void>
  deletePhotosByRecordId(recordId: string): Promise<void>
  /** 사진 순서(order_index) + 공개 여부(is_public) 일괄 업데이트 */
  updatePhotoMeta(updates: Array<{ id: string; orderIndex: number; isPublic: boolean }>): Promise<void>
}
