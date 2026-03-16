/**
 * User repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { UserProfile, UserStats } from '../entities/user';

/** Fields allowed for profile update */
export interface UpdateUserProfileInput {
  readonly nickname?: string;
  readonly avatarUrl?: string;
  readonly preferredAi?: string;
  readonly allergies?: readonly string[];
  readonly foodPreferences?: readonly string[];
}

export interface UserRepository {
  /** Find a user profile by ID */
  findById(id: string): Promise<UserProfile | null>;

  /** Update a user profile */
  update(id: string, input: UpdateUserProfileInput): Promise<UserProfile>;

  /** Get aggregated user statistics */
  getStats(id: string): Promise<UserStats>;
}
