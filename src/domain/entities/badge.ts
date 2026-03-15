/**
 * Badge domain entities
 * Aligned with: badges, user_badges tables
 */

/** Badge category */
export type BadgeCategory = 'milestone' | 'region' | 'cuisine' | 'special';

/** Badge tier level */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'master';

/** Badge condition type for eligibility checking */
export type BadgeConditionType =
  | 'verification_count'
  | 'streak'
  | 'prompt_shared'
  | 'early_adopter';

/** Badge earning condition */
export interface BadgeCondition {
  readonly type: BadgeConditionType;
  readonly value: number | boolean;
}

/** Badge definition entity */
export interface Badge {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: BadgeCategory;
  readonly icon: string;
  readonly tier: BadgeTier | null;
  readonly condition: BadgeCondition;
  readonly createdAt: string;
}

/** Badge earned by a user */
export interface UserBadge {
  readonly id: string;
  readonly userId: string;
  readonly badgeId: string;
  readonly earnedAt: string;
}

/** Badge with earning status for display */
export interface BadgeWithStatus extends Badge {
  readonly earned: boolean;
  readonly earnedAt: string | null;
}
