import { describe, it, expect } from 'vitest'

import {
  computeMeanCentered,
  computeConfidence,
  computeSimilarity,
  computePrediction,
  computePredictionConfidence,
  getRelationBoost,
  filterByMinOverlap,
  selectTopK,
  computeNicheRatio,
} from '@/domain/services/cf-calculator'

import type { RaterInput, ScorePoint } from '@/domain/entities/similarity'

describe('cf-calculator', () => {
  describe('computeMeanCentered', () => {
    it('빈 배열 → { x: 50, y: 50 }', () => {
      const result = computeMeanCentered([])
      expect(result).toEqual({ x: 50, y: 50 })
    })

    it('단일 점수 → 그 점수 그대로', () => {
      const result = computeMeanCentered([{ x: 70, y: 30 }])
      expect(result).toEqual({ x: 70, y: 30 })
    })

    it('여러 점수 → 산술 평균', () => {
      const scores: ScorePoint[] = [
        { x: 60, y: 40 },
        { x: 80, y: 60 },
        { x: 70, y: 50 },
      ]
      const result = computeMeanCentered(scores)
      expect(result.x).toBeCloseTo(70, 2)
      expect(result.y).toBeCloseTo(50, 2)
    })
  })

  describe('computeConfidence', () => {
    it('n=0 → 0', () => {
      expect(computeConfidence(0)).toBe(0)
    })

    it('n=3 → 3/10 = 0.3', () => {
      expect(computeConfidence(3)).toBeCloseTo(0.3, 5)
    })

    it('n=7 → 7/14 = 0.5', () => {
      expect(computeConfidence(7)).toBeCloseTo(0.5, 5)
    })

    it('n=20 → 20/27 ≈ 0.741', () => {
      expect(computeConfidence(20)).toBeCloseTo(20 / 27, 3)
    })
  })

  describe('computeSimilarity', () => {
    it('빈 배열 → { similarity: 0, confidence: 0, nOverlap: 0 }', () => {
      const result = computeSimilarity([], [])
      expect(result).toEqual({ similarity: 0, confidence: 0, nOverlap: 0 })
    })

    it('동일한 편차 → similarity = 1.0', () => {
      const devs: ScorePoint[] = [
        { x: 10, y: -5 },
        { x: -3, y: 8 },
      ]
      const result = computeSimilarity(devs, devs)
      expect(result.similarity).toBeCloseTo(1.0, 5)
      expect(result.nOverlap).toBe(2)
    })

    it('거리 = D(60) → similarity = 0', () => {
      // 두 점의 거리가 정확히 60이 되도록 설정
      const a: ScorePoint[] = [{ x: 0, y: 0 }]
      const b: ScorePoint[] = [{ x: 60, y: 0 }]
      const result = computeSimilarity(a, b)
      expect(result.similarity).toBeCloseTo(0, 5)
    })

    it('거리 > D → similarity = 0 (max(0, ...) 클램프)', () => {
      const a: ScorePoint[] = [{ x: 0, y: 0 }]
      const b: ScorePoint[] = [{ x: 80, y: 0 }]
      const result = computeSimilarity(a, b)
      expect(result.similarity).toBe(0)
    })

    it('3개 겹침, 거리 30 → similarity = 0.5, confidence ≈ 0.3', () => {
      // 각 쌍의 거리가 정확히 30이 되도록
      const a: ScorePoint[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: -5, y: 5 },
      ]
      const b: ScorePoint[] = [
        { x: 30, y: 0 },
        { x: 40, y: 10 },
        { x: 25, y: 5 },
      ]
      const result = computeSimilarity(a, b)
      expect(result.similarity).toBeCloseTo(0.5, 2)
      expect(result.confidence).toBeCloseTo(0.3, 2)
      expect(result.nOverlap).toBe(3)
    })
  })

  describe('computePrediction', () => {
    it('평가자 0명 → null 반환', () => {
      const myMean: ScorePoint = { x: 60, y: 40 }
      const result = computePrediction(myMean, [])
      expect(result).toBeNull()
    })

    it('단일 평가자, weight > 0 → 예측 = myMean + deviation', () => {
      const myMean: ScorePoint = { x: 50, y: 50 }
      const raters: RaterInput[] = [
        {
          deviation: { x: 10, y: -5 },
          similarity: 0.8,
          confidence: 0.5,
          boost: 1.0,
        },
      ]
      const result = computePrediction(myMean, raters)
      // 단일 평가자: 예측 = myMean + deviation (weight가 하나이므로 그대로)
      expect(result.predictedX).toBeCloseTo(60, 2)
      expect(result.predictedY).toBeCloseTo(45, 2)
      expect(result.nRaters).toBe(1)
    })

    it('여러 평가자, 다양한 부스트 → 가중 평균 검증', () => {
      const myMean: ScorePoint = { x: 50, y: 50 }
      const raters: RaterInput[] = [
        {
          deviation: { x: 20, y: 10 },
          similarity: 0.8,
          confidence: 0.5,
          boost: 1.5, // following: weight = 0.6
        },
        {
          deviation: { x: -10, y: 5 },
          similarity: 0.6,
          confidence: 0.4,
          boost: 1.0, // none: weight = 0.24
        },
      ]
      // weight1 = 0.8 * 0.5 * 1.5 = 0.6
      // weight2 = 0.6 * 0.4 * 1.0 = 0.24
      // sumAbsWeight = 0.84
      // predictedX = 50 + (0.6 * 20 + 0.24 * (-10)) / 0.84
      //            = 50 + (12 - 2.4) / 0.84
      //            = 50 + 9.6 / 0.84
      //            ≈ 50 + 11.43 ≈ 61.43
      // predictedY = 50 + (0.6 * 10 + 0.24 * 5) / 0.84
      //            = 50 + (6 + 1.2) / 0.84
      //            = 50 + 7.2 / 0.84
      //            ≈ 50 + 8.57 ≈ 58.57
      const result = computePrediction(myMean, raters)
      expect(result.predictedX).toBeCloseTo(61.43, 1)
      expect(result.predictedY).toBeCloseTo(58.57, 1)
      expect(result.nRaters).toBe(2)
    })

    it('예측값 0~100 클램프 검증', () => {
      const myMean: ScorePoint = { x: 95, y: 5 }
      const raters: RaterInput[] = [
        {
          deviation: { x: 30, y: -30 },
          similarity: 0.9,
          confidence: 0.8,
          boost: 1.0,
        },
      ]
      const result = computePrediction(myMean, raters)
      // rawX = 95 + 30 = 125 → 클램프 100
      // rawY = 5 + (-30) = -25 → 클램프 0
      expect(result.predictedX).toBe(100)
      expect(result.predictedY).toBe(0)
      expect(result.satisfaction).toBe(50)
    })
  })

  describe('computePredictionConfidence', () => {
    it('평가자 0명 → 0', () => {
      expect(computePredictionConfidence([])).toBe(0)
    })

    it('평가자 동일 편차 → agreement 높음', () => {
      const raters: RaterInput[] = [
        { deviation: { x: 5, y: 5 }, similarity: 0.8, confidence: 0.5, boost: 1.0 },
        { deviation: { x: 5, y: 5 }, similarity: 0.7, confidence: 0.5, boost: 1.0 },
        { deviation: { x: 5, y: 5 }, similarity: 0.6, confidence: 0.5, boost: 1.0 },
      ]
      const conf = computePredictionConfidence(raters)
      // 편차가 동일 → varianceX = varianceY = 0 → stdDev = 0 → agreement = 1.0
      // n_factor = 3 / (3 + 7) = 0.3
      // avgWeight = sum_abs_weight / 3
      // weight1 = 0.4, weight2 = 0.35, weight3 = 0.3 → sum = 1.05, avg = 0.35
      // quality = 0.35 / (0.35 + 0.3) ≈ 0.538
      // confidence = 0.3 * 0.50 + 1.0 * 0.35 + 0.538 * 0.15
      //            = 0.15 + 0.35 + 0.0808 = 0.5808
      expect(conf).toBeGreaterThan(0.5)
      expect(conf).toBeLessThanOrEqual(1)
    })

    it('평가자 편차 분산 큼 → agreement 낮음', () => {
      const raters: RaterInput[] = [
        { deviation: { x: 40, y: 40 }, similarity: 0.8, confidence: 0.5, boost: 1.0 },
        { deviation: { x: -40, y: -40 }, similarity: 0.7, confidence: 0.5, boost: 1.0 },
      ]
      const confHigh = computePredictionConfidence([
        { deviation: { x: 5, y: 5 }, similarity: 0.8, confidence: 0.5, boost: 1.0 },
        { deviation: { x: 5, y: 5 }, similarity: 0.7, confidence: 0.5, boost: 1.0 },
      ])
      const confLow = computePredictionConfidence(raters)
      expect(confLow).toBeLessThan(confHigh)
    })
  })

  describe('getRelationBoost', () => {
    it('following → 1.5', () => {
      expect(getRelationBoost('following')).toBe(1.5)
    })

    it('none → 1.0', () => {
      expect(getRelationBoost('none')).toBe(1.0)
    })

    it('uniformBoost=true → 항상 1.0', () => {
      expect(getRelationBoost('following', true)).toBe(1.0)
      expect(getRelationBoost('none', true)).toBe(1.0)
    })
  })

  describe('computeConfidence with nicheRatio', () => {
    it('nicheRatio 미지정 → 기본 신뢰도만', () => {
      expect(computeConfidence(7)).toBeCloseTo(0.5, 5)
    })

    it('nicheRatio=1.0 → 기본 신뢰도 그대로', () => {
      expect(computeConfidence(7, undefined, 1.0)).toBeCloseTo(0.5, 5)
    })

    it('nicheRatio=0.5 → 기본 신뢰도 × 0.5', () => {
      expect(computeConfidence(7, undefined, 0.5)).toBeCloseTo(0.25, 5)
    })

    it('nicheRatio=0 → 신뢰도 0', () => {
      expect(computeConfidence(7, undefined, 0)).toBeCloseTo(0, 5)
    })
  })

  describe('computeNicheRatio', () => {
    it('빈 겹침 → 1', () => {
      expect(computeNicheRatio([], 100)).toBe(1)
    })

    it('모두 니치(10% 이하) → 1', () => {
      // 전체 유저 100명, 겹침 아이템 기록자 수 [5, 8, 10]
      expect(computeNicheRatio([5, 8, 10], 100)).toBe(1)
    })

    it('모두 대중(10% 초과) → 0', () => {
      // 전체 유저 100명, 겹침 아이템 기록자 수 [50, 80]
      expect(computeNicheRatio([50, 80], 100)).toBe(0)
    })

    it('혼합 → 니치 비율', () => {
      // 전체 유저 100명, [5, 50, 8, 80] → 니치 2개 / 전체 4개 = 0.5
      expect(computeNicheRatio([5, 50, 8, 80], 100)).toBe(0.5)
    })
  })

  describe('filterByMinOverlap', () => {
    it('빈 배열 → 빈 배열', () => {
      expect(filterByMinOverlap([])).toEqual([])
    })

    it('모두 겹침 >= 1 → 전체 반환', () => {
      const raters = [
        { nOverlap: 5, id: 'a' },
        { nOverlap: 10, id: 'b' },
      ]
      expect(filterByMinOverlap(raters)).toEqual(raters)
    })

    it('일부 겹침 < 1 → 해당 평가자 제거', () => {
      const raters = [
        { nOverlap: 0, id: 'a' },
        { nOverlap: 5, id: 'b' },
        { nOverlap: 1, id: 'c' },
      ]
      const result = filterByMinOverlap(raters)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('b')
      expect(result[1].id).toBe('c')
    })

    it('기본값 1 검증 (minOverlap 미지정 시)', () => {
      const raters = [
        { nOverlap: 1, id: 'a' },
        { nOverlap: 0, id: 'b' },
      ]
      const result = filterByMinOverlap(raters)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a')
    })

    it('커스텀 minOverlap = 5 → 5 미만 제거', () => {
      const raters = [
        { nOverlap: 3, id: 'a' },
        { nOverlap: 5, id: 'b' },
        { nOverlap: 7, id: 'c' },
      ]
      const result = filterByMinOverlap(raters, 5)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('b')
      expect(result[1].id).toBe('c')
    })
  })

  describe('selectTopK', () => {
    it('빈 배열 → 빈 배열', () => {
      expect(selectTopK([])).toEqual([])
    })

    it('평가자 수 <= K → 전체 반환', () => {
      const raters = [
        { similarity: 0.8, confidence: 0.5, boost: 1.0, id: 'a' },
        { similarity: 0.6, confidence: 0.4, boost: 1.2, id: 'b' },
      ]
      const result = selectTopK(raters)
      expect(result).toHaveLength(2)
    })

    it('평가자 수 > K → 가중치 상위 K명만', () => {
      const raters = [
        { similarity: 0.1, confidence: 0.1, boost: 1.0, id: 'low' },
        { similarity: 0.9, confidence: 0.9, boost: 1.5, id: 'high' },
        { similarity: 0.5, confidence: 0.5, boost: 1.0, id: 'mid' },
      ]
      const result = selectTopK(raters, 2)
      expect(result).toHaveLength(2)
      // high: 0.9 * 0.9 * 1.5 = 1.215
      // mid: 0.5 * 0.5 * 1.0 = 0.25
      // low: 0.1 * 0.1 * 1.0 = 0.01
      expect(result[0].id).toBe('high')
      expect(result[1].id).toBe('mid')
    })

    it('기본값 50 검증 (k 미지정 시)', () => {
      // 51개 생성, 하나만 잘려야 함
      const raters = Array.from({ length: 51 }, (_, i) => ({
        similarity: (i + 1) / 51,
        confidence: 0.5,
        boost: 1.0,
        id: `r${i}`,
      }))
      const result = selectTopK(raters)
      expect(result).toHaveLength(50)
      // 가장 낮은 weight (r0: similarity = 1/51)가 제거되어야 함
      const ids = result.map(r => r.id)
      expect(ids).not.toContain('r0')
    })

    it('동일 가중치 → 순서 안정 (원본 순서 유지)', () => {
      const raters = [
        { similarity: 0.5, confidence: 0.5, boost: 1.0, id: 'first' },
        { similarity: 0.5, confidence: 0.5, boost: 1.0, id: 'second' },
        { similarity: 0.5, confidence: 0.5, boost: 1.0, id: 'third' },
      ]
      const result = selectTopK(raters, 2)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('first')
      expect(result[1].id).toBe('second')
    })
  })
})
