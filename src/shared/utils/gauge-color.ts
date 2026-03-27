/**
 * 만족도 점수(0~100)를 게이지 색상으로 변환한다.
 * DESIGN_SYSTEM.md §1 만족도 게이지 5단계 색상 매핑.
 */

export const GAUGE_COLORS = {
  1: '#C4B5A8',
  2: '#B0ADA4',
  3: '#9FA5A3',
  4: '#889DAB',
  5: '#7A9BAE',
} as const

interface GaugeStep {
  max: number
  color: string
  cssVar: string
  tailwind: string
}

const GAUGE_STEPS: GaugeStep[] = [
  { max: 20, color: '#C4B5A8', cssVar: '--gauge-1', tailwind: 'gauge-1' },
  { max: 40, color: '#B0ADA4', cssVar: '--gauge-2', tailwind: 'gauge-2' },
  { max: 60, color: '#9FA5A3', cssVar: '--gauge-3', tailwind: 'gauge-3' },
  { max: 80, color: '#889DAB', cssVar: '--gauge-4', tailwind: 'gauge-4' },
  { max: 100, color: '#7A9BAE', cssVar: '--gauge-5', tailwind: 'gauge-5' },
]

export function getGaugeColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const step = GAUGE_STEPS.find((g) => clamped <= g.max)
  return step ? step.color : GAUGE_STEPS[4].color
}

export function getGaugeCssVar(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const step = GAUGE_STEPS.find((g) => clamped <= g.max)
  return step ? step.cssVar : GAUGE_STEPS[4].cssVar
}

export function getGaugeTailwindClass(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const step = GAUGE_STEPS.find((g) => clamped <= g.max)
  return step ? step.tailwind : GAUGE_STEPS[4].tailwind
}
