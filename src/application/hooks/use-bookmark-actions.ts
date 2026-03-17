"use client"

import { useCallback } from "react"
import { useSWRConfig } from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { BookmarkWithRecord } from "@/application/hooks/use-bookmarks"

export function useBookmarkActions() {
  const supabase = createClient()
  const { mutate } = useSWRConfig()

  const toggleBookmark = useCallback(
    async (recordId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Check if bookmark exists
      const { data: existing } = await supabase
        .from("bookmarks")
        .select("user_id, record_id")
        .eq("user_id", user.id)
        .eq("record_id", recordId)
        .maybeSingle()

      if (existing) {
        // Remove bookmark
        const { error } = await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("record_id", recordId)

        if (error) throw new Error(`Failed to remove bookmark: ${error.message}`)
      } else {
        // Add bookmark
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: user.id,
            record_id: recordId,
          })

        if (error) throw new Error(`Failed to add bookmark: ${error.message}`)
      }

      // Revalidate bookmarks cache
      await mutate("bookmarks")

      return !existing
    },
    [supabase, mutate],
  )

  const addBookmark = useCallback(
    async (recordId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      await mutate(
        "bookmarks",
        async (current: BookmarkWithRecord[] | undefined) => {
          const { error } = await supabase
            .from("bookmarks")
            .insert({
              user_id: user.id,
              record_id: recordId,
            })

          if (error) throw new Error(`Failed to add bookmark: ${error.message}`)
          // Return undefined to trigger revalidation
          return current
        },
        { revalidate: true },
      )
    },
    [supabase, mutate],
  )

  const removeBookmark = useCallback(
    async (recordId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      await mutate(
        "bookmarks",
        async (current: BookmarkWithRecord[] | undefined) => {
          const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("record_id", recordId)

          if (error) throw new Error(`Failed to remove bookmark: ${error.message}`)
          return (current ?? []).filter((b) => b.recordId !== recordId)
        },
        {
          optimisticData: (current: BookmarkWithRecord[] | undefined) =>
            (current ?? []).filter((b) => b.recordId !== recordId),
          rollbackOnError: true,
        },
      )
    },
    [supabase, mutate],
  )

  return {
    toggleBookmark,
    addBookmark,
    removeBookmark,
  }
}
