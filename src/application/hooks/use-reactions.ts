"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { Reaction } from "@/domain/entities/reaction"
import type { ReactionType } from "@/infrastructure/supabase/types"

function mapDbReaction(data: Record<string, unknown>): Reaction {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    recordId: data.record_id as string,
    type: data.type as ReactionType,
    commentText: data.comment_text as string | null,
    createdAt: data.created_at as string,
  }
}

export function useReactions(recordId: string | null) {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR<Reaction[]>(
    recordId ? `reactions/${recordId}` : null,
    async () => {
      if (!recordId) return []

      const { data: rows, error: fetchError } = await supabase
        .from("reactions")
        .select("*")
        .eq("record_id", recordId)
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(`Failed to fetch reactions: ${fetchError.message}`)
      return (rows ?? []).map(mapDbReaction)
    },
  )

  return {
    reactions: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
