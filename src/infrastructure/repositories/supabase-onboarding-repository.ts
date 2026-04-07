import { createClient } from '@/infrastructure/supabase/client'
import type { OnboardingSeedRestaurant, OnboardingSeedBubble } from '@/domain/entities/onboarding'
import type { OnboardingRepository } from '@/domain/repositories/onboarding-repository'

export class SupabaseOnboardingRepository implements OnboardingRepository {
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
      photoUrl: r.photos?.[0] ?? null,
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
      photoUrl: r.photos?.[0] ?? null,
    }))
  }

  async registerRestaurant(restaurantId: string, userId: string): Promise<void> {
    // 이미 기록이 있으면 무시, 없으면 최소 record 생성
    const { count } = await this.supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')
    if ((count ?? 0) > 0) return

    await this.supabase
      .from('records')
      .insert({
        user_id: userId,
        target_id: restaurantId,
        target_type: 'restaurant',
      })
  }

  async unregisterRestaurant(restaurantId: string, userId: string): Promise<void> {
    await this.supabase
      .from('records')
      .delete()
      .eq('user_id', userId)
      .eq('target_id', restaurantId)
      .eq('target_type', 'restaurant')
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
      icon: b.icon ?? 'users',
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
