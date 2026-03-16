/**
 * Badge repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { Badge, UserBadge, BadgeWithStatus } from '../entities/badge';

export interface BadgeRepository {
  /** Find all badge definitions */
  findAll(): Promise<readonly Badge[]>;

  /** Find all badges for a user with earning status */
  findByUser(userId: string): Promise<readonly BadgeWithStatus[]>;

  /** Award a badge to a user */
  award(userId: string, badgeId: string): Promise<UserBadge>;
}
