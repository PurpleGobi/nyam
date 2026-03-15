'use client'

import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useUserTaste } from '@/application/hooks/use-user-taste'
import { usePromptBridge } from '@/application/hooks/use-prompt-bridge'
import { useFilterContext } from '@/application/contexts/filter-context'
import { useComparison } from '@/application/hooks/use-comparison'
import { ComparisonPromptSheet } from '@/presentation/components/prompt/comparison-prompt-sheet'
import type { RestaurantWithSummary } from '@/domain/entities/restaurant'

interface ComparisonPromptSheetContainerProps {
  readonly restaurants: readonly RestaurantWithSummary[]
  readonly onRemove: (id: string) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function ComparisonPromptSheetContainer({
  restaurants,
  onRemove,
  open,
  onOpenChange,
}: ComparisonPromptSheetContainerProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile(user?.id)
  const { tasteProfile, experiences } = useUserTaste()
  const { copyToClipboard, openInChatGPT, copied } = usePromptBridge()
  const { filter, setFilter } = useFilterContext()

  const {
    result: comparisonResult,
    isComparing,
    error: comparisonError,
    compare,
  } = useComparison({
    restaurants,
    occasion: filter.situation,
    partySize: filter.partySize,
    budget: filter.budget,
    profile: profile ?? null,
    tasteProfile: tasteProfile ?? null,
    experiences,
  })

  return (
    <ComparisonPromptSheet
      restaurants={restaurants}
      onRemove={onRemove}
      open={open}
      onOpenChange={onOpenChange}
      profile={profile ?? null}
      tasteProfile={tasteProfile ?? null}
      experiences={experiences}
      onCopyPrompt={copyToClipboard}
      onOpenChatGPT={openInChatGPT}
      copied={copied}
      sharedOccasion={filter.situation}
      sharedPartySize={filter.partySize}
      sharedBudget={filter.budget}
      onOccasionChange={(v) => setFilter('situation', v)}
      onPartySizeChange={(v) => setFilter('partySize', v)}
      onBudgetChange={(v) => setFilter('budget', v)}
      comparisonResult={comparisonResult}
      isComparing={isComparing}
      comparisonError={comparisonError}
      onAutoCompare={compare}
    />
  )
}
