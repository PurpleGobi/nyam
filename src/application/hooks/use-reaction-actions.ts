"use client"

import { useCallback } from "react"
import { useSWRConfig } from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { Reaction } from "@/domain/entities/reaction"
import type { ReactionType } from "@/infrastructure/supabase/types"

export function useReactionActions(recordId: string | null) {
  const supabase = createClient()
  const { mutate } = useSWRConfig()

  const addReaction = useCallback(
    async (type: ReactionType, commentText?: string) => {
      if (!recordId) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Optimistic update
      const swrKey = `reactions/${recordId}`
      const optimisticReaction: Reaction = {
        id: crypto.randomUUID(),
        userId: user.id,
        recordId,
        type,
        commentText: commentText ?? null,
        createdAt: new Date().toISOString(),
      }

      await mutate(
        swrKey,
        async (current: Reaction[] | undefined) => {
          const { data, error } = await supabase
            .from("reactions")
            .insert({
              user_id: user.id,
              record_id: recordId,
              type,
              comment_text: commentText ?? null,
            })
            .select()
            .single()

          if (error) throw new Error(`Failed to add reaction: ${error.message}`)

          const newReaction: Reaction = {
            id: data.id,
            userId: data.user_id,
            recordId: data.record_id,
            type: data.type,
            commentText: data.comment_text,
            createdAt: data.created_at,
          }

          return [newReaction, ...(current ?? [])]
        },
        {
          optimisticData: (current: Reaction[] | undefined) => [optimisticReaction, ...(current ?? [])],
          rollbackOnError: true,
        },
      )
    },
    [supabase, mutate, recordId],
  )

  const removeReaction = useCallback(
    async (reactionId: string) => {
      if (!recordId) return

      const swrKey = `reactions/${recordId}`

      await mutate(
        swrKey,
        async (current: Reaction[] | undefined) => {
          const { error } = await supabase
            .from("reactions")
            .delete()
            .eq("id", reactionId)

          if (error) throw new Error(`Failed to remove reaction: ${error.message}`)
          return (current ?? []).filter((r) => r.id !== reactionId)
        },
        {
          optimisticData: (current: Reaction[] | undefined) =>
            (current ?? []).filter((r) => r.id !== reactionId),
          rollbackOnError: true,
        },
      )
    },
    [supabase, mutate, recordId],
  )

  return {
    addReaction,
    removeReaction,
  }
}
