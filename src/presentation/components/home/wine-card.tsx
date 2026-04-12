'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Wine, Share2 } from 'lucide-react'
import { BookmarkButton } from '@/presentation/components/detail/bookmark-button'
import { SourceTag } from '@/presentation/components/home/source-tag'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'
import { MiniScoreBadges } from '@/presentation/components/home/mini-score-badges'
import type { ScoreSource } from '@/domain/entities/score'

export interface WineBubbleMember {
  nickname: string
  avatarColor: string
  satisfaction: number
}

export interface WineCardProps {
  id: string
  wine: {
    id: string
    name: string
    wineType: string
    vintage: number | null
    country: string | null
    variety: string | null
    region: string | null
    photoUrl: string | null
  }
  myRecord: {
    satisfaction: number | null
    axisX: number | null
    axisY: number | null
    visitDate: string | null
    purchasePrice: number | null
  } | null
  bubbleMembers?: WineBubbleMember[]
  visitCount?: number
  latestDate?: string | null
  scoreSource?: ScoreSource
  /** 타인 기록 여부 */
  isNotMine?: boolean
  /** 타인 기록 카드용 찜 상태 */
  isBookmarked?: boolean
  /** 타인 기록 카드용 찜 토글 핸들러 */
  onBookmarkToggle?: () => void
  /** 타인 기록 카드용 공유 핸들러 */
  onShareClick?: () => void
  myScore?: number | null
  nyamScore?: number | null
  bubbleScore?: number | null
}

export function WineCard({ wine, myRecord, bubbleMembers, visitCount, latestDate, scoreSource, isNotMine, isBookmarked, onBookmarkToggle, onShareClick, myScore, nyamScore, bubbleScore }: WineCardProps) {
  const router = useRouter()
  const hasQuadrant =
    myRecord?.axisX != null && myRecord?.axisY != null && myRecord?.satisfaction != null
  const isCellar = false  // TODO: bookmarks 테이블에서 cellar 여부 판단

  const sortedMembers = [...(bubbleMembers ?? [])].sort((a, b) => b.satisfaction - a.satisfaction)
  const visibleMembers = sortedMembers.slice(0, 2)
  const extraCount = sortedMembers.length - 2

  const meta = [wine.vintage, wine.country, wine.variety].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={() => router.push(`/wines/${wine.id}`)}
      className="flex w-full overflow-hidden rounded-2xl text-left transition-transform active:scale-[0.985]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        minHeight: '170px',
      }}
    >
      <div className="relative w-[46%] shrink-0">
        {wine.photoUrl ? (
          <Image src={wine.photoUrl} alt="" fill className="object-cover" sizes="46vw" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2a2030, #1a1520)' }}
          >
            <Wine size={32} color="rgba(255,255,255,0.4)" />
          </div>
        )}
        {/* 찜+공유 오버레이 (hero 동일) */}
        {onBookmarkToggle && (
          <>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: '48px', background: 'linear-gradient(transparent, rgba(0,0,0,0.35))' }}
            />
            <div
              className="absolute z-[2] flex items-center gap-2.5"
              style={{ bottom: '6px', right: '8px' }}
            >
              {onShareClick && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onShareClick() }}
                >
                  <Share2 size={16} style={{ color: 'rgba(255,255,255,0.85)' }} />
                </button>
              )}
              <span onClick={(e) => e.stopPropagation()}>
                <BookmarkButton
                  isBookmarked={isBookmarked ?? false}
                  onToggle={onBookmarkToggle}
                  variant="hero"
                  size={16}
                />
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5" style={{ minWidth: 0 }}>
        <p className="truncate text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          {wine.name}
        </p>
        <p className="mb-2.5 truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>{meta}</p>

        <div className="mb-2.5 flex items-center gap-2.5">
          {hasQuadrant && (
            <MiniQuadrant
              axisX={myRecord!.axisX!}
              axisY={myRecord!.axisY!}
              satisfaction={myRecord!.satisfaction!}
              accentColor="var(--accent-wine)"
            />
          )}
          {myRecord?.satisfaction != null && (
            <span
              className="text-[32px] font-extrabold leading-none"
              style={{ color: 'var(--accent-wine)' }}
            >
              {myRecord.satisfaction}
            </span>
          )}
        </div>

        <MiniScoreBadges
          myScore={myScore ?? null}
          nyamScore={nyamScore ?? null}
          bubbleScore={bubbleScore ?? null}
          accentType="wine"
        />

        {(latestDate || (visitCount != null && visitCount > 0)) && (
          <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
            {[latestDate, visitCount != null && visitCount > 0 ? `${visitCount}회` : null].filter(Boolean).join(' · ')}
          </p>
        )}

        {isCellar && (
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-sub)' }}>
            <SourceTag type="cellar">셀러</SourceTag>
            <span className="truncate">
              {myRecord?.purchasePrice != null
                ? `${myRecord.purchasePrice.toLocaleString()}원`
                : '보관 중'}
              {myRecord?.visitDate ? ` · ${myRecord.visitDate}` : ''}
            </span>
          </div>
        )}

        {visibleMembers.length > 0 && (
          <div className="mt-auto flex items-center gap-1.5 pt-1.5">
            {visibleMembers.map((member) => (
              <div key={member.nickname} className="flex items-center gap-1">
                <div
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {member.nickname.charAt(0)}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--text-sub)' }}>
                  {member.satisfaction}
                </span>
              </div>
            ))}
            {extraCount > 0 && (
              <span className="text-[11px] font-bold" style={{ color: 'var(--text-hint)' }}>
                +{extraCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
