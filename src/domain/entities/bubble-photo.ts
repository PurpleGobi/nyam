// src/domain/entities/bubble-photo.ts
// R1: 외부 의존 0

export interface BubblePhoto {
  id: string
  bubbleId: string
  uploadedBy: string
  url: string
  orderIndex: number
  createdAt: string
}

export const BUBBLE_PHOTO_CONSTANTS = {
  MAX_PHOTOS: 10,
} as const
