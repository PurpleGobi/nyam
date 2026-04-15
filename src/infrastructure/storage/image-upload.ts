import { createClient } from '@/infrastructure/supabase/client'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

/**
 * 이미지를 리사이즈하여 WebP Blob으로 변환.
 * Canvas API 사용. max 800px width, quality 0.7.
 */
export async function resizeImage(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const { MAX_WIDTH, QUALITY, OUTPUT_FORMAT } = PHOTO_CONSTANTS

  let width = img.width
  let height = img.height

  if (width > MAX_WIDTH) {
    height = Math.round((height * MAX_WIDTH) / width)
    width = MAX_WIDTH
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      OUTPUT_FORMAT,
      QUALITY,
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
 * Supabase Storage에 이미지 업로드.
 * 경로: {userId}/{recordId}/{uuid}.webp
 */
export async function uploadImage(
  userId: string,
  recordId: string,
  blob: Blob,
  fileId: string,
): Promise<string> {
  const supabase = createClient()
  const path = `${userId}/${recordId}/${fileId}.webp`

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

/** Upload a bubble icon image: resize to 256x256 WebP, store in avatars bucket */
export async function uploadBubbleIcon(file: File, userId: string): Promise<string> {
  const blob = await resizeBubbleIconBlob(file)
  const supabase = createClient()
  const path = `bubble-icons/${userId}_${Date.now()}.webp`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/webp', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

function resizeBubbleIconBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context not available')); return }
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      canvas.toBlob(
        (b) => { if (b) resolve(b); else reject(new Error('Blob failed')) },
        'image/webp',
        0.85,
      )
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = URL.createObjectURL(file)
  })
}
