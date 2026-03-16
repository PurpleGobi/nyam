'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface Reaction {
  readonly id: string
  readonly userId: string
  readonly reactionType: string
}

export function useReactions(recordId: string | undefined) {
  const { data, isLoading, mutate } = useSWR(
    recordId ? ['reactions', recordId] : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('reactions')
        .select('id, user_id, type')
        .eq('record_id', recordId!)

      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        reactionType: row.type,
      }))
    },
  )

  return {
    reactions: data ?? ([] as Reaction[]),
    isLoading,
    mutate,
  }
}
