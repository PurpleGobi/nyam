'use client'

import { useState, useEffect } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import type { JoinApplicantProfile } from '@/domain/services/bubble-join-service'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { JoinFlow } from '@/presentation/components/bubble/join-flow'
import { bubbleRepo } from '@/shared/di/container'

interface BubbleJoinContainerProps {
  bubbleId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function BubbleJoinContainer({ bubbleId, isOpen, onClose, onSuccess }: BubbleJoinContainerProps) {
  const { user } = useAuth()
  const { requestJoin, follow, isLoading } = useBubbleJoin()
  const { records } = useRecordsWithTarget(user?.id ?? null)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(user?.id ?? null)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !bubbleId) return
    bubbleRepo.findById(bubbleId).then(setBubble)
  }, [isOpen, bubbleId])

  if (!bubble || !user) return null

  // 임시 프로필 (실제 데이터는 userRepo에서 조회)
  const applicantProfile: JoinApplicantProfile = {
    totalXp: 0,
    activeXp: 0,
    activeVerified: 0,
    recordCount: 0,
    level: 1,
  }

  const handleJoin = async () => {
    setEligibilityError(null)
    const result = await requestJoin(bubbleId, user.id, applicantProfile)
    if (!result.success && result.eligibility) {
      setEligibilityError(result.eligibility.reasons.join(', '))
      return
    }
    // active 멤버 → 기본 공유 규칙(모든 항목)으로 소급 동기화
    if (result.member?.status === 'active') {
      await syncAllRecordsToBubble(
        bubbleId,
        { mode: 'all', rules: [], conjunction: 'and' },
        records as unknown as Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
      )
    }
    onSuccess?.()
    onClose()
  }

  const handleFollow = async () => {
    await follow(bubbleId, user.id)
    onSuccess?.()
    onClose()
  }

  const handleCancel = () => {
    setEligibilityError(null)
    onClose()
  }

  return (
    <JoinFlow
      isOpen={isOpen}
      onClose={onClose}
      bubble={bubble}
      applicantProfile={applicantProfile}
      tasteMatch={null}
      onJoin={handleJoin}
      onFollow={handleFollow}
      onCancel={handleCancel}
      isLoading={isLoading}
      eligibilityError={eligibilityError}
    />
  )
}
