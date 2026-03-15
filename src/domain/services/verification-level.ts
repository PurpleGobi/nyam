/**
 * Verification level determination service
 * Pure function: determines trust level based on verification count and suspicious flags
 */

import type { VerificationLevel } from '../entities/verification';

/**
 * Determine the verification level for a restaurant.
 *
 * Rules:
 * - `hasSuspiciousFlag = true` => 'suspicious' (overrides all other levels)
 * - `count = 0`   => 'unverified'
 * - `count 1-4`   => 'partial'
 * - `count 5-19`  => 'verified'
 * - `count >= 20` => 'trusted'
 *
 * @param count - Total number of verifications for the restaurant
 * @param hasSuspiciousFlag - Whether the restaurant has been flagged as suspicious
 * @returns The computed verification level
 */
export function getVerificationLevel(
  count: number,
  hasSuspiciousFlag: boolean,
): VerificationLevel {
  if (hasSuspiciousFlag) {
    return 'suspicious';
  }

  if (count >= 20) {
    return 'trusted';
  }

  if (count >= 5) {
    return 'verified';
  }

  if (count >= 1) {
    return 'partial';
  }

  return 'unverified';
}
