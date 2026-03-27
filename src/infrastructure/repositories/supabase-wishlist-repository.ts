import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'
import { createClient } from '@/infrastructure/supabase/client'

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
      .single()

    return !!data
  }

  async add(userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<void> {
    const { error } = await this.supabase
      .from('wishlists')
      .upsert(
        { user_id: userId, target_id: targetId, target_type: targetType, source: 'direct' },
        { onConflict: 'user_id,target_id,target_type' },
      )

    if (error) throw new Error(`찜 추가 실패: ${error.message}`)
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
}
