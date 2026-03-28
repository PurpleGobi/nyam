'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ChevronLeft } from 'lucide-react'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { bubbleRepo } from '@/shared/di/container'
import type { Bubble } from '@/domain/entities/bubble'

interface InviteLandingContainerProps {
  inviteCode: string
}

export function InviteLandingContainer({ inviteCode }: InviteLandingContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)
  const { requestJoin, isLoading: isJoining } = useBubbleJoin()

  useEffect(() => {
    bubbleRepo.validateInviteCode(inviteCode).then(({ valid, bubble: b, expired }) => {
      if (valid && b) {
        setBubble(b)
      }
      setIsExpired(expired)
      setIsLoading(false)
    })
  }, [inviteCode])

  const handleJoin = async () => {
    if (!bubble || !user) return
    const applicant = { totalXp: 0, activeXp: 0, activeVerified: 0, recordCount: 0, level: 1 }
    const result = await requestJoin(bubble.id, user.id, applicant, inviteCode)
    if (result.success) {
      router.push(`/bubbles/${bubble.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  if (!bubble || isExpired) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          {isExpired ? '만료된 초대 링크입니다' : '유효하지 않은 초대 링크입니다'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/bubbles')}
          className="rounded-xl px-5 py-2.5 text-[14px] font-semibold"
          style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
        >
          버블 목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="content-auth flex min-h-dvh flex-col bg-[var(--bg)]">
      <nav className="flex items-center px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center text-[15px] font-bold" style={{ color: 'var(--text)' }}>초대</span>
        <div className="w-11" />
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
        >
          <BubbleIcon icon={bubble.icon} size={32} />
        </div>

        <div className="text-center">
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--text)' }}>{bubble.name}</h1>
          {bubble.description && (
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-sub)' }}>{bubble.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 text-[13px]" style={{ color: 'var(--text-hint)' }}>
          <Users size={14} />
          <span>멤버 {bubble.memberCount}명 · 기록 {bubble.recordCount}개</span>
        </div>

        <button
          type="button"
          onClick={handleJoin}
          disabled={isJoining || !user}
          className="w-full max-w-[280px] rounded-xl py-3 text-[15px] font-bold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
        >
          {isJoining ? '가입 중...' : '버블 가입하기'}
        </button>

        {!user && (
          <p className="text-[12px]" style={{ color: 'var(--text-hint)' }}>로그인 후 가입할 수 있습니다</p>
        )}
      </div>
    </div>
  )
}
