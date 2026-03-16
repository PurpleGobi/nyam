'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Lock, Globe, Eye, Gem, Crown, Star, FileText, Link2, Target } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useGroupDetail } from '@/application/hooks/use-group-detail'
import { useGroupActions } from '@/application/hooks/use-group-actions'
import { useGroupFeed } from '@/application/hooks/use-group-feed'
import { useInvite } from '@/application/hooks/use-invite'
import { usePremiumGroup } from '@/application/hooks/use-premium-group'
import { GroupMemberList } from '@/presentation/components/group/group-member-list'
import { ChallengeCard } from '@/presentation/components/group/challenge-card'
import { PremiumGate } from '@/presentation/components/group/premium-gate'
import { useGroupChallenges } from '@/application/hooks/use-group-challenges'
import type { GroupType } from '@/domain/entities/group'
import type { GroupFeedItem } from '@/application/hooks/use-group-feed'

const TYPE_META: Record<GroupType, { label: string; icon: typeof Lock }> = {
  private: { label: '비공개', icon: Lock },
  public: { label: '공개', icon: Globe },
  viewonly: { label: '열람 전용', icon: Eye },
  paid: { label: '유료', icon: Gem },
}

export function GroupDetailContainer() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const { group, members, isLoading, mutateGroup, mutateMembers } = useGroupDetail(params.id)
  const { joinGroup, leaveGroup, isLoading: actionLoading } = useGroupActions()
  const { feed, isLoading: feedLoading } = useGroupFeed(params.id)
  const { generateInviteLink, isLoading: inviteLoading } = useInvite()
  const { challenges, isLoading: challengesLoading } = useGroupChallenges(params.id, authUser?.id)
  const { isPremium, hasAccess, isLoading: premiumLoading } = usePremiumGroup(params.id)

  const [copied, setCopied] = useState(false)

  const isMember = members.some((m) => m.userId === authUser?.id)
  const isOwner = group?.ownerId === authUser?.id

  const handleCopyInviteLink = async () => {
    if (!params.id || inviteLoading) return
    const url = await generateInviteLink(params.id)
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoin = async () => {
    if (!authUser?.id || !params.id) return
    const success = await joinGroup(params.id, authUser.id)
    if (success) {
      mutateGroup()
      mutateMembers()
    }
  }

  const handleLeave = async () => {
    if (!authUser?.id || !params.id) return
    const success = await leaveGroup(params.id, authUser.id)
    if (success) {
      mutateGroup()
      mutateMembers()
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6">
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        <div className="h-32 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        <div className="h-48 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <p className="text-sm text-[var(--color-neutral-500)]">그룹을 찾을 수 없습니다</p>
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="mt-4 text-sm font-medium text-[#FF6038]"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  if (isPremium && !hasAccess && !premiumLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6">
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="flex w-fit items-center gap-1 text-sm text-[var(--color-neutral-500)] transition-colors hover:text-[var(--color-neutral-700)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>목록</span>
        </button>
        <PremiumGate
          groupName={group.name}
          description={group.description}
          memberCount={group.memberCount}
          onRequestAccess={handleJoin}
          isRequesting={actionLoading}
        />
      </div>
    )
  }

  const typeMeta = TYPE_META[group.type]
  const TypeIcon = typeMeta.icon

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-24">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push('/groups')}
        className="flex w-fit items-center gap-1 text-sm text-[var(--color-neutral-500)] transition-colors hover:text-[var(--color-neutral-700)]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>목록</span>
      </button>

      {/* Group Info */}
      <section className="flex flex-col gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white p-5">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 text-xl font-bold text-[var(--color-neutral-800)]">
            {group.name}
            {isPremium && <Crown className="h-4.5 w-4.5 text-[#FF6038]" />}
          </h1>
          <div className="flex items-center gap-1 rounded-full border border-[var(--color-neutral-200)] px-2.5 py-1">
            <TypeIcon className="h-3.5 w-3.5 text-[var(--color-neutral-500)]" />
            <span className="text-xs text-[var(--color-neutral-500)]">{typeMeta.label}</span>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-[var(--color-neutral-500)]">{group.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-[var(--color-neutral-400)]">
            <Users className="h-4 w-4" />
            <span>멤버 {group.memberCount}명</span>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={handleCopyInviteLink}
              disabled={inviteLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-medium text-[var(--color-neutral-600)] transition-colors hover:border-[#FF6038] hover:text-[#FF6038] disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {copied ? '복사됨!' : inviteLoading ? '생성 중...' : '초대 링크'}
            </button>
          )}
        </div>
      </section>

      {/* Action Button */}
      {authUser && !isOwner && (
        <button
          type="button"
          onClick={isMember ? handleLeave : handleJoin}
          disabled={actionLoading}
          className={`w-full rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
            isMember
              ? 'border border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)]'
              : 'bg-[#FF6038] text-white hover:bg-[#e8552f]'
          }`}
        >
          {actionLoading ? '처리 중...' : isMember ? '탈퇴하기' : '참여하기'}
        </button>
      )}

      {/* Weekly Challenges */}
      {isMember && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#FF6038]" />
            <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
              이번 주 챌린지
            </h2>
          </div>
          {challengesLoading ? (
            <div className="flex flex-col gap-3">
              <div className="h-24 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
              <div className="h-24 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          멤버 ({members.length})
        </h2>
        <GroupMemberList members={members} currentUserId={authUser?.id} />
      </section>

      {/* Shared Records */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          공유된 기록
        </h2>
        {feedLoading ? (
          <div className="flex flex-col gap-3">
            <div className="h-24 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
            <div className="h-24 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
          </div>
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-white py-10">
            <FileText className="h-8 w-8 text-[var(--color-neutral-300)]" />
            <p className="text-sm text-[var(--color-neutral-400)]">
              아직 공유된 기록이 없습니다
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {feed.map((item) => (
              <FeedCard key={item.id} item={item} onClick={() => router.push(`/records/${item.recordId}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function FeedCard({ item, onClick }: { item: GroupFeedItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-white p-4 text-left transition-colors hover:border-[var(--color-neutral-300)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-neutral-800)]">
          {item.record.menuName}
        </h3>
        <span className="text-xs text-[var(--color-neutral-400)]">
          {formatDate(item.sharedAt)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--color-neutral-100)] px-2 py-0.5 text-xs text-[var(--color-neutral-500)]">
          {item.record.category}
        </span>
        <div className="flex items-center gap-0.5">
          <Star className="h-3.5 w-3.5 fill-[#FF6038] text-[#FF6038]" />
          <span className="text-xs font-medium text-[var(--color-neutral-600)]">
            {item.record.ratingOverall}
          </span>
        </div>
      </div>
      {item.record.comment && (
        <p className="line-clamp-2 text-xs text-[var(--color-neutral-500)]">
          {item.record.comment}
        </p>
      )}
    </button>
  )
}
