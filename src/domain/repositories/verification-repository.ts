/**
 * Verification repository interface
 * Infrastructure layer implements this with Supabase
 */

import type { Verification, VerificationSummary } from '../entities/verification';

/** Data required to create a new verification */
export interface CreateVerificationInput {
  readonly userId: string;
  readonly restaurantId: string;
  readonly promptTemplateId?: string;
  readonly aiModel?: string;
  readonly tasteScore?: number;
  readonly valueScore?: number;
  readonly serviceScore?: number;
  readonly ambianceScore?: number;
  readonly comment?: string;
  readonly visited?: boolean;
  readonly visitedAt?: string;
}

export interface VerificationRepository {
  /** Create a new verification record */
  create(input: CreateVerificationInput): Promise<Verification>;

  /** Find all verifications for a restaurant */
  findByRestaurant(restaurantId: string): Promise<readonly Verification[]>;

  /** Find all verifications by a user */
  findByUser(userId: string): Promise<readonly Verification[]>;

  /** Get the aggregated verification summary for a restaurant */
  getSummary(restaurantId: string): Promise<VerificationSummary | null>;
}
