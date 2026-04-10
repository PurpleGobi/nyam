'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine, Heart, MessageCircle, ArrowRight, Share2 } from 'lucide-react'
import { SourceTag } from '@/presentation/components/home/source-tag'
import { PlaceBadge } from '@/presentation/components/home/place-badge'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'
import type { SourceType } from '@/presentation/components/home/source-tag'
import type { BadgeType } from '@/presentation/components/home/place-badge'
import type { ScoreSource } from '@/domain/entities/score'
import { ScoreSourceBadge } from '@/presentation/components/home/score-source-badge'
import { PrestigeBadges } from '@/presentation/components/ui/prestige-badges'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'

export interface SourceInfo {
  type: SourceType
  label: string
  detail: string
}

export interface BadgeInfo {
  type: BadgeType
  label: string
}

export interface SharedBubbleChip {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
}

export interface RecordCardProps {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  status: 'visited' | 'bookmark' | 'cellar' | 'tasted'
  sources?: SourceInfo[]
  badges?: BadgeInfo[]
  likeCount?: number
  commentCount?: number
  isNotMine?: boolean
  sharedBubbles?: SharedBubbleChip[]
  onShareClick?: () => void
  visitCount?: number
  scoreSource?: ScoreSource
  latestDate?: string | null
  distanceKm?: number | null
  prestige?: RestaurantPrestige[]
}

export function RecordCard({
  targetId,
  targetType,
  name,
  meta,
  photoUrl,
  satisfaction,
  axisX,
  axisY,
  status,
  sources,
  badges,
  likeCount,
  commentCount,
  isNotMine,
  sharedBubbles,
  onShareClick,
  visitCount,
  scoreSource,
  latestDate,
  distanceKm,
  prestige,
}: RecordCardProps) {
  const router = useRouter()
  const isFood = targetType === 'restaurant'
  const accentColor = isFood ? 'var(--accent-food)' : 'var(--accent-wine)'
  const hasQuadrant = axisX != null && axisY != null && satisfaction != null
  const isUnrated = satisfaction === null

  return (
    <button
      type="button"
      onClick={() => router.push(`/${isFood ? 'restaurants' : 'wines'}/${targetId}`)}
      className="flex w-full overflow-hidden rounded-2xl text-left transition-transform active:scale-[0.985]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        minHeight: '170px',
      }}
    >
      <div className="relative w-[46%] shrink-0">
        {photoUrl ? (
          <Image src={photoUrl} alt="" fill className="object-cover" sizes="46vw" />
        ) : isUnrated ? (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg))' }}
          >
            {isFood ? (
              <UtensilsCrossed size={28} style={{ color: 'var(--text-hint)' }} />
            ) : (
              <Wine size={28} style={{ color: 'var(--text-hint)' }} />
            )}
          </div>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            {isFood ? (
              <UtensilsCrossed size={28} style={{ color: 'var(--text-hint)' }} />
            ) : (
              <Wine size={28} style={{ color: 'var(--text-hint)' }} />
            )}
          </div>
        )}
        {badges && badges.length > 0 && (
          <div className="absolute left-2 top-2 z-[2] flex flex-col gap-1">
            {badges.map((badge) => (
              <PlaceBadge key={badge.type} type={badge.type} label={badge.label} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5" style={{ minWidth: 0 }}>
        <p className="flex items-center gap-1 truncate text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          <span className="truncate">{name}</span>
          {prestige && prestige.length > 0 && <PrestigeBadges prestige={prestige} />}
        </p>
        <p className="mb-2.5 truncate text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {meta}
          {distanceKm != null && (
            <span style={{ color: 'var(--text-hint)' }}>
              {' · '}{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
        </p>

        {isUnrated ? (
          <div className="flex flex-1 items-center">
            <span
              className="flex items-center gap-1 text-[13px] font-semibold"
              style={{ color: 'var(--text-hint)' }}
            >
              평가하기 <ArrowRight size={14} />
            </span>
          </div>
        ) : (
          <>
            <div className="mb-2.5 flex items-center gap-2.5">
              {hasQuadrant && (
                <MiniQuadrant
                  axisX={axisX}
                  axisY={axisY}
                  satisfaction={satisfaction}
                  accentColor={accentColor}
                />
              )}
              {satisfaction != null && (
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[32px] font-extrabold leading-none"
                    style={{ color: isNotMine ? 'var(--text-hint)' : accentColor }}
                  >
                    {satisfaction}
                  </span>
                  {scoreSource && scoreSource !== 'mine' && (
                    <ScoreSourceBadge source={scoreSource} />
                  )}
                </div>
              )}
            </div>

            {(latestDate || (visitCount != null && visitCount > 0)) && (
              <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                {[latestDate, visitCount != null && visitCount > 0 ? `${visitCount}회` : null].filter(Boolean).join(' · ')}
              </p>
            )}
          </>
        )}

        {/* 버블 스티커 + 공유 버튼 */}
        {(sharedBubbles && sharedBubbles.length > 0 || onShareClick) && (
          <div className="mt-auto flex items-center gap-1.5 pt-1.5">
            {sharedBubbles?.map((b) => (
              <span
                key={b.bubbleId}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
              >
                {b.bubbleName}
              </span>
            ))}
            {onShareClick && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onShareClick() }}
                className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                style={{ color: 'var(--text-hint)', backgroundColor: 'var(--bg-elevated)' }}
              >
                <Share2 size={10} /> 공유
              </button>
            )}
          </div>
        )}

        {(likeCount != null || commentCount != null) && (
          <div className={`flex items-center gap-2.5 ${sharedBubbles && sharedBubbles.length > 0 ? 'pt-1' : 'mt-auto pt-1.5'} text-[11px]`} style={{ color: 'var(--text-hint)' }}>
            {likeCount != null && (
              <span className="flex items-center gap-1">
                <Heart size={12} /> {likeCount}
              </span>
            )}
            {commentCount != null && (
              <span className="flex items-center gap-1">
                <MessageCircle size={12} /> {commentCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
