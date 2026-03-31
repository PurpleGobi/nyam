// src/domain/entities/record-photo.ts
// R1: 외부 의존 0

/**
 * record_photos 테이블 1:1 매핑
 * DATA_MODEL.md §2 record_photos
 */
export interface RecordPhoto {
  /** UUID PK */
  id: string

  /** FK → records.id (ON DELETE CASCADE) */
  recordId: string

  /** 이미지 URL (Supabase Storage, 800px webp) */
  url: string

  /** 사진 순서 (0부터 시작, 기본값 0) */
  orderIndex: number

  /** 공개 여부 (기본값 false — 비공개) */
  isPublic: boolean

  /** 생성 시각 — ISO datetime */
  createdAt: string
}

/**
 * 업로드 전 클라이언트 사이드 사진 상태
 */
export interface PendingPhoto {
  id: string
  file: File
  previewUrl: string
  orderIndex: number
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  uploadedUrl?: string
  /** 공개 여부 (기본값 false — 비공개) */
  isPublic: boolean
}

export const PHOTO_CONSTANTS = {
  MAX_PHOTOS: 10,
  MAX_WIDTH: 600,
  QUALITY: 0.7,
  OUTPUT_FORMAT: 'image/webp' as const,
  BUCKET_NAME: 'record-photos',
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const
