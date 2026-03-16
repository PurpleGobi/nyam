'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Users, AlertCircle, CheckCircle2, LogIn } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useInvite } from '@/application/hooks/use-invite'
import { useGroupActions } from '@/application/hooks/use-group-actions'
import type { GroupType } from '@/domain/entities/group'

interface InviteGroupInfo {
  id: string
  name: string
  description: string | null
  type: GroupType
  memberCount: number
}

export function GroupJoinContainer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const { user, isLoading: authLoading } = useAuthContext()
  const { getInviteInfo, isLoading: inviteLoading } = useInvite()
  const { joinGroup, isLoading: joinLoading } = useGroupActions()

  const [groupInfo, setGroupInfo] = useState<InviteGroupInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'joined' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authLoading) return
    if (!user && token) {
      router.replace(`/auth/login?redirect=/groups/join?token=${encodeURIComponent(token)}`)
    }
  }, [authLoading, user, token, router])

  // Fetch group info on mount
  useEffect(() => {
    if (!token || !user) return

    async function fetchGroupInfo() {
      const info = await getInviteInfo(token!)
      if (info) {
        setGroupInfo(info)
        setStatus('ready')
      } else {
        setErrorMessage('유효하지 않은 초대 링크입니다')
        setStatus('error')
      }
    }

    fetchGroupInfo()
  }, [token, user, getInviteInfo])

  const handleJoin = async () => {
    if (!user?.id || !groupInfo?.id) return

    const success = await joinGroup(groupInfo.id, user.id)
    if (success) {
      setStatus('joined')
      setTimeout(() => {
        router.push(`/groups/${groupInfo.id}`)
      }, 1500)
    } else {
      setErrorMessage('그룹 참여에 실패했습니다. 이미 멤버이거나 오류가 발생했습니다.')
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <AlertCircle className="h-10 w-10 text-[var(--color-neutral-300)]" />
        <p className="mt-3 text-sm text-[var(--color-neutral-500)]">
          초대 토큰이 없습니다
        </p>
      </div>
    )
  }

  if (authLoading || (status === 'loading' && !errorMessage)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 pt-20">
        <div className="h-48 w-full max-w-sm animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 pt-20">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-[var(--color-neutral-500)]">{errorMessage}</p>
        <button
          type="button"
          onClick={() => router.push('/groups')}
          className="mt-2 text-sm font-medium text-[#FF6038]"
        >
          그룹 목록으로 이동
        </button>
      </div>
    )
  }

  if (status === 'joined') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 pt-20">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="text-sm font-medium text-[var(--color-neutral-700)]">
          그룹에 참여했습니다!
        </p>
        <p className="text-xs text-[var(--color-neutral-400)]">
          잠시 후 그룹 페이지로 이동합니다...
        </p>
      </div>
    )
  }

  if (!groupInfo) return null

  return (
    <div className="flex flex-col items-center justify-center px-4 pt-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-xl border border-[var(--color-neutral-200)] bg-white p-6">
        {/* Group icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6038]/10">
          <Users className="h-7 w-7 text-[#FF6038]" />
        </div>

        {/* Group info */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-lg font-bold text-[var(--color-neutral-800)]">
            {groupInfo.name}
          </h1>
          {groupInfo.description && (
            <p className="text-sm text-[var(--color-neutral-500)]">
              {groupInfo.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-[var(--color-neutral-400)]">
            <Users className="h-3.5 w-3.5" />
            <span>{groupInfo.memberCount}명</span>
          </div>
        </div>

        {/* Join button */}
        <button
          type="button"
          onClick={handleJoin}
          disabled={joinLoading || inviteLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6038] py-3 text-sm font-medium text-white transition-colors hover:bg-[#e8552f] disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          {joinLoading ? '참여 중...' : '참여하기'}
        </button>
      </div>
    </div>
  )
}
