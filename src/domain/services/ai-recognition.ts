// src/domain/services/ai-recognition.ts
// R1: 순수 도메인 로직. 외부 의존 0.

import type { RestaurantCandidate } from '@/domain/entities/camera'

/**
 * GPS 반경 내 식당 후보와 AI 장르를 교차 매칭하여 최우선 순위 결정
 */
export function rankCandidatesByGenreMatch(
  candidates: RestaurantCandidate[],
  detectedGenre: string | null,
): RestaurantCandidate[] {
  if (!detectedGenre) {
    return [...candidates].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }

  return [...candidates]
    .map((c) => ({
      ...c,
      matchScore: calculateMatchScore(c, detectedGenre),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
}

function calculateMatchScore(candidate: RestaurantCandidate, detectedGenre: string): number {
  let score = 0

  if (candidate.genre && normalizeGenre(candidate.genre) === normalizeGenre(detectedGenre)) {
    score += 0.6
  }

  if (candidate.distance !== null) {
    const distanceFactor = Math.max(0, 1 - candidate.distance / 200)
    score += distanceFactor * 0.4
  }

  return Math.min(score, 1)
}

function normalizeGenre(genre: string): string {
  return genre.replace(/\s/g, '').toLowerCase()
}

/**
 * 확실한 매칭 판정: 최고 점수 후보가 0.7 이상이고, 2위와 0.2 이상 차이
 */
export function isConfidentMatch(candidates: RestaurantCandidate[]): boolean {
  if (candidates.length === 0) return false
  if (candidates.length === 1) return candidates[0].matchScore >= 0.5

  const sorted = [...candidates].sort((a, b) => b.matchScore - a.matchScore)
  return sorted[0].matchScore >= 0.7 && sorted[0].matchScore - sorted[1].matchScore >= 0.2
}
