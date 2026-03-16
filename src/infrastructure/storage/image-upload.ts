import { createClient } from '@/infrastructure/supabase/client'

export interface UploadResult {
  url: string
  path: string
}

/**
 * Upload a photo to Supabase Storage under the record-photos bucket.
 * Files are stored under the user's ID directory with a random UUID filename.
 */
export async function uploadRecordPhoto(
  file: File,
  userId: string,
): Promise<UploadResult> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('record-photos')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('record-photos')
    .getPublicUrl(path)

  return { url: urlData.publicUrl, path }
}

/**
 * Resize an image file to fit within a maximum dimension while maintaining aspect ratio.
 * Returns the original file if it is already smaller than maxSize.
 */
export async function resizeImage(
  file: File,
  maxSize: number = 1024,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width, height } = img

      if (width <= maxSize && height <= maxSize) {
        resolve(file)
        return
      }

      const scale = maxSize / Math.max(width, height)
      const newWidth = Math.round(width * scale)
      const newHeight = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          const resized = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(resized)
        },
        'image/jpeg',
        0.85,
      )
    }

    img.onerror = reject
    img.src = url
  })
}

/**
 * Convert a File object to a base64 string (without the data URL prefix).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
