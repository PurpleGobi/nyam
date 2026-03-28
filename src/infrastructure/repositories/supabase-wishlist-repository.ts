import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'
import type { Wishlist, WishlistSource } from '@/domain/entities/wishlist'
import { createClient } from '@/infrastructure/supabase/client'

function toEntity(row: Record<string, unknown>): Wishlist {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targetId: row.target_id as string,
    targetType: row.target_type as 'restaurant' | 'wine',
    source: row.source as WishlistSource,
    sourceRecordId: (row.source_record_id as string) ?? null,
    isVisited: row.is_visited as boolean,
    createdAt: row.created_at as string,
  }
}

export class SupabaseWishlistRepository implements WishlistRepository {
  private get supabase() {
    return createClient()
  }

  async isWishlisted(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<boolean> {
    const { data } = await this.supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .limit(1)
      .maybeSingle()

    return !!data
  }

  async add(params: {
    userId: string
    targetId: string
    targetType: 'restaurant' | 'wine'
    source: WishlistSource
    sourceRecordId?: string
  }): Promise<Wishlist> {
    const { data, error } = await this.supabase
      .from('wishlists')
      .upsert(
        {
          user_id: params.userId,
          target_id: params.targetId,
          target_type: params.targetType,
          source: params.source,
          source_record_id: params.sourceRecordId ?? null,
        },
        { onConflict: 'user_id,target_id,target_type' },
      )
      .select()
      .single()

    if (error || !data) throw new Error(`찜 추가 실패: ${error?.message}`)
    return toEntity(data)
  }

  async remove(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void> {
    const { error } = await this.supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)

    if (error) throw new Error(`찜 삭제 실패: ${error.message}`)
  }

  async findByUser(userId: string, targetType: 'restaurant' | 'wine'): Promise<Wishlist[]> {
    const { data, error } = await this.supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`찜 목록 조회 실패: ${error.message}`)
    return (data ?? []).map(toEntity)
  }

  async updateVisitStatus(
    userId: string,
    targetId: string,
    targetType: 'restaurant' | 'wine',
    isVisited: boolean,
  ): Promise<void> {
    await this.supabase
      .from('wishlists')
      .update({ is_visited: isVisited })
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
  }
}
