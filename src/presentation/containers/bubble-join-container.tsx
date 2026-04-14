'use client'

import { useState } from 'react'
import type { JoinApplicantProfile } from '@/domain/services/bubble-join-service'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleLookup } from '@/application/hooks/use-bubble-lookup'
import { useToast } from '@/presentation/components/ui/toast'
import { JoinFlow } from '@/presentation/components/bubble/join-flow'

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
  const { bubble } = useBubbleLookup(isOpen ? bubbleId : null)
  const { showToast } = useToast()
  const [eligibilityError, setEligibilityError] = useState<string | null>(null)

  if (!bubble || !user) return null

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
    if (result.member?.status === 'active') {
      await syncAllRecordsToBubble(
        bubbleId,
        { mode: 'all', rules: [], conjunction: 'and' },
        records as unknown as Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
      )
      showToast(`"${bubble.name}"에 가입되었습니다`)
    } else if (result.member?.status === 'pending') {
      showToast(`"${bubble.name}"에 가입 신청을 보냈습니다`)
    }
    onSuccess?.()
    onClose()
  }

  const handleFollow = async () => {
    await follow(bubbleId, user.id)
    showToast(`"${bubble.name}"을 팔로우합니다`)
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
