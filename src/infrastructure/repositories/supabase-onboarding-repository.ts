import { createClient } from '@/infrastructure/supabase/client'
import type { OnboardingSeedRestaurant, OnboardingSeedBubble } from '@/domain/entities/onboarding'

export class SupabaseOnboardingRepository {
  private get supabase() { return createClient() }

  async getSeedRestaurants(area: string): Promise<OnboardingSeedRestaurant[]> {
    const { data } = await this.supabase
      .from('restaurants')
      .select('id, name, area, genre, address, photos')
      .eq('area', area)
      .limit(20)

    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      area: r.area ?? '',
      genre: r.genre ?? null,
      address: r.address ?? null,
      thumbnailUrl: r.photos?.[0] ?? null,
    }))
  }

  async searchSeedRestaurants(area: string, query: string): Promise<OnboardingSeedRestaurant[]> {
    const { data } = await this.supabase
      .from('restaurants')
      .select('id, name, area, genre, address, photos')
      .eq('area', area)
      .ilike('name', `%${query}%`)
      .limit(20)

    return (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      area: r.area ?? '',
      genre: r.genre ?? null,
      address: r.address ?? null,
      thumbnailUrl: r.photos?.[0] ?? null,
    }))
  }

  async registerRestaurant(restaurantId: string, userId: string): Promise<void> {
    await this.supabase
      .from('records')
      .insert({
        user_id: userId,
        target_id: restaurantId,
        target_type: 'restaurant',
        status: 'checked',
      })
  }

  async unregisterRestaurant(restaurantId: string, userId: string): Promise<void> {
    await this.supabase
      .from('records')
      .delete()
      .eq('user_id', userId)
      .eq('target_id', restaurantId)
      .eq('status', 'checked')
  }

  async getSeedBubbles(): Promise<OnboardingSeedBubble[]> {
    const { data } = await this.supabase
      .from('bubbles')
      .select('id, name, description, icon, icon_bg_color, member_count, min_level, join_policy')
      .eq('visibility', 'public')
      .eq('is_searchable', true)
      .order('member_count', { ascending: false })
      .limit(10)

    return (data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description ?? '',
      icon: b.icon ?? '🫧',
      iconBgColor: b.icon_bg_color ?? '#7EAE8B',
      memberCount: b.member_count ?? 0,
      minLevel: b.min_level ?? 0,
      joinPolicy: b.join_policy ?? 'open',
    }))
  }

  async completeOnboarding(userId: string): Promise<void> {
    await this.supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId)
  }
}
