/**
 * Supabase implementation of UserRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type { UserProfile, UserStats, UserTier, PreferredAi } from '@/domain/entities/user';
import type {
  UserRepository,
  UpdateUserProfileInput,
} from '@/domain/repositories/user-repository';

type UserRow = Row<'user_profiles'>;

/** Map a Supabase user profile row to the domain entity */
function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    preferredAi: row.preferred_ai as PreferredAi,
    allergies: row.allergies,
    foodPreferences: row.food_preferences,
    tier: row.tier as UserTier,
    totalVerifications: row.total_verifications,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastVerifiedAt: row.last_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseUserRepository: UserRepository = {
  async findById(id: string): Promise<UserProfile | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }

    return toUserProfile(data);
  },

  async update(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};
    if (input.nickname !== undefined) updateData.nickname = input.nickname;
    if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
    if (input.preferredAi !== undefined) updateData.preferred_ai = input.preferredAi;
    if (input.allergies !== undefined) updateData.allergies = [...input.allergies];
    if (input.foodPreferences !== undefined) updateData.food_preferences = [...input.foodPreferences];

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return toUserProfile(data);
  },

  async getStats(id: string): Promise<UserStats> {
    const supabase = createClient();

    // Fetch user profile for streak/verification data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('total_verifications, current_streak, longest_streak, created_at')
      .eq('id', id)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user stats: ${profileError.message}`);
    }

    // Count prompts shared (authored by user)
    const { count: promptsShared } = await supabase
      .from('prompt_templates')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', id)
      .eq('is_public', true);

    // Count distinct regions explored via verifications -> restaurants
    const { data: verifications } = await supabase
      .from('verifications')
      .select('restaurant_id')
      .eq('user_id', id);

    let regionsExplored = 0;
    let cuisinesExplored = 0;

    if (verifications && verifications.length > 0) {
      const restaurantIds = [...new Set(verifications.map(v => v.restaurant_id))];

      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('region, cuisine_category')
        .in('id', restaurantIds);

      if (restaurants) {
        const regions = new Set(restaurants.map(r => r.region).filter(Boolean));
        const cuisines = new Set(restaurants.map(r => r.cuisine_category));
        regionsExplored = regions.size;
        cuisinesExplored = cuisines.size;
      }
    }

    // Early adopter: check if the user was created within 30 days of the earliest user
    const { data: earliest } = await supabase
      .from('user_profiles')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const isEarlyAdopter = earliest
      ? new Date(profile.created_at).getTime() - new Date(earliest.created_at).getTime() < 30 * 24 * 60 * 60 * 1000
      : true;

    return {
      totalVerifications: profile.total_verifications,
      currentStreak: profile.current_streak,
      longestStreak: profile.longest_streak,
      promptsShared: promptsShared ?? 0,
      regionsExplored,
      cuisinesExplored,
      isEarlyAdopter,
    };
  },
};
