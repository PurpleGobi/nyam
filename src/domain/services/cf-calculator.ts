// src/domain/services/cf-calculator.ts
// R1: 외부 의존 0 — 순수 함수

import type {
  SimilarityResult,
  PredictionResult,
  ScorePoint,
  RaterInput,
  RelationType,
} from '@/domain/entities/similarity'

// CF 확정 파라미터 (시뮬레이션 검증 완료)
const D = 60
const LAMBDA = 7
const BOOST_FOLLOWING = 1.5  // 팔로우(맞팔 포함) 부스트
const BOOST_NONE = 1.0
const CONFIDENCE_N_WEIGHT = 0.50
const CONFIDENCE_AGREEMENT_WEIGHT = 0.35
const CONFIDENCE_QUALITY_WEIGHT = 0.15
const MIN_OVERLAP = 1
const TOP_K = 50
const BASE_WEIGHT = 0.1  // 겹침 0인 기록자의 기본 가중치 (단순 평균 기여)
const NICHE_THRESHOLD = 0.10  // 니치 판별: 기록자 수가 전체 유저의 10% 이하

/** CF 파라미터 셋 — Nyam(전체) vs 버블 모드 분리 */
export interface CfParams {
  minOverlap: number
  applyDiversityCorrection: boolean
  uniformBoost: boolean  // true이면 모든 관계에 BOOST_NONE 적용
  minRaters: number      // 최소 기록자 수 (버블: 1명)
}

/** Nyam 점수용 기본 파라미터 */
export const NYAM_CF_PARAMS: CfParams = {
  minOverlap: MIN_OVERLAP,
  applyDiversityCorrection: true,
  uniformBoost: false,
  minRaters: 3,
}

/** 버블 점수용 파라미터 */
export const BUBBLE_CF_PARAMS: CfParams = {
  minOverlap: 0,
  applyDiversityCorrection: false,
  uniformBoost: true,
  minRaters: 1,
}

/**
 * 점수 배열의 평균 2D 좌표를 계산한다.
 * 빈 배열이면 { x: 50, y: 50 } 반환 (중립값).
 */
export function computeMeanCentered(scores: ScorePoint[]): ScorePoint {
  if (scores.length === 0) {
    return { x: 50, y: 50 }
  }

  let sumX = 0
  let sumY = 0

  for (const s of scores) {
    sumX += s.x
    sumY += s.y
  }

  return {
    x: sumX / scores.length,
    y: sumY / scores.length,
  }
}

/**
 * 겹침 수 기반 신뢰도 계산.
 * 신뢰도 = 기본 신뢰도 × 겹침 다양성 비율
 * 기본 신뢰도 = n / (n + lambda)
 * 겹침 다양성 비율 = nicheOverlap / totalOverlap (니치 판별: 기록자 수가 전체 유저의 10% 이하)
 *
 * @param nOverlap 겹치는 아이템 수
 * @param lambda 감쇠 상수 (기본값 7)
 * @param nicheRatio 니치 겹침 비율 (0~1, undefined면 다양성 보정 미적용)
 */
export function computeConfidence(nOverlap: number, lambda?: number, nicheRatio?: number): number {
  const baseConfidence = nOverlap / (nOverlap + (lambda ?? LAMBDA))
  if (nicheRatio === undefined) return baseConfidence
  return baseConfidence * nicheRatio
}

/**
 * 두 유저의 적합도를 계산한다.
 * Mean-centered 편차 쌍을 받아 유클리드 거리 기반 적합도 산출.
 *
 * @param deviationsA 유저 A의 mean-centered 편차 (겹치는 아이템만, 순서 일치)
 * @param deviationsB 유저 B의 mean-centered 편차 (겹치는 아이템만, 순서 일치)
 * @param d 거리 정규화 상수 (기본값 60)
 * @returns SimilarityResult
 */
export function computeSimilarity(
  deviationsA: ScorePoint[],
  deviationsB: ScorePoint[],
  d?: number,
): SimilarityResult {
  const nOverlap = deviationsA.length

  if (nOverlap === 0) {
    return { similarity: 0, confidence: 0, nOverlap: 0 }
  }

  let distSum = 0

  for (let i = 0; i < nOverlap; i++) {
    const a = deviationsA[i]
    const b = deviationsB[i]
    const dx = a.x - b.x
    const dy = a.y - b.y
    distSum += Math.sqrt(dx * dx + dy * dy)
  }

  const avgDist = distSum / nOverlap
  const similarity = Math.max(0, 1 - avgDist / (d ?? D))
  const confidence = computeConfidence(nOverlap)

  return { similarity, confidence, nOverlap }
}

/**
 * 예측 확신도 계산 (CF_SYSTEM.md §3.5).
 * 3요소 가중합: n_factor(0.50) + agreement(0.35) + quality(0.15)
 */
export function computePredictionConfidence(raters: RaterInput[]): number {
  const nRaters = raters.length

  if (nRaters === 0) {
    return 0
  }

  // n_factor
  const nFactor = nRaters / (nRaters + LAMBDA)

  // 가중치 계산
  let sumAbsWeight = 0
  const weights: number[] = []

  for (const r of raters) {
    const w = r.similarity * r.confidence * r.boost
    weights.push(w)
    sumAbsWeight += Math.abs(w)
  }

  if (sumAbsWeight === 0) {
    return nFactor * CONFIDENCE_N_WEIGHT
  }

  // 가중 평균 편차
  let weightedMeanDevX = 0
  let weightedMeanDevY = 0

  for (let i = 0; i < nRaters; i++) {
    weightedMeanDevX += weights[i] * raters[i].deviation.x
    weightedMeanDevY += weights[i] * raters[i].deviation.y
  }

  weightedMeanDevX /= sumAbsWeight
  weightedMeanDevY /= sumAbsWeight

  // 가중 편차 분산
  let varianceX = 0
  let varianceY = 0

  for (let i = 0; i < nRaters; i++) {
    const diffX = raters[i].deviation.x - weightedMeanDevX
    const diffY = raters[i].deviation.y - weightedMeanDevY
    varianceX += weights[i] * diffX * diffX
    varianceY += weights[i] * diffY * diffY
  }

  varianceX /= sumAbsWeight
  varianceY /= sumAbsWeight

  const stdDev = Math.sqrt(Math.max(varianceX, varianceY))

  // agreement
  const agreement = Math.max(0, 1 - stdDev / 2)

  // quality
  const avgWeight = sumAbsWeight / nRaters
  const quality = avgWeight / (avgWeight + 0.3)

  // 가중합
  const confidence =
    nFactor * CONFIDENCE_N_WEIGHT +
    agreement * CONFIDENCE_AGREEMENT_WEIGHT +
    quality * CONFIDENCE_QUALITY_WEIGHT

  return Math.min(1, Math.max(0, confidence))
}

/**
 * CF 가중 예측을 수행한다.
 *
 * @param myMean 나의 평균 2D 좌표
 * @param raters 평가자 목록 (mean-centered 편차 + 적합도 + 신뢰도 + 부스트)
 * @returns PredictionResult
 */
export function computePrediction(
  myMean: ScorePoint,
  raters: RaterInput[],
): PredictionResult | null {
  if (raters.length === 0) return null  // 유효 평가자 없음 → 예측 불가


  let sumWeightedDevX = 0
  let sumWeightedDevY = 0
  let sumAbsWeight = 0

  for (const r of raters) {
    const cfWeight = r.similarity * r.confidence * r.boost
    const weight = cfWeight > 1e-9 ? cfWeight : BASE_WEIGHT
    sumWeightedDevX += weight * r.deviation.x
    sumWeightedDevY += weight * r.deviation.y
    sumAbsWeight += Math.abs(weight)
  }

  if (sumAbsWeight === 0) {
    return {
      predictedX: myMean.x,
      predictedY: myMean.y,
      satisfaction: (myMean.x + myMean.y) / 2,
      confidence: 0,
      nRaters: 0,
    }
  }

  const rawX = myMean.x + sumWeightedDevX / sumAbsWeight
  const rawY = myMean.y + sumWeightedDevY / sumAbsWeight

  const predictedX = Math.min(100, Math.max(0, rawX))
  const predictedY = Math.min(100, Math.max(0, rawY))
  const satisfaction = (predictedX + predictedY) / 2
  const confidence = computePredictionConfidence(raters)

  return {
    predictedX,
    predictedY,
    satisfaction,
    confidence,
    nRaters: raters.length,
  }
}

/**
 * 관계 유형에 따른 부스트 값 반환.
 * 팔로우(맞팔 포함) → 1.5, 없음 → 1.0
 */
export function getRelationBoost(relation: RelationType, uniformBoost?: boolean): number {
  if (uniformBoost) return BOOST_NONE
  switch (relation) {
    case 'following':
      return BOOST_FOLLOWING
    case 'none':
      return BOOST_NONE
  }
}

/**
 * 니치 겹침 비율 계산.
 * 니치 아이템: 해당 아이템을 기록한 유저 수가 전체 유저 수의 NICHE_THRESHOLD(10%) 이하
 *
 * @param overlapItemRaterCounts 겹치는 각 아이템의 기록자 수 배열
 * @param totalUsers 전체 유저 수
 * @returns nicheRatio (0~1). 겹침 0이면 1 반환.
 */
export function computeNicheRatio(
  overlapItemRaterCounts: number[],
  totalUsers: number,
): number {
  if (overlapItemRaterCounts.length === 0) return 1
  const threshold = totalUsers * NICHE_THRESHOLD
  let nicheCount = 0
  for (const count of overlapItemRaterCounts) {
    if (count <= threshold) nicheCount++
  }
  return nicheCount / overlapItemRaterCounts.length
}

/**
 * 겹침 수가 최소 기준 미만인 평가자를 제거한다 (CF_SYSTEM.md §3.6).
 *
 * @param raters 평가자 목록 (nOverlap 포함)
 * @param minOverlap 최소 겹침 수 (기본값 MIN_OVERLAP = 3)
 * @returns 필터링된 평가자 목록
 */
export function filterByMinOverlap<T extends { nOverlap: number }>(
  raters: T[],
  minOverlap?: number,
): T[] {
  return raters.filter(r => r.nOverlap >= (minOverlap ?? MIN_OVERLAP))
}

/**
 * 가중치(similarity × confidence × boost) 상위 K명을 선택한다 (CF_SYSTEM.md §3.6).
 *
 * @param raters 평가자 목록
 * @param k 상위 K명 (기본값 TOP_K = 50)
 * @returns 가중치 내림차순 상위 K명
 */
export function selectTopK<T extends { similarity: number; confidence: number; boost: number }>(
  raters: T[],
  k?: number,
): T[] {
  const limit = k ?? TOP_K

  if (raters.length <= limit) {
    return raters.slice()
  }

  const withWeight = raters.map((r, index) => ({
    rater: r,
    weight: Math.abs(r.similarity * r.confidence * r.boost),
    index,
  }))

  withWeight.sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight
    }
    return a.index - b.index
  })

  return withWeight.slice(0, limit).map(item => item.rater)
}
