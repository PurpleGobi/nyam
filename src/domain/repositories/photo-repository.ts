// src/domain/repositories/photo-repository.ts
// R1: 외부 의존 0

import type { RecordPhoto } from '@/domain/entities/record-photo'

export interface PhotoRepository {
  savePhotos(recordId: string, photos: { url: string; orderIndex: number; isPublic?: boolean }[]): Promise<RecordPhoto[]>
  getPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>
  deletePhoto(photoId: string): Promise<void>
  deletePhotosByRecordId(recordId: string): Promise<void>
}
