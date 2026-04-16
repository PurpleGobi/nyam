'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useUserBubbles } from '@/application/hooks/use-user-bubbles'
import { useAllTargetRecords } from '@/application/hooks/use-all-target-records'
import { useRecordReactions } from '@/application/hooks/use-record-reactions'
import { useRecordCommentCounts } from '@/application/hooks/use-record-comment-counts'
import type { SourceFilter, AllRecordItem } from '@/application/hooks/use-all-target-records'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { PopupWindow } from '@/presentation/components/ui/popup-window'
import { CommentSheetContainer } from '@/presentation/containers/comment-sheet-container'
import { AllRecordCard } from './all-record-card'

interface AllRecordsSectionProps {
  targetId: string
  targetType: 'restaurant' | 'wine'
  /** 나의 기록 */
  myRecords?: DiningRecord[]
  myRecordPhotos?: Map<string, RecordPhoto[]>
  myRecordsMeta?: string
  /** 나의 기록 empty state */
  emptyTitle?: string
  emptyDescription?: string
  /** accent 색상 (하위 호환) */
  accentColor?: string
  /** 연결 와인/식당 표시용 (하위 호환) */
  linkedWineNames?: Map<string, string>
  onLinkedWineTap?: (wineId: string) => void
  linkedRestaurantNames?: Map<string, string>
  onLinkedRestaurantTap?: (restaurantId: string) => void
  /** 기록 탭 콜백 (하위 호환) */
  onRecordTap?: (recordId: string) => void
}

const SOURCE_CHIPS: { key: SourceFilter; label: string }[] = [
  { key: 'mine', label: '나의 기록' },
  { key: 'bubble', label: '버블' },
  { key: 'following', label: '팔로잉' },
  { key: 'public', label: '공개' },
]

export function AllRecordsSection({
  targetId,
  targetType,
  myRecords = [],
  myRecordPhotos,
  myRecordsMeta = '',
  emptyTitle = '아직 기록이 없어요',
  emptyDescription = '우하단 + 버튼으로 첫 기록을 남겨보세요',
}: AllRecordsSectionProps) {
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

  const { loadCounts, getCounts, toggle: toggleReaction, syncReaction } = useRecordReactions(user?.id ?? null)
  const { loadCounts: loadCommentCounts, getCount: getCommentCount, adjustCount: adjustCommentCount } = useRecordCommentCounts()

  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)
  const [popupPhotos, setPopupPhotos] = useState<string[]>([])
  const [popupIndex, setPopupIndex] = useState<number | null>(null)
  const [commentTarget, setCommentTarget] = useState<{ recordId: string; authorId: string } | null>(null)

  const openPhotoPopup = useCallback((photos: RecordPhoto[], startIndex: number) => {
    setPopupPhotos(photos.map((p) => p.url))
    setPopupIndex(startIndex)
  }, [])

  const handlePopupClick = useCallback(() => {
    setPopupIndex((prev) => prev !== null ? (prev + 1) % popupPhotos.length : null)
  }, [popupPhotos.length])

  const accentType = targetType === 'restaurant' ? 'food' as const : 'wine' as const
  const emptyTarget = targetType === 'restaurant' ? '이 식당' : '이 와인'
  const isMineFilter = sourceFilter === 'mine'

  // 나의 기록을 AllRecordItem 형식으로 변환
  const myRecordItems: AllRecordItem[] = useMemo(() => {
    if (!user) return []
    return myRecords.map((r) => ({
      id: r.id,
      source: 'bubble' as const,
      authorId: r.userId,
      authorNickname: user.nickname ?? '',
      authorAvatar: user.avatarUrl ?? null,
      authorAvatarColor: null,
      authorLevel: 1,
      authorLevelTitle: '',
      satisfaction: r.satisfaction,
      axisX: r.axisX,
      axisY: r.axisY,
      comment: r.comment,
      scene: r.scene,
      visitDate: r.visitDate,
      photos: myRecordPhotos?.get(r.id)?.filter((p) => p.isPublic) ?? [],
    }))
  }, [myRecords, myRecordPhotos, user])

  // 현재 표시할 아이템
  // - 'mine': props에서 받은 myRecordItems (비공개 메모 등 포함)
  // - 나머지: hook이 해당 조건에 맞는 모든 기록 반환 (내 기록 포함)
  const displayItems = useMemo(() => {
    if (isMineFilter) return myRecordItems
    return records
  }, [isMineFilter, myRecordItems, records])

  // 리액션 + 댓글 카운트 batch 로드
  useEffect(() => {
    const allRecordIds = displayItems.map((r) => r.id).filter(Boolean)
    if (allRecordIds.length > 0) {
      loadCounts(allRecordIds)
      loadCommentCounts(allRecordIds)
    }
  }, [displayItems, loadCounts, loadCommentCounts])

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5 flex items-center justify-between">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          기록
        </span>
        {isMineFilter && myRecordsMeta && (
          <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
            {myRecordsMeta}
          </span>
        )}
      </div>

      {/* 소스 필터 칩 — 선택 없으면 전체 표시, 탭으로 토글 */}
      <FilterChipGroup className="py-1">
        {SOURCE_CHIPS.map((chip) => {
          const count = chip.key === 'mine' ? myRecords.length : sourceCounts[chip.key]
          if (count === 0) return null
          const isActive = sourceFilter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSourceFilter(isActive ? 'all' : chip.key)}
              className={`filter-chip ${isActive ? (chip.key === 'mine' ? `active ${accentType}` : 'active social') : ''}`}
            >
              {chip.label}
              <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
            </button>
          )
        })}
      </FilterChipGroup>

      {/* ─── 기록 카드 (통합 렌더링) ─── */}
      {isLoading && !isMineFilter ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[var(--accent-social)] border-t-transparent" />
        </div>
      ) : displayItems.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {displayItems.map((r, idx) => {
            const reactionState = getCounts(r.id)
            const isOwnRecord = r.authorId === user?.id
            return (
              <AllRecordCard
                key={`${r.source}-${r.id}-${idx}`}
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
                photos={r.photos}
                onAuthorPress={() => setMiniProfileUserId(r.authorId)}
                onPhotoPress={openPhotoPopup}
                reactionCounts={reactionState.counts}
                myReactions={reactionState.myReactions}
                onReactionToggle={isOwnRecord ? undefined : (type) => toggleReaction(r.id, type)}
                onCommentPress={() => setCommentTarget({ recordId: r.id, authorId: r.authorId })}
                commentCount={getCommentCount(r.id)}
              />
            )
          })}
          {hasMore && !isMineFilter && (
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
          {isMineFilter ? (
            <>
              <Search size={28} style={{ color: 'var(--text-hint)' }} />
              <p className="mt-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
                {emptyTitle}
              </p>
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                {emptyDescription}
              </p>
            </>
          ) : (
            <>
              <MessageCircle size={28} style={{ color: 'var(--text-hint)' }} />
              <p className="mt-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-sub)' }}>
                아직 다른 기록이 없어요
              </p>
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                {emptyTarget}에 대한 다른 사람의 기록이 여기에 표시돼요
              </p>
            </>
          )}
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

      {/* 댓글 시트 */}
      {commentTarget && (
        <CommentSheetContainer
          isOpen={true}
          onClose={() => setCommentTarget(null)}
          targetType="record"
          targetId={commentTarget.recordId}
          bubbleId={null}
          allowComments={true}
          targetOwnerId={commentTarget.authorId}
          onCommentCountChange={(delta) => adjustCommentCount(commentTarget.recordId, delta)}
          onReactionChange={(type, added) => syncReaction(commentTarget.recordId, type, added)}
        />
      )}

      {/* 사진 팝업 */}
      <PopupWindow isOpen={popupIndex !== null} onClose={() => setPopupIndex(null)}>
        {popupIndex !== null && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 200, pointerEvents: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={popupPhotos[popupIndex]}
              alt=""
              onClick={handlePopupClick}
              className="rounded-2xl shadow-lg"
              style={{ maxWidth: 'min(90vw, 500px)', maxHeight: '70vh', objectFit: 'contain', cursor: 'pointer', pointerEvents: 'auto' }}
              draggable={false}
            />
          </div>
        )}
      </PopupWindow>
    </section>
  )
}
