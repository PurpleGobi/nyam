import { createClient } from '@/infrastructure/supabase/client'
import type { PhotoRepository } from '@/domain/repositories/photo-repository'
import type { RecordPhoto } from '@/domain/entities/record-photo'

export class SupabasePhotoRepository implements PhotoRepository {
  private get supabase() {
    return createClient()
  }

  async savePhotos(
    recordId: string,
    photos: { url: string; orderIndex: number; isPublic?: boolean; exifLat?: number | null; exifLng?: number | null; capturedAt?: string | null }[],
  ): Promise<RecordPhoto[]> {
    const rows = photos.map((p) => ({
      record_id: recordId,
      url: p.url,
      order_index: p.orderIndex,
      is_public: p.isPublic ?? false,
      exif_lat: p.exifLat ?? null,
      exif_lng: p.exifLng ?? null,
      captured_at: p.capturedAt ?? null,
    }))

    const { data, error } = await this.supabase
      .from('record_photos')
      .insert(rows)
      .select()

    if (error) throw new Error(`record_photos INSERT failed: ${error.message}`)
    return (data ?? []).map((row) => ({
      id: row.id,
      recordId: row.record_id,
      url: row.url,
      orderIndex: row.order_index,
      isPublic: row.is_public ?? false,
      exifLat: row.exif_lat ?? null,
      exifLng: row.exif_lng ?? null,
      capturedAt: row.captured_at ?? null,
      createdAt: row.created_at,
    }))
  }

  async getPhotosByRecordId(recordId: string): Promise<RecordPhoto[]> {
    const { data, error } = await this.supabase
      .from('record_photos')
      .select('*')
      .eq('record_id', recordId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`record_photos SELECT failed: ${error.message}`)
    return (data ?? []).map((row) => ({
      id: row.id,
      recordId: row.record_id,
      url: row.url,
      orderIndex: row.order_index,
      isPublic: row.is_public ?? false,
      exifLat: row.exif_lat ?? null,
      exifLng: row.exif_lng ?? null,
      capturedAt: row.captured_at ?? null,
      createdAt: row.created_at,
    }))
  }

  async deletePhoto(photoId: string): Promise<void> {
    const { error } = await this.supabase
      .from('record_photos')
      .delete()
      .eq('id', photoId)

    if (error) throw new Error(`record_photos DELETE failed: ${error.message}`)
  }

  async deletePhotosByRecordId(recordId: string): Promise<void> {
    const { error } = await this.supabase
      .from('record_photos')
      .delete()
      .eq('record_id', recordId)

    if (error) throw new Error(`record_photos batch DELETE failed: ${error.message}`)
  }
}
