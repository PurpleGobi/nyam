/**
 * 점수(0~100)를 게이지 색상으로 변환한다.
 * 채널별 색상 체계:
 *   food (음식 퀄리티): 모노톤 → 강렬한 오렌지레드
 *   experience (경험 가치): 모노톤 → 강렬한 블루
 *   total (총점/조합): 모노톤 → 강렬한 골드
 *   default: food와 동일 (하위 호환)
 */

export type GaugeChannel = 'food' | 'experience' | 'total' | 'default'

const CHANNEL_STEPS: Record<GaugeChannel, string[]> = {
  food:       ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
  experience: ['#B5B0BA', '#A08DA8', '#8B7396', '#7A5A8E', '#6B3FA0'],
  total:      ['#C4BCA8', '#D4B85C', '#E0A820', '#D49215', '#C87A0A'],
  default:    ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
}

export const GAUGE_COLORS = {
  1: '#C4B5A8',
  2: '#E8A87C',
  3: '#E8913A',
  4: '#E06B20',
  5: '#D4451A',
} as const

interface GaugeStep {
  max: number
  color: string
  cssVar: string
  tailwind: string
}

const GAUGE_STEPS: GaugeStep[] = [
  { max: 20, color: '#C4B5A8', cssVar: '--gauge-1', tailwind: 'gauge-1' },
  { max: 40, color: '#E8A87C', cssVar: '--gauge-2', tailwind: 'gauge-2' },
  { max: 60, color: '#E8913A', cssVar: '--gauge-3', tailwind: 'gauge-3' },
  { max: 80, color: '#E06B20', cssVar: '--gauge-4', tailwind: 'gauge-4' },
  { max: 100, color: '#D4451A', cssVar: '--gauge-5', tailwind: 'gauge-5' },
]

function getStepIndex(score: number): number {
  const clamped = Math.max(0, Math.min(100, score))
  if (clamped <= 20) return 0
  if (clamped <= 40) return 1
  if (clamped <= 60) return 2
  if (clamped <= 80) return 3
  return 4
}

export function getGaugeColor(score: number, channel: GaugeChannel = 'default'): string {
  return CHANNEL_STEPS[channel][getStepIndex(score)]
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

