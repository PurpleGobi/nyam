'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Settings } from 'lucide-react'
import type { Bubble, BubbleMember } from '@/domain/entities/bubble'
import { useAuth } from '@/presentation/providers/auth-provider'
import { bubbleRepo } from '@/shared/di/container'

interface BubbleDetailContainerProps {
  bubbleId: string
}

export function BubbleDetailContainer({ bubbleId }: BubbleDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [members, setMembers] = useState<BubbleMember[]>([])
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'members'>('feed')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      bubbleRepo.findById(bubbleId),
      bubbleRepo.getMembers(bubbleId),
    ]).then(([b, m]) => {
      setBubble(b)
      setMembers(m)
      setIsLoading(false)
    })
  }, [bubbleId])

  const myMember = members.find((m) => m.userId === user?.id)
  const isOwner = myMember?.role === 'owner'

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* 헤더 */}
      <nav className="flex items-center justify-between px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{bubble.name}</span>
        {isOwner && (
          <button type="button" className="flex h-11 w-11 items-center justify-center">
            <Settings size={18} style={{ color: 'var(--text-sub)' }} />
          </button>
        )}
        {!isOwner && <div className="w-11" />}
      </nav>

      {/* 히어로 */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', fontSize: '28px' }}
          >
            {bubble.icon ?? '🫧'}
          </div>
          <div>
            <p className="text-[13px] text-[var(--text-sub)]">{bubble.description}</p>
            <p className="mt-1 text-[12px] text-[var(--text-hint)]">
              멤버 {bubble.memberCount}명 · 기록 {bubble.recordCount}개
            </p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-[var(--border)]">
        {(['feed', 'ranking', 'members'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors"
            style={{
              color: activeTab === tab ? 'var(--accent-social)' : 'var(--text-hint)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-social)' : '2px solid transparent',
            }}
          >
            {tab === 'feed' ? '피드' : tab === 'ranking' ? '랭킹' : '멤버'}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 px-4 py-4">
        {activeTab === 'feed' && (
          <p className="text-center text-[14px] text-[var(--text-hint)]">공유된 기록이 없습니다</p>
        )}
        {activeTab === 'ranking' && (
          <p className="text-center text-[14px] text-[var(--text-hint)]">랭킹 데이터가 없습니다</p>
        )}
        {activeTab === 'members' && (
          <div className="flex flex-col gap-2">
            {members.filter((m) => m.status === 'active').map((m) => (
              <div key={m.userId} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--accent-social-light)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-social)' }}>
                    {m.role[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[var(--text)]">{m.userId.substring(0, 8)}</p>
                  <p className="text-[11px] text-[var(--text-hint)]">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
