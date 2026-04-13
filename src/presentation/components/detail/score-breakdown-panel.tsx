'use client'

// R4: props만 받음. domain type import 허용.

import type { PredictionBreakdown, RaterDetail } from '@/domain/entities/similarity'

interface ScoreBreakdownPanelProps {
  isOpen: boolean
  breakdown: PredictionBreakdown | null
  accentColor: string // '--accent-food' | '--accent-wine'
}

export function ScoreBreakdownPanel({ isOpen, breakdown, accentColor }: ScoreBreakdownPanelProps) {
  if (!breakdown) return null

  const { followingRaters, otherRaters } = breakdown
  const hasFollowing = followingRaters.length > 0
  const hasOther = otherRaters.count > 0
  const totalRaters = followingRaters.length + otherRaters.count

  if (!hasFollowing && !hasOther) return null

  return (
    <div style={{ padding: '0 20px 10px' }}>
      <div
        style={{
          maxHeight: isOpen ? '300px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div className="flex flex-col gap-2 pb-2.5">
          {/* 헤더: 총 평가자 수 */}
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nyam 점수 근거
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
              평가자 {totalRaters}명 기반
            </span>
          </div>
          {/* 팔로잉 기여자 섹션 */}
          {hasFollowing && (
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-hint)' }}>
                팔로잉 (가중 ×1.5)
              </span>
              {followingRaters.map((rater) => (
                <RaterRow
                  key={rater.userId}
                  rater={rater}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}

          {/* 유사 유저 섹션 */}
          {hasOther && (
            <div
              className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex flex-col">
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>
                  유사 유저 {otherRaters.count}명
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>
                  평균 적합도 {Math.round(otherRaters.avgSimilarity * 100)}%
                </span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: `var(${accentColor})` }}>
                {Math.round(otherRaters.avgScore)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** 개별 기여자 행 (내부 컴포넌트) */
function RaterRow({
  rater,
  accentColor,
}: {
  rater: RaterDetail
  accentColor: string
}) {
  const similarityPct = Math.round(rater.similarity * 100)
  const isBoosted = rater.boost > 1.0

  return (
    <div
      className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)' }}>
          @{rater.nickname}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>
          적합도 {similarityPct}%
        </span>
        {isBoosted && (
          <span style={{ fontSize: '8px', fontWeight: 600, color: 'var(--accent-social)' }}>
            가중↑
          </span>
        )}
      </div>
      <span style={{ fontSize: '14px', fontWeight: 700, color: `var(${accentColor})` }}>
        {Math.round(rater.score)}
      </span>
    </div>
  )
}
