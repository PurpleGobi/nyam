/**
 * Supabase implementation of BadgeRepository
 */

import { createClient } from '../supabase/client';
import type { Row } from '../supabase/types';
import type {
  Badge,
  UserBadge,
  BadgeWithStatus,
  BadgeCategory,
  BadgeTier,
  BadgeCondition,
} from '@/domain/entities/badge';
import type { BadgeRepository } from '@/domain/repositories/badge-repository';

type BadgeRow = Row<'badges'>;
type UserBadgeRow = Row<'user_badges'>;

/** Map a Supabase badge row to the domain entity */
function toBadge(row: BadgeRow): Badge {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category as BadgeCategory,
    icon: row.icon,
    tier: row.tier as BadgeTier | null,
    condition: row.condition as BadgeCondition,
    createdAt: row.created_at,
  };
}

/** Map a Supabase user_badge row to the domain entity */
function toUserBadge(row: UserBadgeRow): UserBadge {
  return {
    id: row.id,
    userId: row.user_id,
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
  };
}

export const supabaseBadgeRepository: BadgeRepository = {
  async findAll(): Promise<readonly Badge[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }

    return (data ?? []).map(toBadge);
  },

  async findByUser(userId: string): Promise<readonly BadgeWithStatus[]> {
    const supabase = createClient();

    // Fetch all badges
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });

    if (badgesError) {
      throw new Error(`Failed to fetch badges: ${badgesError.message}`);
    }

    // Fetch user's earned badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId);

    if (userBadgesError) {
      throw new Error(`Failed to fetch user badges: ${userBadgesError.message}`);
    }

    const earnedMap = new Map(
      (userBadges ?? []).map(ub => [ub.badge_id, ub.earned_at]),
    );

    return (allBadges ?? []).map((row): BadgeWithStatus => ({
      ...toBadge(row),
      earned: earnedMap.has(row.id),
      earnedAt: earnedMap.get(row.id) ?? null,
    }));
  },

  async award(userId: string, badgeId: string): Promise<UserBadge> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to award badge: ${error.message}`);
    }

    return toUserBadge(data);
  },
};
