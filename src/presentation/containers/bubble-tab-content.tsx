'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import { isAdvancedChip } from '@/domain/entities/condition-chip'
import type { BubbleSortOption } from '@/domain/entities/saved-filter'
import type { BubbleSimilarityResult } from '@/domain/repositories/similarity-repository'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { useToast } from '@/presentation/components/ui/toast'
import { BubbleCard } from '@/presentation/components/bubble/bubble-card'
import { CompactListBubble } from '@/presentation/components/bubble/compact-list-bubble'

interface BubbleTabContentProps {
  userId: string | undefined
  myBubbles: Bubble[]
  publicBubbles: Bubble[]
  bubblesLoading: boolean
  publicBubblesLoading: boolean
  pendingBubbleIds: Set<string>
  expertiseMap: Map<string, Array<{ axisType: string; axisValue: string; avgLevel: number; memberCount: number }>>
  bubbleSimilarityMap: Map<string, BubbleSimilarityResult>
  bubbleSort: BubbleSortOption
  bubbleConditionChips: FilterChipItem[]
  searchQuery: string
  viewMode: 'card' | 'list' | 'calendar' | 'map'
  isMineOnlyMode: boolean
  isFollowingOnlyMode: boolean
  isPublicOnlyMode: boolean
  refreshBubbles: () => void
}

export function BubbleTabContent({
  userId,
  myBubbles,
  publicBubbles,
  bubblesLoading,
  publicBubblesLoading,
  pendingBubbleIds,
  expertiseMap,
  bubbleSimilarityMap,
  bubbleSort,
  bubbleConditionChips,
  searchQuery,
  viewMode,
  isMineOnlyMode,
  isFollowingOnlyMode,
  isPublicOnlyMode,
  refreshBubbles,
}: BubbleTabContentProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { cancelJoin } = useBubbleJoin()

  // 종류에 따라 데이터 소스 선택
  const { baseBubbles, loading } = useMemo(() => {
    if (isMineOnlyMode) {
      return { baseBubbles: myBubbles, loading: bubblesLoading }
    }
    if (isFollowingOnlyMode || isPublicOnlyMode) {
      return { baseBubbles: publicBubbles, loading: publicBubblesLoading }
    }
    // 전체: my + public 합산 (중복 제거)
    const myIds = new Set(myBubbles.map((b) => b.id))
    return {
      baseBubbles: [...myBubbles, ...publicBubbles.filter((b) => !myIds.has(b.id))],
      loading: bubblesLoading || publicBubblesLoading,
    }
  }, [isMineOnlyMode, isFollowingOnlyMode, isPublicOnlyMode, myBubbles, publicBubbles, bubblesLoading, publicBubblesLoading])

  // 칩 필터 적용
  const filtered = useMemo(() => {
    let result = baseBubbles
    for (const chip of bubbleConditionChips) {
      if (isAdvancedChip(chip)) continue
      const simpleChip = chip as { attribute: string; value: string }
      if (simpleChip.attribute === 'bubble_type') continue
      if (simpleChip.attribute === 'role') {
        result = result.filter((b) =>
          simpleChip.value === 'owner' ? b.createdBy === userId : b.createdBy !== userId,
        )
      }
      if (simpleChip.attribute === 'expertise_level') {
        const [axisType, axisValue, minLevel] = simpleChip.value.split(':')
        result = result.filter((b) => {
          const exp = expertiseMap.get(b.id) ?? []
          return exp.some((e) =>
            e.axisType === axisType
            && e.axisValue === axisValue
            && e.avgLevel >= Number(minLevel || 0),
          )
        })
      }
      if (simpleChip.attribute === 'expertise_records') {
        const [axisType, axisValue, minRecords] = simpleChip.value.split(':')
        result = result.filter((b) => {
          const exp = expertiseMap.get(b.id) ?? []
          return exp.some((e) =>
            e.axisType === axisType
            && e.axisValue === axisValue
            && e.memberCount >= Number(minRecords || 0),
          )
        })
      }
    }

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((b) =>
        b.name.toLowerCase().includes(q)
        || (b.description ?? '').toLowerCase().includes(q)
        || (b.area ?? '').toLowerCase().includes(q),
      )
    }

    return result
  }, [baseBubbles, bubbleConditionChips, searchQuery, userId, expertiseMap])

  // 소팅
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (bubbleSort) {
      case 'records':
        arr.sort((a, b) => b.recordCount - a.recordCount)
        break
      case 'members':
        arr.sort((a, b) => b.memberCount - a.memberCount)
        break
      case 'weekly_activity':
        arr.sort((a, b) => b.weeklyRecordCount - a.weeklyRecordCount)
        break
      case 'activity':
        arr.sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
        break
      case 'name':
        arr.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    return arr
  }, [filtered, bubbleSort])

  // 공통 데이터 준비
  const myBubbleIds = useMemo(() => new Set(myBubbles.map((b) => b.id)), [myBubbles])

  const getBubbleRole = (b: Bubble): 'owner' | 'member' | null => {
    if (!myBubbleIds.has(b.id)) return null
    return b.createdBy === userId ? 'owner' : 'member'
  }

  const getExpertiseTopPerAxis = (id: string) => {
    const exp = expertiseMap.get(id)
    if (!exp || exp.length === 0) return undefined
    const byAxis = new Map<string, { axisValue: string; avgLevel: number }>()
    for (const e of exp) {
      const prev = byAxis.get(e.axisType)
      if (!prev || e.avgLevel > prev.avgLevel) {
        byAxis.set(e.axisType, { axisValue: e.axisValue, avgLevel: e.avgLevel })
      }
    }
    return [...byAxis.values()].sort((a, b) => b.avgLevel - a.avgLevel)
  }

  const handleCancelJoin = async (bubbleId: string) => {
    if (userId) {
      await cancelJoin(bubbleId, userId)
      refreshBubbles()
      showToast('가입 신청을 취소했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <Users size={48} style={{ color: 'var(--text-hint)' }} />
        <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
          {isFollowingOnlyMode ? '팔로잉 유저의 버블이 없어요' : isPublicOnlyMode ? '공개 버블이 없어요' : isMineOnlyMode ? '첫 나만의 버블을 만들어 보세요' : '버블이 없어요'}
        </p>
        <p className="mt-1 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
          {isFollowingOnlyMode ? '다른 유저를 팔로우해 보세요' : isMineOnlyMode ? '+버튼을 눌러 시작하세요' : '조건을 변경해 보세요'}
        </p>
      </div>
    )
  }

  // 리스트 뷰
  if (viewMode === 'list') {
    return (
      <div className="content-detail px-4 pb-4 md:px-8">
        {sorted.map((b, i) => (
          <CompactListBubble
            key={b.id}
            bubble={b}
            rank={i + 1}
            role={getBubbleRole(b)}
            expertise={getExpertiseTopPerAxis(b.id)}
            similarity={bubbleSimilarityMap.get(b.id) ?? null}
            onClick={() => router.push(`/bubbles/${b.id}`)}
            onJoin={!myBubbleIds.has(b.id) && !pendingBubbleIds.has(b.id) ? () => router.push(`/bubbles/${b.id}?join=true`) : undefined}
            isPending={pendingBubbleIds.has(b.id)}
            onCancelJoin={pendingBubbleIds.has(b.id) ? () => handleCancelJoin(b.id) : undefined}
          />
        ))}
      </div>
    )
  }

  // 카드 뷰 (기본)
  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-2 md:grid md:grid-cols-2 md:gap-4 md:px-8">
      {sorted.map((b) => (
        <BubbleCard
          key={b.id}
          bubble={b}
          role={getBubbleRole(b)}
          expertise={getExpertiseTopPerAxis(b.id)}
          similarity={bubbleSimilarityMap.get(b.id) ?? null}
          onClick={() => router.push(`/bubbles/${b.id}`)}
          onJoin={!myBubbleIds.has(b.id) && !pendingBubbleIds.has(b.id) ? () => router.push(`/bubbles/${b.id}?join=true`) : undefined}
          isPending={pendingBubbleIds.has(b.id)}
          onCancelJoin={pendingBubbleIds.has(b.id) ? () => handleCancelJoin(b.id) : undefined}
        />
      ))}
    </div>
  )
}
