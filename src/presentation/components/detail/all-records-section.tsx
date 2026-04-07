'use client'

import { useState } from 'react'
import { Users, MessageCircle } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useUserBubbles } from '@/application/hooks/use-user-bubbles'
import { useAllTargetRecords } from '@/application/hooks/use-all-target-records'
import type { SourceFilter } from '@/application/hooks/use-all-target-records'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { AllRecordCard } from './all-record-card'

interface AllRecordsSectionProps {
  targetId: string
  targetType: 'restaurant' | 'wine'
}

const SOURCE_CHIPS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'bubble', label: '모임' },
  { key: 'following', label: '팔로잉' },
  { key: 'public', label: '공개' },
]

export function AllRecordsSection({ targetId, targetType }: AllRecordsSectionProps) {
  const { user } = useAuth()
  const { bubbleIds: userBubbleIds } = useUserBubbles(user?.id ?? null)
  const {
    records,
    isLoading,
    sourceFilter,
    setSourceFilter,
    sourceCounts,
    hasMore,
  } = useAllTargetRecords({ targetId, targetType, userId: user?.id ?? null, userBubbleIds })

  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)

  const accentType = targetType === 'restaurant' ? 'food' as const : 'wine' as const
  const emptyTarget = targetType === 'restaurant' ? '이 식당' : '이 와인'

  return (
    <section style={{ padding: '16px 20px' }}>
      <div className="mb-3.5 flex items-center gap-1.5">
        <Users size={14} style={{ color: 'var(--text-sub)' }} />
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          모든 기록
        </span>
      </div>

      {/* 소스 필터 칩 */}
      <FilterChipGroup className="py-1">
        {SOURCE_CHIPS.map((chip) => {
          const count = sourceCounts[chip.key]
          const isActive = sourceFilter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSourceFilter(chip.key)}
              className={`filter-chip ${isActive ? 'active social' : ''}`}
            >
              {chip.label}
              {count > 0 && (
                <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
              )}
            </button>
          )
        })}
      </FilterChipGroup>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[var(--accent-social)] border-t-transparent" />
        </div>
      ) : records.length > 0 ? (
        <div className="mt-3 flex flex-col">
          {records.map((r) => (
            <AllRecordCard
              key={`${r.source}-${r.id}`}
              authorNickname={r.authorNickname}
              authorAvatar={r.authorAvatar}
              authorAvatarColor={r.authorAvatarColor}
              authorLevel={r.authorLevel}
              authorLevelTitle={r.authorLevelTitle}
              satisfaction={r.satisfaction}
              axisX={r.axisX}
              axisY={r.axisY}
              comment={r.comment}
              scene={r.scene}
              visitDate={r.visitDate}
              source={r.source}
              accentType={accentType}
              onAuthorPress={() => setMiniProfileUserId(r.authorId)}
            />
          ))}
          {hasMore && (
            <button
              type="button"
              className="w-full py-2 text-center text-[13px] font-semibold"
              style={{ color: 'var(--accent-social)' }}
            >
              더보기
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ padding: '40px 20px' }}>
          <MessageCircle size={28} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
            아직 다른 기록이 없어요
          </p>
          <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {emptyTarget}에 대한 다른 사람의 기록이 여기에 표시돼요
          </p>
        </div>
      )}

      {/* 미니 프로필 팝업 */}
      {miniProfileUserId && (
        <MiniProfilePopup
          isOpen={true}
          onClose={() => setMiniProfileUserId(null)}
          targetUserId={miniProfileUserId}
        />
      )}
    </section>
  )
}
