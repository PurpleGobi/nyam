import { createClient } from '@/infrastructure/supabase/client'
import type { BubblePhoto } from '@/domain/entities/bubble-photo'
import type { BubblePhotoRepository } from '@/domain/repositories/bubble-photo-repository'

function toEntity(row: Record<string, unknown>): BubblePhoto {
  return {
    id: row.id as string,
    bubbleId: row.bubble_id as string,
    uploadedBy: row.uploaded_by as string,
    url: row.url as string,
    orderIndex: row.order_index as number,
    createdAt: row.created_at as string,
  }
}

export class SupabaseBubblePhotoRepository implements BubblePhotoRepository {
  private get supabase() { return createClient() }

  async savePhotos(
    bubbleId: string,
    userId: string,
    photos: { url: string; orderIndex: number }[],
  ): Promise<BubblePhoto[]> {
    if (photos.length === 0) return []
    const rows = photos.map((p) => ({
      bubble_id: bubbleId,
      uploaded_by: userId,
      url: p.url,
      order_index: p.orderIndex,
    }))
    const { data, error } = await this.supabase
      .from('bubble_photos')
      .insert(rows)
      .select()
    if (error) throw new Error(`bubble_photos insert failed: ${error.message}`)
    return (data ?? []).map((r) => toEntity(r as Record<string, unknown>))
  }

  async getPhotosByBubbleId(bubbleId: string): Promise<BubblePhoto[]> {
    const { data } = await this.supabase
      .from('bubble_photos')
      .select('*')
      .eq('bubble_id', bubbleId)
      .order('order_index', { ascending: true })
    return (data ?? []).map((r) => toEntity(r as Record<string, unknown>))
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.supabase.from('bubble_photos').delete().eq('id', photoId)
  }

  async deletePhotosByBubbleId(bubbleId: string): Promise<void> {
    await this.supabase.from('bubble_photos').delete().eq('bubble_id', bubbleId)
  }
}
