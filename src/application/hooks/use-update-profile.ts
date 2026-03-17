"use client"

import { useCallback, useState } from "react"
import { useSWRConfig } from "swr"
import { createClient } from "@/infrastructure/supabase/client"

export interface UpdateProfileInput {
  nickname?: string
  profileImageUrl?: string
  bio?: string
}

export function useUpdateProfile() {
  const supabase = createClient()
  const { mutate } = useSWRConfig()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      setIsUpdating(true)
      setUpdateError(null)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        const updateData: Record<string, unknown> = {}
        if (input.nickname !== undefined) updateData.nickname = input.nickname
        if (input.profileImageUrl !== undefined) updateData.avatar_url = input.profileImageUrl
        if (input.bio !== undefined) updateData.bio = input.bio

        if (Object.keys(updateData).length === 0) return

        const { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", user.id)

        if (error) throw new Error(`Failed to update profile: ${error.message}`)

        // Revalidate profile cache
        await mutate("profile")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update profile"
        setUpdateError(message)
        throw err
      } finally {
        setIsUpdating(false)
      }
    },
    [supabase, mutate],
  )

  return {
    updateProfile,
    isUpdating,
    updateError,
  }
}
