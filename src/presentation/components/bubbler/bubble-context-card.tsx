'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Trophy, Calendar, Heart, MapPin, CircleDot } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface BubbleContextCardProps {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  rankTotal: number | null
  memberSince: string
  tasteMatchPct: number | null
  tasteMatchCount: number | null
  commonTargetCount: number
}

export function BubbleContextCard({
  bubbleId,
  bubbleName,
  bubbleIcon,
  rank,
  rankTotal,
  memberSince,
  tasteMatchPct,
  tasteMatchCount,
  commonTargetCount,
}: BubbleContextCardProps) {
  // 멤버십 기간 계산 (개월)
  const membershipMonths = useMemo(() => {
    if (!memberSince) return '-'
    const diffMs = new Date().getTime() - new Date(memberSince).getTime()
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30))
    return months < 1 ? '1' : String(months)
  }, [memberSince])

  const isRankFirst = rank === 1

  return (
    <>
      {/* 섹션 구분선 (목업 .section-divider) */}
      <div style={{ height: '8px', backgroundColor: 'var(--bg-section)', marginTop: '16px' }} />

      <div style={{ padding: '16px 20px' }}>
        {/* 헤더 (목업 .bc-header) */}
        <div className="mb-3 flex items-center gap-1.5">
          {bubbleIcon ? (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
              <BubbleIcon icon={bubbleIcon} size={20} />
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-md"
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: 'var(--accent-social-light)',
                color: 'var(--accent-social)',
              }}
            >
              <CircleDot size={11} />
            </div>
          )}
          <span className="flex-1 text-[12px] font-bold" style={{ color: 'var(--text-sub)' }}>
            {bubbleName} 안에서
          </span>
          <Link
            href={`/bubbles/${bubbleId}`}
            className="text-[12px] font-bold no-underline"
            style={{ color: 'var(--accent-social)' }}
          >
            {bubbleName} →
          </Link>
        </div>

        {/* 2×2 그리드 (목업 .bc-grid) */}
        <div className="grid grid-cols-2 gap-2">
          {/* 이번 주 순위 */}
          <div
            className="rounded-xl"
            style={{
              padding: '10px 12px',
              background: isRankFirst
                ? 'linear-gradient(135deg, rgba(201,169,110,0.15) 0%, rgba(201,169,110,0.05) 100%)'
                : 'var(--bg-section)',
            }}
          >
            <div className="mb-1 flex items-center gap-[3px] text-[10px]" style={{ color: 'var(--text-hint)' }}>
              <Trophy size={10} /> 이번 주 순위
            </div>
            <div
              className="text-[20px] font-[800] leading-none"
              style={{ color: isRankFirst ? 'var(--caution)' : 'var(--text)' }}
            >
              {rank !== null ? (
                <>{rank}위 <span className="text-[11px] font-medium" style={{ color: 'var(--text-sub)' }}>/ {rankTotal}명</span></>
              ) : (
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-hint)' }}>-</span>
              )}
            </div>
          </div>

          {/* 멤버십 기간 */}
          <div className="rounded-xl" style={{ padding: '10px 12px', backgroundColor: 'var(--bg-section)' }}>
            <div className="mb-1 flex items-center gap-[3px] text-[10px]" style={{ color: 'var(--text-hint)' }}>
              <Calendar size={10} /> 멤버십 기간
            </div>
            <div className="text-[20px] font-[800] leading-none" style={{ color: 'var(--text)' }}>
              {membershipMonths} <span className="text-[11px] font-medium" style={{ color: 'var(--text-sub)' }}>개월</span>
            </div>
          </div>

          {/* 나와 취향 일치도 */}
          <div className="rounded-xl" style={{ padding: '10px 12px', backgroundColor: 'var(--bg-section)' }}>
            <div className="mb-1 flex items-center gap-[3px] text-[10px]" style={{ color: 'var(--text-hint)' }}>
              <Heart size={10} /> 나와 취향 일치도
            </div>
            {tasteMatchPct !== null && tasteMatchCount !== null && tasteMatchCount >= 3 ? (
              <>
                <div className="text-[20px] font-[800] leading-none" style={{ color: 'var(--accent-social)' }}>
                  {tasteMatchPct}<span className="text-[11px] font-medium">%</span>
                </div>
                {/* 진행 바 (목업 .bc-match-bar) */}
                <div className="mt-1.5 overflow-hidden rounded-sm" style={{ height: '4px', backgroundColor: 'var(--border)' }}>
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${tasteMatchPct}%`, backgroundColor: 'var(--accent-social)' }}
                  />
                </div>
              </>
            ) : (
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-hint)' }}>데이터 부족</span>
            )}
          </div>

          {/* 같이 가본 곳 */}
          <div className="rounded-xl" style={{ padding: '10px 12px', backgroundColor: 'var(--bg-section)' }}>
            <div className="mb-1 flex items-center gap-[3px] text-[10px]" style={{ color: 'var(--text-hint)' }}>
              <MapPin size={10} /> 같이 가본 곳
            </div>
            <div className="text-[20px] font-[800] leading-none" style={{ color: 'var(--text)' }}>
              {commonTargetCount} <span className="text-[11px] font-medium" style={{ color: 'var(--text-sub)' }}>곳</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
