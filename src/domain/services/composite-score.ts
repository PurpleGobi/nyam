// src/domain/services/composite-score.ts
// R1: 외부 의존 0

/**
 * Discover 탭 복합 점수 계산
 * 외부 평점 40% + 냠스코어 30% + 기록 수 20% + 배지 10%
 */
export function calculateCompositeScore(
  externalAvg: number,
  nyamScore: number,
  recordCount: number,
  hasBadge: boolean,
): number {
  const externalFactor = 0.4 * externalAvg
  const nyamFactor = 0.3 * (nyamScore / 100)
  const recordFactor = 0.2 * Math.min(Math.log10(Math.max(recordCount, 1)) / 2, 1)
  const badgeFactor = 0.1 * (hasBadge ? 1 : 0)

  return externalFactor + nyamFactor + recordFactor + badgeFactor
}
