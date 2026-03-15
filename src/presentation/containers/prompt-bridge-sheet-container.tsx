'use client'

import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { useUserTaste } from '@/application/hooks/use-user-taste'
import { usePrompts } from '@/application/hooks/use-prompts'
import { usePromptBridge } from '@/application/hooks/use-prompt-bridge'
import { usePreferenceSummary } from '@/application/hooks/use-preference-summary'
import { useInteractionTracker } from '@/application/hooks/use-interaction-tracker'
import { PromptBridgeSheet } from '@/presentation/components/prompt/prompt-bridge-sheet'
import type { PromptContext } from '@/shared/utils/prompt-resolver'

interface PromptBridgeSheetContainerProps {
  readonly context: PromptContext
  readonly restaurantId?: string
  readonly children: React.ReactNode
  readonly open?: boolean
  readonly onOpenChange?: (open: boolean) => void
}

export function PromptBridgeSheetContainer({
  context,
  restaurantId,
  children,
  open,
  onOpenChange,
}: PromptBridgeSheetContainerProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile(user?.id)
  const { tasteProfile, experiences } = useUserTaste()
  const { prompts, isLoading: promptsLoading } = usePrompts()
  const { copyToClipboard, openInChatGPT, copied } = usePromptBridge()
  const { summary } = usePreferenceSummary()
  const { trackPromptUse } = useInteractionTracker()

  return (
    <PromptBridgeSheet
      context={context}
      restaurantId={restaurantId}
      open={open}
      onOpenChange={onOpenChange}
      profile={profile ?? null}
      tasteProfile={tasteProfile ?? null}
      experiences={experiences}
      prompts={prompts}
      promptsLoading={promptsLoading}
      preferenceSummary={summary ?? null}
      onCopyPrompt={copyToClipboard}
      onOpenChatGPT={openInChatGPT}
      copied={copied}
      onTrackPromptUse={trackPromptUse}
    >
      {children}
    </PromptBridgeSheet>
  )
}
