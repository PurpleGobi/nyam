'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OnboardingBubbleTemplate, OnboardingSeedBubble } from '@/domain/entities/onboarding'
import { BUBBLE_TEMPLATES } from '@/shared/constants/onboarding-seeds'
import { bubbleRepo, onboardingRepo } from '@/shared/di/container'

interface UseOnboardingBubblesResult {
  templates: OnboardingBubbleTemplate[]
  seedBubbles: OnboardingSeedBubble[]
  createdBubbleIds: string[]
  isLoading: boolean
  createBubble: (template: OnboardingBubbleTemplate) => Promise<string | null>
}

export function useOnboardingBubbles(userId: string | null): UseOnboardingBubblesResult {
  const [seedBubbles, setSeedBubbles] = useState<OnboardingSeedBubble[]>([])
  const [createdBubbleIds, setCreatedBubbleIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    onboardingRepo.getSeedBubbles()
      .then((data) => { setSeedBubbles(data); setIsLoading(false) })
  }, [])

  const createBubble = useCallback(async (template: OnboardingBubbleTemplate): Promise<string | null> => {
    if (!userId) return null
    try {
      const bubble = await bubbleRepo.create({
        name: template.name,
        description: template.description,
        icon: template.icon,
        iconBgColor: template.iconBgColor,
        joinPolicy: template.joinPolicy,
        focusType: template.focusType,
        createdBy: userId,
      })
      if (bubble) {
        setCreatedBubbleIds((prev) => [...prev, bubble.id])
      }
      return bubble?.id ?? null
    } catch {
      return null
    }
  }, [userId])

  return {
    templates: BUBBLE_TEMPLATES,
    seedBubbles,
    createdBubbleIds,
    isLoading,
    createBubble,
  }
}
