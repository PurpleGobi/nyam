'use client'

import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useUserBubbles } from '@/application/hooks/use-user-bubbles'
import { useBubbleRecords } from '@/application/hooks/use-bubble-records'
import { BubbleFilterChips } from './bubble-filter-chips'
import { BubbleRecordCard } from './bubble-record-card'

interface BubbleRecordSectionProps {
  targetId: string
  targetType: 'restaurant' | 'wine'
}

export function BubbleRecordSection({ targetId, targetType }: BubbleRecordSectionProps) {
  const { user } = useAuth()
  const { bubbles: userBubbles, bubbleIds: userBubbleIds } = useUserBubbles(user?.id ?? null)
  const {
    records: bubbleRecords,
    hasMore: bubbleHasMore,
    selectedBubbleId,
    setSelectedBubbleId,
  } = useBubbleRecords(targetId, targetType, userBubbleIds)

  const accentType = targetType === 'restaurant' ? 'food' as const : 'wine' as const
  const emptyTarget = targetType === 'restaurant' ? '이 식당' : '이 와인'

  return (
    <section style={{ padding: '16px 20px' }}>
      <div className="mb-3.5">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          버블 기록
        </span>
      </div>
      {bubbleRecords.length > 0 ? (
        <>
          <BubbleFilterChips
            bubbles={userBubbles}
            selectedId={selectedBubbleId}
            onSelect={setSelectedBubbleId}
            accentType={accentType}
          />
          <div className="mt-3 flex flex-col gap-2">
            {bubbleRecords.map((r) => (
              <BubbleRecordCard
                key={r.shareId}
                authorNickname={r.authorNickname}
                authorAvatar={r.authorAvatar}
                authorAvatarColor={r.authorAvatarColor}
                authorLevel={r.authorLevel}
                authorLevelTitle={r.authorLevelTitle}
                bubbleName={r.bubbleName}
                satisfaction={r.satisfaction}
                comment={r.comment}
                scene={r.scene}
                visitDate={r.visitDate}
                likeCount={r.likeCount}
                commentCount={r.commentCount}
                isMember={r.isMember}
                contentVisibility={r.contentVisibility}
              />
            ))}
            {bubbleHasMore && (
              <p className="py-2 text-center text-[13px] font-semibold" style={{ color: 'var(--accent-social)' }}>
                더보기
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center" style={{ padding: '40px 20px' }}>
          <MessageCircle size={28} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
            아직 버블 기록이 없어요
          </p>
          <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            버블에서 {emptyTarget}에 대한 이야기를 나눠보세요
          </p>
        </div>
      )}
    </section>
  )
}
