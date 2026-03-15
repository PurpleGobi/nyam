'use client'

import { useMemo, useCallback } from 'react'
import { useAuth } from '@/application/hooks/use-auth'
import { useUserProfile } from '@/application/hooks/use-user-profile'
import { usePreferenceSummary } from '@/application/hooks/use-preference-summary'
import { TasteStyleCard, TasteStyleCardSkeleton } from '@/presentation/components/profile/taste-style-card'
import { buildTasteStyleProfile } from '@/shared/utils/taste-style-resolver'

/**
 * Container for the gamified taste style profile card.
 * Fetches preference summary and renders the profile card.
 */
export function TasteStyleContainer() {
  const { user } = useAuth()
  const { profile: userProfile } = useUserProfile(user?.id)
  const { summary, isLoading } = usePreferenceSummary()

  const tasteStyle = useMemo(() => {
    if (!summary) return null
    return buildTasteStyleProfile(summary)
  }, [summary])

  const handleShare = useCallback(async () => {
    if (!tasteStyle) return

    const text = [
      `${tasteStyle.persona.emoji} ${tasteStyle.persona.title} (Lv.${tasteStyle.level.level})`,
      `"${tasteStyle.persona.subtitle}"`,
      '',
      tasteStyle.topCuisines.length > 0
        ? `- Best: ${tasteStyle.topCuisines.join(', ')}`
        : null,
      tasteStyle.topRegions.length > 0
        ? `- Area: ${tasteStyle.topRegions.join(', ')}`
        : null,
      '',
      `#Nyam #미식프로필 #${tasteStyle.persona.title.replace(/\s/g, '')}`,
    ].filter(line => line !== null).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nyam 미식 프로필', text })
        return
      } catch {
        // User cancelled or API unavailable, fallback to clipboard
      }
    }

    await navigator.clipboard.writeText(text)
  }, [tasteStyle])

  if (!user) return null

  if (isLoading) {
    return <TasteStyleCardSkeleton />
  }

  if (!tasteStyle) return null

  return (
    <TasteStyleCard
      profile={tasteStyle}
      nickname={userProfile?.nickname}
      onShare={handleShare}
    />
  )
}
