// src/domain/entities/quadrant.ts
// R1: 외부 의존 0

/**
 * 사분면 위치 + 만족도 값 객체
 * RATING_ENGINE.md §2, §3, §4
 *
 * 식당: x=음식 퀄리티%(0=낮음, 100=높음), y=경험 만족도%(0=낮음, 100=높음)
 * 와인: x=구조·완성도%(0=낮음, 100=높음), y=경험 만족도%(0=낮음, 100=높음)
 *
 * satisfaction은 (x + y) / 2로 자동 계산됨 (독립 드래그 아님)
 * 점 크기는 고정 20px (만족도에 따른 가변 크기 아님)
 */
export interface QuadrantPoint {
  /** X축: 0~100 (식당=음식 퀄리티, 와인=구조·완성도) */
  x: number

  /** Y축: 0~100 (식당=경험 만족도, 와인=경험 만족도) */
  y: number

  /** 만족도: 1~100 — (x + y) / 2로 자동 계산됨 */
  satisfaction: number
}

/**
 * 참조 점 (사분면 배경에 표시되는 과거 기록)
 * RATING_ENGINE.md §6
 * opacity 0.3, pointer-events: none, 최대 8~12개
 * 참조 점 크기는 고정 20px
 */
export interface QuadrantReferencePoint extends QuadrantPoint {
  /** 식당/와인 이름 (라벨 표시용) */
  name: string

  /** 표시 점수 (= satisfaction) */
  score: number
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
