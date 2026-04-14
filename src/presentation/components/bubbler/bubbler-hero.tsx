'use client'

import Image from 'next/image'
import { BarChart2 } from 'lucide-react'
import { FollowButton } from '@/presentation/components/follow/follow-button'
import { SimilarityIndicator } from '@/presentation/components/similarity-indicator'
import { getLevelColor } from '@/domain/services/xp-calculator'
import type { AccessLevel } from '@/domain/entities/follow'

interface BubblerHeroProps {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  tasteTags?: string[]
  accessLevel: AccessLevel
  isOwnProfile: boolean
  isFollowLoading: boolean
  onToggleFollow: () => void
  /** 통계 — hero 내부 렌더 */
  recordCount: number
  followerCount: number
  followingCount: number
  /** CF 적합도 (버블러 프로필용) */
  similarity?: number | null
  confidence?: number | null
}

export function BubblerHero({
  nickname,
  handle,
  avatarUrl,
  avatarColor,
  level,
  levelTitle,
  tasteTags,
  accessLevel,
  isOwnProfile,
  isFollowLoading,
  onToggleFollow,
  recordCount,
  followerCount,
  followingCount,
  similarity,
  confidence,
}: BubblerHeroProps) {
  const levelColor = getLevelColor(level)

  return (
    <div>
      {/* ===== 프로필 히어로: 가로 배치 (목업 .profile-hero) ===== */}
      <div className="flex items-start gap-3.5" style={{ padding: '20px 20px 0' }}>
        {/* 아바타 72×72px + 레벨 뱃지 오버레이 */}
        <div className="relative flex-shrink-0">
          <div
            className="flex items-center justify-center rounded-full text-[26px] font-bold"
            style={{
              width: '72px',
              height: '72px',
              backgroundColor: avatarColor ?? 'var(--accent-food)',
              color: '#FFFFFF',
              border: '3px solid var(--bg)',
              boxShadow: `0 0 0 2px ${levelColor}`,
            }}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={72} height={72} className="h-full w-full rounded-full object-cover" />
            ) : (
              nickname.charAt(0)
            )}
          </div>
          <div
            className="absolute whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{
              bottom: '-2px',
              right: '-4px',
              backgroundColor: levelColor,
              color: '#fff',
              border: '2px solid var(--bg)',
            }}
          >
            Lv.{level} {levelTitle}
          </div>
        </div>

        {/* 메타 + 통계 (목업 .profile-meta) */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-[800] leading-tight" style={{ color: 'var(--text)' }}>
            {nickname}
          </h1>
          {handle && (
            <p className="mb-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>@{handle}</p>
          )}

          {/* CF 적합도 (자신이 아닐 때만) */}
          {!isOwnProfile && similarity != null && confidence != null && (
            <div className="mb-1">
              <SimilarityIndicator similarity={similarity} confidence={confidence} />
            </div>
          )}

          {/* 통계 행 (목업 .profile-stats-row) */}
          <div className="flex gap-3.5">
            <StatItem label="기록" value={recordCount} />
            <StatItem label="팔로워" value={followerCount} />
            <StatItem label="팔로잉" value={followingCount} />
          </div>
        </div>
      </div>

      {/* ===== 맛 태그 (목업 .profile-taste-tags) ===== */}
      {tasteTags && tasteTags.length > 0 && (
        <div className="flex flex-wrap gap-[5px]" style={{ padding: '12px 20px 0' }}>
          {tasteTags.slice(0, 5).map((tag, i) => {
            const isHighlight = i < 2
            return (
              <span
                key={tag}
                className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                style={{
                  backgroundColor: isHighlight ? 'var(--accent-food-light)' : 'var(--bg-section)',
                  color: isHighlight ? 'var(--accent-food)' : 'var(--text-sub)',
                  border: isHighlight ? '1px solid transparent' : '1px solid var(--border)',
                }}
              >
                {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* ===== 액션 행 (목업 .profile-actions) ===== */}
      {!isOwnProfile && (
        <div className="flex gap-2" style={{ padding: '12px 20px 0' }}>
          <div className="flex-1">
            <FollowButton
              accessLevel={accessLevel}
              onToggle={onToggleFollow}
              isLoading={isFollowLoading}
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-[5px] rounded-[10px] px-3.5 py-[9px] text-[13px] font-semibold transition-colors active:opacity-75"
            style={{
              backgroundColor: 'var(--bg-section)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <BarChart2 size={14} />
            취향 비교
          </button>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[16px] font-[800] leading-none" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-sub)' }}>{label}</p>
    </div>
  )
}
