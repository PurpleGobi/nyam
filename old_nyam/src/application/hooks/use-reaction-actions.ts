'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import type { ReactionType } from '@/infrastructure/supabase/types'

export function useReactionActions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleReaction = useCallback(
    async (
      recordId: string,
      userId: string,
      reactionType: string,
      existingReactionId: string | null,
    ) => {
      setIsLoading(true)
      setError(null)
      try {
        const supabase = createClient()

        if (existingReactionId) {
          const { error } = await supabase
            .from('reactions')
            .delete()
            .eq('id', existingReactionId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('reactions')
            .insert({
              record_id: recordId,
              user_id: userId,
              type: reactionType as ReactionType,
            })
          if (error) throw error
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle reaction')
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { toggleReaction, isLoading, error }
}
