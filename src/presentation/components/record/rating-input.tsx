'use client'

import { QuadrantInput } from '@/presentation/components/record/quadrant-input'

/**
 * RatingInput — Nyam 핵심 평가 컴포넌트
 *
 * 구성:
 *   1. 사분면 (X=음식 퀄리티, Y=경험 만족도) + 터치/드래그로 점 배치
 *   2. 바 게이지 2개 (음식 퀄리티, 경험 만족도) + 터치로 개별 조절
 *   3. 총점 = (X + Y) / 2
 *   4. 가격대 3단계 (저가/중간/고가) — restaurant만
 *   5. 힌트 말풍선 (온보딩 안내)
 *
 * 사용:
 *   <RatingInput
 *     type="restaurant"
 *     value={{ x: 50, y: 50 }}
 *     onChange={(v) => setValue(v)}
 *   />
 */

interface RatingInputProps {
  type: 'restaurant' | 'wine'
  value: { x: number; y: number; satisfaction?: number }
  onChange: (value: { x: number; y: number; satisfaction?: number }) => void
  referencePoints?: Array<{
    x: number
    y: number
    satisfaction: number
    name: string
    score: number
    targetId?: string
    targetType?: 'restaurant' | 'wine'
    isMicroDot?: boolean
    dotSource?: 'mine' | 'bubble' | 'nyam'
  }>
  showHint?: boolean
  hideDot?: boolean
  readOnly?: boolean
  onRefNavigate?: (targetId: string, targetType: 'restaurant' | 'wine') => void
  onRefLongPress?: (refIndex: number) => void
  quadrantMode?: 'visits' | 'compare'
  onQuadrantModeChange?: (mode: 'visits' | 'compare') => void
}

export function RatingInput({ type, value, onChange, referencePoints, showHint, hideDot, readOnly, onRefNavigate, onRefLongPress, quadrantMode, onQuadrantModeChange }: RatingInputProps) {
  return (
    <QuadrantInput
      type={type}
      value={value}
      onChange={onChange}
      referencePoints={referencePoints}
      showHint={showHint}
      hideDot={hideDot}
      readOnly={readOnly}
      onRefNavigate={onRefNavigate}
      onRefLongPress={onRefLongPress}
      quadrantMode={quadrantMode}
      onQuadrantModeChange={onQuadrantModeChange}
    />
  )
}
