// src/domain/entities/quadrant.ts
// R1: 외부 의존 0

/**
 * 사분면 위치 + 만족도 값 객체
 * RATING_ENGINE.md §2, §3, §4
 *
 * 식당: x=가격%(0=저렴, 100=고가), y=분위기%(0=캐주얼, 100=포멀)
 * 와인: x=산미%(0=낮음, 100=높음), y=바디%(0=Light Body, 100=Full Body)
 */
export interface QuadrantPoint {
  /** X축: 0~100 */
  x: number

  /** Y축: 0~100 */
  y: number

  /** 만족도: 1~100 (점 크기 결정) */
  satisfaction: number
}

/**
 * 참조 점 (사분면 배경에 표시되는 과거 기록)
 * RATING_ENGINE.md §6
 * opacity 0.3, pointer-events: none, 최대 8~12개
 */
export interface QuadrantReferencePoint extends QuadrantPoint {
  /** 식당/와인 이름 (라벨 표시용) */
  name: string

  /** 표시 점수 (= satisfaction) */
  score: number
}

// ─── 만족도 → 점 크기 매핑 (사분면 표시용, §4) ───

/**
 * 만족도 → 참조 점 지름 (px)
 * | 1~20: 14px | 21~40: 20px | 41~60: 26px | 61~80: 36px | 81~100: 48px |
 */
export function getRefDotSize(satisfaction: number): number {
  if (satisfaction <= 20) return 14
  if (satisfaction <= 40) return 20
  if (satisfaction <= 60) return 26
  if (satisfaction <= 80) return 36
  return 48
}

/**
 * 만족도 → Circle Rating 지름 (px)
 * 기록 플로우 인터랙티브 점
 * 28px (score 0) → 120px (score 100)
 * 공식: size = 28 + (score / 100) * 92
 */
export function getCircleRatingSize(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  return 28 + (clamped / 100) * 92
}

/**
 * 만족도 → 게이지 단계 (1~5)
 * | 0~20: 1 | 21~40: 2 | 41~60: 3 | 61~80: 4 | 81~100: 5 |
 */
export function getGaugeLevel(satisfaction: number): 1 | 2 | 3 | 4 | 5 {
  if (satisfaction <= 20) return 1
  if (satisfaction <= 40) return 2
  if (satisfaction <= 60) return 3
  if (satisfaction <= 80) return 4
  return 5
}
