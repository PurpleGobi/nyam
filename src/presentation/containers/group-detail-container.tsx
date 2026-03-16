'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Lock, Globe, Eye, Gem } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useGroupDetail } from '@/application/hooks/use-group-detail'
import { useGroupActions } from '@/application/hooks/use-group-actions'
import { GroupMemberList } from '@/presentation/components/group/group-member-list'
import type { GroupType } from '@/domain/entities/group'

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

  const isMember = members.some((m) => m.userId === authUser?.id)
  const isOwner = group?.ownerId === authUser?.id

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
          <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">{group.name}</h1>
          <div className="flex items-center gap-1 rounded-full border border-[var(--color-neutral-200)] px-2.5 py-1">
            <TypeIcon className="h-3.5 w-3.5 text-[var(--color-neutral-500)]" />
            <span className="text-xs text-[var(--color-neutral-500)]">{typeMeta.label}</span>
          </div>
        </div>

        {group.description && (
          <p className="text-sm text-[var(--color-neutral-500)]">{group.description}</p>
        )}

        <div className="flex items-center gap-1 text-sm text-[var(--color-neutral-400)]">
          <Users className="h-4 w-4" />
          <span>멤버 {group.memberCount}명</span>
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

      {/* Members */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          멤버 ({members.length})
        </h2>
        <GroupMemberList members={members} />
      </section>
    </div>
  )
}
