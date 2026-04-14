// src/domain/repositories/bubble-photo-repository.ts
// R1: 외부 의존 0

import type { BubblePhoto } from '@/domain/entities/bubble-photo'

export interface BubblePhotoRepository {
  savePhotos(bubbleId: string, userId: string, photos: { url: string; orderIndex: number }[]): Promise<BubblePhoto[]>
  getPhotosByBubbleId(bubbleId: string): Promise<BubblePhoto[]>
  deletePhoto(photoId: string): Promise<void>
  deletePhotosByBubbleId(bubbleId: string): Promise<void>
}
