/**
 * User domain entities
 * Aligned with: user_profiles table
 */

/** User tier based on verification activity */
export type UserTier = 'explorer' | 'verifier' | 'analyst' | 'master' | 'guide';

/** Preferred AI model for prompts */
export type PreferredAi = 'chatgpt' | 'claude' | 'gemini';

/** User profile entity */
export interface UserProfile {
  readonly id: string;
  readonly nickname: string | null;
  readonly avatarUrl: string | null;
  readonly preferredAi: PreferredAi;
  readonly allergies: readonly string[];
  readonly foodPreferences: readonly string[];
  readonly tier: UserTier;
  readonly totalVerifications: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastVerifiedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Aggregated user statistics for badge checking and display */
export interface UserStats {
  readonly totalVerifications: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly promptsShared: number;
  readonly regionsExplored: number;
  readonly cuisinesExplored: number;
  readonly isEarlyAdopter: boolean;
}
