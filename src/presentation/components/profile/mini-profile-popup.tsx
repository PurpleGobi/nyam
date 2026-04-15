'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, UtensilsCrossed, Wine, Sparkles } from 'lucide-react'
import { PopupWindow } from '@/presentation/components/ui/popup-window'
import { FollowButton } from '@/presentation/components/follow/follow-button'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useFollow } from '@/application/hooks/use-follow'
import { useMiniProfile } from '@/application/hooks/use-mini-profile'
import { useSimilarity } from '@/application/hooks/use-similarity'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface MiniProfilePopupProps {
  isOpen: boolean
  onClose: () => void
  targetUserId: string
}

export function MiniProfilePopup({ isOpen, onClose, targetUserId }: MiniProfilePopupProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { data, isLoading } = useMiniProfile(isOpen ? targetUserId : null)
  const { accessLevel, isLoading: followLoading, toggleFollow } = useFollow(user?.id ?? null, targetUserId)
  const { similarity: restaurantSim } = useSimilarity(user?.id ?? null, targetUserId, 'restaurant')
  const { similarity: wineSim } = useSimilarity(user?.id ?? null, targetUserId, 'wine')

  const isSelf = user?.id === targetUserId

  return (
    <PopupWindow isOpen={isOpen} onClose={onClose}>
      <div
        className="fixed inset-x-0 top-1/2 z-[201] mx-auto w-[calc(100%-40px)] max-w-[340px] -translate-y-1/2 overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 상단 컬러 배너 */}
            <div className="h-[6px] w-full" style={{ backgroundColor: data.levelColor }} />

            <div className="flex flex-col px-5 pb-5 pt-5">
              {/* ─── 프로필 헤더 ─── */}
              <div className="flex items-start gap-3.5">
                <div className="relative shrink-0">
                  <div
                    className="flex items-center justify-center rounded-full text-[22px] font-bold"
                    style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: data.avatarColor ?? 'var(--accent-social-light)',
                      color: 'var(--text-inverse)',
                      boxShadow: `0 0 0 2.5px var(--bg-card), 0 0 0 4px ${data.levelColor}`,
                    }}
                  >
                    {data.avatarUrl ? (
                      <Image src={data.avatarUrl} alt="" width={56} height={56} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      data.nickname.charAt(0)
                    )}
                  </div>
                  <div
                    className="absolute whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                    style={{
                      bottom: '-2px',
                      right: '-4px',
                      backgroundColor: data.levelColor,
                      color: 'var(--text-inverse)',
                      border: '2px solid var(--bg-card)',
                    }}
                  >
                    Lv.{data.level}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[16px] font-[800] leading-tight" style={{ color: 'var(--text)' }}>
                    {data.nickname}
                  </h3>
                  {data.handle && (
                    <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-hint)' }}>
                      @{data.handle}
                    </p>
                  )}
                  <span
                    className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${data.levelColor} 12%, var(--bg-card))`,
                      color: data.levelColor,
                    }}
                  >
                    {data.levelTitle}
                  </span>
                </div>
              </div>

              {/* ─── 기록 통계 (식당/와인 분리) ─── */}
              <div
                className="mt-4 flex gap-2"
              >
                <RecordStatCard
                  icon={<UtensilsCrossed size={13} />}
                  label="식당"
                  count={data.restaurantCount}
                  avgSatisfaction={data.restaurantAvgSatisfaction}
                  accentColor="var(--accent-food)"
                />
                <RecordStatCard
                  icon={<Wine size={13} />}
                  label="와인"
                  count={data.wineCount}
                  avgSatisfaction={data.wineAvgSatisfaction}
                  accentColor="var(--accent-wine)"
                />
              </div>

              {/* ─── 취향 적합도 ─── */}
              {!isSelf && (restaurantSim || wineSim) && (
                <div
                  className="mt-3 rounded-xl px-3.5 py-3"
                  style={{ backgroundColor: 'var(--bg-section)', border: '1px solid var(--border)' }}
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} style={{ color: 'var(--accent-social)' }} />
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-sub)' }}>
                      나와의 취향 적합도
                    </span>
                  </div>
                  <div className="flex gap-3">
                    {restaurantSim && (
                      <SimilarityBadge
                        label="식당"
                        similarity={restaurantSim.similarity}
                        confidence={restaurantSim.confidence}
                        nOverlap={restaurantSim.nOverlap}
                        accentColor="var(--accent-food)"
                      />
                    )}
                    {wineSim && (
                      <SimilarityBadge
                        label="와인"
                        similarity={wineSim.similarity}
                        confidence={wineSim.confidence}
                        nOverlap={wineSim.nOverlap}
                        accentColor="var(--accent-wine)"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ─── 소셜 통계 ─── */}
              <div className="mt-2 flex gap-4 px-1">
                <span className="text-[12px]" style={{ color: 'var(--text-hint)' }}>
                  팔로워 <strong style={{ color: 'var(--text-sub)' }}>{data.followerCount}</strong>
                </span>
                <span className="text-[12px]" style={{ color: 'var(--text-hint)' }}>
                  팔로잉 <strong style={{ color: 'var(--text-sub)' }}>{data.followingCount}</strong>
                </span>
              </div>

              {/* ─── 한줄 소개 ─── */}
              {data.bio && (
                <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                  {data.bio}
                </p>
              )}

              {/* ─── AI 취향 요약 ─── */}
              {data.tasteSummary && (
                <p
                  className="mt-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                  style={{
                    backgroundColor: 'var(--bg-section)',
                    color: 'var(--text-sub)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {data.tasteSummary}
                </p>
              )}

              {/* ─── 맛태그 ─── */}
              {data.tasteTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.tasteTags.slice(0, 5).map((tag, i) => {
                    const isHighlight = i < 2
                    return (
                      <span
                        key={tag}
                        className="rounded-full px-2.5 py-[3px] text-[10px] font-semibold"
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

              {/* ─── 활동 버블 ─── */}
              {data.bubbles.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                    활동 버블
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.bubbles.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { onClose(); router.push(`/bubbles/${b.id}`) }}
                        className="flex items-center gap-1 rounded-full px-2.5 py-[4px] text-[11px] font-medium transition-opacity active:opacity-70"
                        style={{
                          backgroundColor: 'var(--bg-section)',
                          color: 'var(--text-sub)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <span className="truncate" style={{ maxWidth: '120px' }}>{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── 메타 정보 ─── */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: 'var(--text-hint)' }}>
                {data.preferredAreas.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {data.preferredAreas.slice(0, 3).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {data.memberSince} 가입
                </span>
              </div>

              {/* ─── 팔로우 버튼 ─── */}
              {!isSelf && (
                <div className="mt-4 flex">
                  <FollowButton
                    accessLevel={accessLevel}
                    onToggle={toggleFollow}
                    isLoading={followLoading}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PopupWindow>
  )
}

// ─── 기록 통계 카드 ───

function RecordStatCard({
  icon,
  label,
  count,
  avgSatisfaction,
  accentColor,
}: {
  icon: React.ReactNode
  label: string
  count: number
  avgSatisfaction: number | null
  accentColor: string
}) {
  return (
    <div
      className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5"
      style={{ backgroundColor: 'var(--bg-section)' }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, var(--bg))`, color: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-[15px] font-[800]" style={{ color: 'var(--text)' }}>{count}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{label}</span>
        </div>
        {avgSatisfaction !== null && (
          <div className="flex items-center gap-1">
            <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>평균</span>
            <span
              className="text-[12px] font-bold"
              style={{ color: getGaugeColor(avgSatisfaction) }}
            >
              {avgSatisfaction}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 적합도 뱃지 ───

function SimilarityBadge({
  label,
  similarity,
  confidence,
  nOverlap,
  accentColor,
}: {
  label: string
  similarity: number
  confidence: number
  nOverlap: number
  accentColor: string
}) {
  const simPercent = Math.round(similarity * 100)
  const confPercent = Math.round(confidence * 100)

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-medium" style={{ color: 'var(--text-hint)' }}>{label}</span>
        <span className="text-[16px] font-[800]" style={{ color: accentColor }}>{simPercent}%</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-hint)' }}>
        <span>신뢰 {confPercent}%</span>
        <span>·</span>
        <span>겹침 {nOverlap}곳</span>
      </div>
    </div>
  )
}
