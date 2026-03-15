/**
 * Verification domain entities
 * Aligned with: verifications, restaurant_verification_summary, suspicious_flags tables
 */

/** AI model used for verification */
export type AiModel = 'chatgpt' | 'claude' | 'gemini' | 'other';

/** Verification trust level based on count and flags */
export type VerificationLevel =
  | 'unverified'
  | 'partial'
  | 'verified'
  | 'trusted'
  | 'suspicious';

/** Single verification record */
export interface Verification {
  readonly id: string;
  readonly userId: string;
  readonly restaurantId: string;
  readonly promptTemplateId: string | null;
  readonly aiModel: AiModel | null;
  readonly tasteScore: number | null;
  readonly valueScore: number | null;
  readonly serviceScore: number | null;
  readonly ambianceScore: number | null;
  readonly comment: string | null;
  readonly visited: boolean;
  readonly visitedAt: string | null;
  readonly createdAt: string;
}

/** Aggregated verification summary for a restaurant (materialized view) */
export interface VerificationSummary {
  readonly restaurantId: string;
  readonly verificationCount: number;
  readonly avgTaste: number | null;
  readonly avgValue: number | null;
  readonly avgService: number | null;
  readonly avgAmbiance: number | null;
  readonly lastVerifiedAt: string | null;
  readonly verificationLevel: VerificationLevel;
}

/** Suspicious flag reported by a user */
export interface SuspiciousFlag {
  readonly id: string;
  readonly restaurantId: string;
  readonly userId: string;
  readonly reason: string;
  readonly createdAt: string;
}
