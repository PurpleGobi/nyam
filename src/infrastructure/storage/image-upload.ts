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
