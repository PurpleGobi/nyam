// src/domain/entities/wine-structure.ts
// R1: 외부 의존 0

/**
 * 와인 구조 평가 값 객체
 * RATING_ENGINE.md §8 구조 평가 (Structure)
 *
 * 3개 슬라이더, 모두 0~100 범위
 * records.complexity, records.finish, records.balance에 각각 매핑
 */
export interface WineStructure {
  /**
   * 복합성: 0~100
   * 라벨: 1차향(과일/꽃) ← → 2차향(발효) ← → 3차향(숙성)
   * AI 초기값: 아로마 휠 선택 링 수 기반
   *   - 1링만 선택 → ~30
   *   - 2링 선택 → ~60
   *   - 3링 선택 → ~85
   */
  complexity: number

  /**
   * 여운: 0~100 (내부값)
   * 표시: 초 환산 — finishToSeconds()로 변환 (0→1초, 100→15초)
   * 라벨: 짧음(<3초) ← → 보통(5~8초) ← → 긴(10초+)
   */
  finish: number

  /**
   * 균형: 0~100
   * 라벨: 산미 치우침 ← → 조화 ← → 타닌/알코올 치우침
   * 중간값(50) = 완벽한 조화 상태
   */
  balance: number
}

/**
 * 자동 만족도 산출
 * RATING_ENGINE.md §8 만족도 자동 산출 공식
 *
 * 복합성 보너스는 아로마 링 선택 수 기반 (슬라이더 값이 아님):
 *   - 1링만 선택 → +0
 *   - 2링 선택 → +7
 *   - 3링 선택 → +15
 *
 * @param activeRingCount 아로마 선택에서 활성화된 링 수 (1, 2, or 3)
 * @param finish 여운 0~100
 * @param balance 균형 0~100
 * @returns 1~100 범위의 자동 산출 만족도
 */
export function calculateAutoScore(
  activeRingCount: number,
  finish: number,
  balance: number,
): number {
  const complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
  const raw = 50 + complexityBonus + (finish * 0.1) + (balance * 0.15)
  return Math.round(Math.max(1, Math.min(100, raw)))
}

/**
 * 여운 내부값(0~100) → 초 환산
 * 단순 선형 공식: sec = Math.round(1 + (value / 100) * 14)
 * 결과 범위: 1초 ~ 15초
 */
export function finishToSeconds(value: number): number {
  return Math.round(1 + (value / 100) * 14)
}

/**
 * 아로마 링 수 → 복합성 AI 초기값
 * RATING_ENGINE.md §8 복합성 AI 초기값
 */
export function getComplexityInitialValue(activeRingCount: number): number {
  if (activeRingCount <= 1) return 30
  if (activeRingCount === 2) return 60
  return 85
}
