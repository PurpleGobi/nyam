import { createClient } from "@/infrastructure/supabase/client"

const BUCKET_NAME = "record-photos"
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadRecordPhoto(
  file: File,
  userId: string,
  recordId: string,
  index: number,
): Promise<{ photoUrl: string; thumbnailUrl: string | null }> {
  if (file.size > MAX_SIZE) {
    throw new Error("Image size exceeds 5MB limit")
  }

  const supabase = createClient()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/${recordId}/${index}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (error) throw new Error(`Failed to upload photo: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return {
    photoUrl: publicUrl,
    thumbnailUrl: null, // Thumbnail generation can be handled by Supabase Edge Functions
  }
}

export async function deleteRecordPhoto(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])
  if (error) throw new Error(`Failed to delete photo: ${error.message}`)
}
