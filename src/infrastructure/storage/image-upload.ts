import { createClient } from '@/infrastructure/supabase/client'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

/**
 * 이미지를 지정 크기로 리사이즈하여 WebP Blob으로 변환.
 * Canvas API 사용.
 */
function resizeToBlob(
  img: HTMLImageElement,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let width = img.width
    let height = img.height

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width)
      width = maxWidth
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }
    ctx.drawImage(img, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      PHOTO_CONSTANTS.OUTPUT_FORMAT,
      quality,
    )
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 이미지를 리사이즈하여 WebP Blob으로 변환.
 * max 1200px width, quality 0.8.
 */
export async function resizeImage(file: File): Promise<Blob> {
  const img = await loadImage(file)
  return resizeToBlob(img, PHOTO_CONSTANTS.MAX_WIDTH, PHOTO_CONSTANTS.QUALITY)
}

/**
 * 썸네일 이미지를 생성하여 WebP Blob으로 변환.
 * max 400px width, quality 0.7.
 */
export async function resizeThumbnail(file: File): Promise<Blob> {
  const img = await loadImage(file)
  return resizeToBlob(img, PHOTO_CONSTANTS.THUMBNAIL_WIDTH, PHOTO_CONSTANTS.THUMBNAIL_QUALITY)
}

/**
 * Supabase Storage에 이미지 업로드.
 * 경로: {userId}/{recordId}/{uuid}.webp
 */
export async function uploadImage(
  userId: string,
  recordId: string,
  blob: Blob,
  fileId: string,
  suffix?: string,
): Promise<string> {
  const supabase = createClient()
  const filename = suffix ? `${fileId}_${suffix}.webp` : `${fileId}.webp`
  const path = `${userId}/${recordId}/${filename}`

  const { error } = await supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .upload(path, blob, {
      contentType: PHOTO_CONSTANTS.OUTPUT_FORMAT,
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .getPublicUrl(path)

  return urlData.publicUrl
}

/**
 * 원본 + 썸네일을 동시에 업로드.
 * 반환: { url, thumbnailUrl }
 */
export async function uploadImageWithThumbnail(
  userId: string,
  recordId: string,
  originalBlob: Blob,
  thumbnailBlob: Blob,
  fileId: string,
): Promise<{ url: string; thumbnailUrl: string }> {
  const [url, thumbnailUrl] = await Promise.all([
    uploadImage(userId, recordId, originalBlob, fileId),
    uploadImage(userId, recordId, thumbnailBlob, fileId, 'thumb'),
  ])
  return { url, thumbnailUrl }
}

/**
 * Supabase Storage에서 이미지 삭제.
 */
export async function deleteImage(url: string): Promise<void> {
  const supabase = createClient()

  const bucketPrefix = `/${PHOTO_CONSTANTS.BUCKET_NAME}/`
  const pathStart = url.indexOf(bucketPrefix)
  if (pathStart === -1) throw new Error('Invalid storage URL')
  const path = url.substring(pathStart + bucketPrefix.length)

  const { error } = await supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .remove([path])

  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
