// src/domain/services/image-service.ts
// R1: 외부 의존 0 — 인터페이스만 정의

/**
 * 이미지 리사이즈 + Storage 업로드 서비스 인터페이스
 * infrastructure/storage/image-upload.ts에서 구현
 */
export interface ImageService {
  resizeImage(file: File): Promise<Blob>
  resizeThumbnail(file: File): Promise<Blob>
  uploadImage(userId: string, recordId: string, blob: Blob, fileId: string, suffix?: string): Promise<string>
  uploadImageWithThumbnail(userId: string, recordId: string, originalBlob: Blob, thumbnailBlob: Blob, fileId: string): Promise<{ url: string; thumbnailUrl: string }>
  deleteImage(url: string): Promise<void>
}
