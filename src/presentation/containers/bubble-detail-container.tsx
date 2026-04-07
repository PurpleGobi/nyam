'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Users, Settings, UserPlus, Share2 } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleRanking } from '@/application/hooks/use-bubble-ranking'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import { useSingleBubbleExpertise } from '@/application/hooks/use-bubble-expertise'
import { useInviteLink } from '@/application/hooks/use-invite-link'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { RankingPodium } from '@/presentation/components/bubble/ranking-podium'
import type { RankingPodiumItem } from '@/presentation/components/bubble/ranking-podium'
import { RankingList } from '@/presentation/components/bubble/ranking-list'
import Image from 'next/image'
import { InviteLinkGenerator } from '@/presentation/components/bubble/invite-link-generator'
import { BubbleInfoSheet } from '@/presentation/components/bubble/bubble-info-sheet'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import type { RankingTargetType, ExpertiseAxisType } from '@/domain/entities/bubble'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleDetailContainerProps {
  bubbleId: string
}

export function BubbleDetailContainer({ bubbleId }: BubbleDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { bubble, myRole, tasteMatch, isLoading } = useBubbleDetail(bubbleId, user?.id ?? null)

  const [showInfoSheet, setShowInfoSheet] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)
  const [rankingType, setRankingType] = useState<RankingTargetType>('restaurant')

  const { expertise } = useSingleBubbleExpertise(bubbleId)
  const { inviteCode, generateLink, copyToClipboard, isLoading: inviteLoading } = useInviteLink(bubbleId)
  const { members, isLoading: membersLoading } = useBubbleMembers(bubbleId)
  const { rankings: ranking, isLoading: rankingLoading } = useBubbleRanking(bubbleId, rankingType)

  // 피드에서 활동 요약 계산
  const { shares } = useBubbleFeed(
    bubbleId,
    myRole,
    bubble?.contentVisibility ?? 'rating_and_comment',
  )

  const activitySummary = useMemo(() => {
    const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weeklyShares = shares.filter((s) => new Date(s.sharedAt).getTime() > thisWeek)

    // 인기 대상 (가장 많은 기록)
    const targetCounts = new Map<string, { name: string; count: number; type: string }>()
    for (const s of shares) {
      const key = s.targetId ?? ''
      if (!key) continue
      const existing = targetCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        targetCounts.set(key, { name: s.targetName ?? '', count: 1, type: s.targetType ?? 'restaurant' })
      }
    }
    const topTargets = [...targetCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 전체 평균 만족도
    const rated = shares.filter((s) => s.satisfaction != null)
    const avgSatisfaction = rated.length > 0
      ? Math.round(rated.reduce((sum, s) => sum + (s.satisfaction ?? 0), 0) / rated.length)
      : null

    return {
      totalRecords: shares.length,
      weeklyRecords: weeklyShares.length,
      avgSatisfaction,
      topTargets,
    }
  }, [shares])

  // 전문성 축별 그룹핑 (Top 5 per axis)
  const expertiseGroups = useMemo(() => {
    if (expertise.length === 0) return []

    const AXIS_LABELS: Record<ExpertiseAxisType, string> = {
      area: '지역',
      genre: '장르',
      wine_region: '산지',
      wine_variety: '품종',
    }

    const grouped = new Map<ExpertiseAxisType, typeof expertise>()
    for (const e of expertise) {
      const list = grouped.get(e.axisType) ?? []
      list.push(e)
      grouped.set(e.axisType, list)
    }

    return [...grouped.entries()]
      .map(([axisType, items]) => ({
        axisType,
        label: AXIS_LABELS[axisType],
        items: items.sort((a, b) => b.avgLevel - a.avgLevel).slice(0, 5),
      }))
      .filter((g) => g.items.length > 0)
  }, [expertise])

  // 랭킹 포디움 데이터 (target 기반: 이 버블에서 인기 있는 식당/와인)
  const podiumItems: RankingPodiumItem[] = useMemo(() => {
    return ranking.slice(0, 3).map((r, i) => ({
      rank: (i + 1) as 1 | 2 | 3,
      targetId: r.targetId,
      targetName: r.targetId, // TODO: target name은 별도 조회 필요
      targetMeta: null,
      photoUrl: null,
      avgSatisfaction: r.avgSatisfaction ?? 0,
      recordCount: r.recordCount,
      delta: typeof r.delta.value === 'number' ? r.delta.value : r.delta.value === 'new' ? ('new' as const) : null,
    }))
  }, [ranking])

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  const isOwner = myRole === 'owner'
  const isAdmin = myRole === 'admin'
  const canManage = isOwner || isAdmin

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ─── 버블 헤더 ─── */}
        <div className="flex flex-col items-center px-5 pt-6 pb-4">
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)' }}
          >
            <BubbleIcon icon={bubble.icon} size={36} />
          </div>
          <h1 className="mt-3 text-[20px] font-[800]" style={{ color: 'var(--text)' }}>
            {bubble.name}
          </h1>
          {bubble.description && (
            <p className="mt-1 text-center text-[13px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              {bubble.description}
            </p>
          )}

          {/* 버블 메타 */}
          <div className="mt-3 flex items-center gap-4 text-[12px]" style={{ color: 'var(--text-hint)' }}>
            <span className="flex items-center gap-1">
              <Users size={13} /> 멤버 {bubble.memberCount}명
            </span>
            {bubble.area && <span>{bubble.area}</span>}
          </div>

          {/* 액션 버튼 행 */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              <UserPlus size={13} /> 초대
            </button>
            <button
              type="button"
              onClick={() => setShowInfoSheet(true)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
              style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              <Share2 size={13} /> 정보
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => router.push(`/bubbles/${bubbleId}/settings`)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
                style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                <Settings size={13} /> 설정
              </button>
            )}
          </div>
        </div>

        <Divider />

        {/* ─── 활동 요약 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>활동 요약</h2>
          <div className="flex gap-2">
            <StatCard label="총 기록" value={String(activitySummary.totalRecords)} />
            <StatCard label="이번 주" value={String(activitySummary.weeklyRecords)} />
            <StatCard
              label="평균 만족도"
              value={activitySummary.avgSatisfaction !== null ? String(activitySummary.avgSatisfaction) : '-'}
              valueColor={activitySummary.avgSatisfaction !== null ? getGaugeColor(activitySummary.avgSatisfaction) : undefined}
            />
          </div>

          {/* 인기 대상 */}
          {activitySummary.topTargets.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>인기</p>
              <div className="flex flex-wrap gap-1.5">
                {activitySummary.topTargets.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => router.push(t.type === 'wine' ? `/wines/${t.name}` : `/restaurants/${t.name}`)}
                    className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                    style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                  >
                    {t.name} ({t.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── 전문 분야 ─── */}
        {expertiseGroups.length > 0 && (
          <>
            <Divider />
            <section className="px-5 py-4">
              <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>전문 분야</h2>
              <div className="flex flex-col gap-3">
                {expertiseGroups.map((group) => (
                  <div key={group.axisType}>
                    <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item.axisValue}
                          className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                          style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                        >
                          {item.axisValue} Lv.{Math.round(item.avgLevel)} ({item.memberCount}명)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Divider />

        {/* ─── 멤버 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
            멤버 <span style={{ color: 'var(--text-hint)', fontWeight: 500 }}>{bubble.memberCount}</span>
          </h2>
          {membersLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>멤버가 없습니다</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.slice(0, 20).map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setMiniProfileUserId(m.userId)}
                  className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                  style={{ width: '56px' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{
                      backgroundColor: m.avatarColor ?? 'var(--accent-social-light)',
                      color: '#FFFFFF',
                      border: m.userId === user?.id ? '2px solid var(--accent-social)' : '2px solid var(--bg-card)',
                    }}
                  >
                    {m.avatarUrl ? (
                      <Image src={m.avatarUrl} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (m.nickname ?? '?').charAt(0)
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[10px]" style={{ color: 'var(--text-sub)' }}>
                    {m.userId === user?.id ? '나' : m.nickname}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* ─── 랭킹 ─── */}
        <section className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
              <Trophy size={15} style={{ color: 'var(--caution)' }} /> 랭킹
            </h2>
            <div className="flex gap-1">
              {(['restaurant', 'wine'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRankingType(type)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: rankingType === type
                      ? (type === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)')
                      : 'var(--bg-section)',
                    color: rankingType === type ? '#FFFFFF' : 'var(--text-sub)',
                    border: rankingType === type ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {type === 'restaurant' ? '식당' : '와인'}
                </button>
              ))}
            </div>
          </div>

          {rankingLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : ranking.length > 0 ? (
            <>
              <RankingPodium items={podiumItems} targetType={rankingType} />
              {ranking.length > 3 && (
                <RankingList
                  entries={ranking.slice(3)}
                  targetType={rankingType}
                  targetNames={{}}
                />
              )}
            </>
          ) : (
            <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
              아직 랭킹 데이터가 없어요
            </p>
          )}
        </section>

        {/* 취향 일치도 (본인이 멤버일 때) */}
        {tasteMatch !== null && (
          <>
            <Divider />
            <section className="px-5 py-4">
              <h2 className="mb-2 text-[14px] font-bold" style={{ color: 'var(--text)' }}>취향 일치도</h2>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-[18px] font-[800]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--accent-social) 12%, var(--bg))`,
                    color: 'var(--accent-social)',
                  }}
                >
                  {tasteMatch}%
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-sub)' }}>
                  이 버블 멤버들과의 평균 취향 일치도예요
                </p>
              </div>
            </section>
          </>
        )}

        <div style={{ height: '80px' }} />
      </div>

      {/* 버블 정보 시트 */}
      {showInfoSheet && bubble && (
        <BubbleInfoSheet
          isOpen={showInfoSheet}
          onClose={() => setShowInfoSheet(false)}
          bubble={bubble}
        />
      )}

      {/* 초대 모달 */}
      {showInviteModal && (
        <InviteLinkGenerator
          bubbleId={bubbleId}
          inviteCode={inviteCode}
          inviteExpiresAt={null}
          onGenerate={(expiry) => generateLink(expiry)}
          onCopy={(code) => copyToClipboard(code)}
          isLoading={inviteLoading}
        />
      )}

      {/* 미니 프로필 팝업 */}
      {miniProfileUserId && (
        <MiniProfilePopup
          isOpen={true}
          onClose={() => setMiniProfileUserId(null)}
          targetUserId={miniProfileUserId}
        />
      )}
    </div>
  )
}

function Divider() {
  return <div className="mx-5 h-px" style={{ backgroundColor: 'var(--border)' }} />
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-xl py-3"
      style={{ backgroundColor: 'var(--bg-section)' }}
    >
      <span className="text-[18px] font-[800]" style={{ color: valueColor ?? 'var(--text)' }}>
        {value}
      </span>
      <span className="mt-0.5 text-[10px]" style={{ color: 'var(--text-hint)' }}>
        {label}
      </span>
    </div>
  )
}
