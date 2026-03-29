// src/domain/entities/quadrant.ts
// R1: 외부 의존 0

/**
 * 사분면 위치 + 만족도 값 객체
 * RATING_ENGINE.md §2, §3, §4
 *
 * 식당: x=음식 퀄리티%(0=낮음, 100=높음), y=경험 가치%(0=낮음, 100=높음)
 * 와인: x=구조·완성도%(0=낮음, 100=높음), y=즐거움·감성%(0=낮음, 100=높음)
 *
 * satisfaction은 (x + y) / 2로 자동 계산됨 (독립 드래그 아님)
 * 점 크기는 고정 20px (만족도에 따른 가변 크기 아님)
 */
export interface QuadrantPoint {
  /** X축: 0~100 (식당=음식 퀄리티, 와인=구조·완성도) */
  x: number

  /** Y축: 0~100 (식당=경험 가치, 와인=즐거움·감성) */
  y: number

  /** 만족도: 1~100 — (x + y) / 2로 자동 계산됨 */
  satisfaction: number
}

/**
 * 참조 점 (사분면 배경에 표시되는 과거 기록)
 * RATING_ENGINE.md §6
 * opacity 0.3, pointer-events: none, 최대 8~12개
 * 참조 점 크기는 getRefDotSize()로 결정 (만족도 기반 가변)
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
 * 참조 점(과거 기록)에만 사용. 현재 점은 고정 20px.
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
 * NOTE: 현재 사분면 입력에서는 점 크기가 고정 20px로 변경됨.
 * 이 함수는 다른 표시 컨텍스트(상세 페이지 등)에서 사용될 수 있으므로 유지.
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
