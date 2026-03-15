/**
 * Badge eligibility checker service
 * Pure function: determines if a user qualifies for a specific badge
 */

import type { Badge } from '../entities/badge';

/** User statistics used for badge eligibility checking */
export interface BadgeEligibilityStats {
  readonly totalVerifications: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly promptsShared: number;
  readonly isEarlyAdopter: boolean;
}

/**
 * Check whether a user is eligible for a specific badge.
 *
 * Evaluates the badge condition against the user's statistics:
 * - `verification_count`: totalVerifications >= condition value
 * - `streak`: longestStreak >= condition value
 * - `prompt_shared`: promptsShared >= condition value
 * - `early_adopter`: isEarlyAdopter matches condition value
 *
 * @param badge - The badge to check eligibility for
 * @param userStats - The user's current statistics
 * @returns true if the user meets the badge condition
 */
export function checkBadgeEligibility(
  badge: Badge,
  userStats: BadgeEligibilityStats,
): boolean {
  const { type, value } = badge.condition;

  switch (type) {
    case 'verification_count':
      return typeof value === 'number' && userStats.totalVerifications >= value;

    case 'streak':
      return typeof value === 'number' && userStats.longestStreak >= value;

    case 'prompt_shared':
      return typeof value === 'number' && userStats.promptsShared >= value;

    case 'early_adopter':
      return typeof value === 'boolean' && userStats.isEarlyAdopter === value;

    default:
      return false;
  }
}
