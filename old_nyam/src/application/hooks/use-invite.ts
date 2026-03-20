"use client"

import { useState, useCallback, useMemo } from "react"
import useSWR from "swr"
import { useSWRConfig } from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { SupabaseGroupRepository } from "@/infrastructure/repositories/supabase-group-repository"
import type { Group } from "@/domain/entities/group"

export function useInvite(code: string | null) {
  const supabase = createClient()
  const groupRepo = useMemo(() => new SupabaseGroupRepository(), [])
  const { mutate: globalMutate } = useSWRConfig()
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const { data: group, error, isLoading } = useSWR<Group | null>(
    code ? `invite/${code}` : null,
    async () => {
      if (!code) return null
      return groupRepo.getByInviteCode(code)
    },
  )

  const joinGroup = useCallback(
    async () => {
      if (!group) return

      setIsJoining(true)
      setJoinError(null)

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setJoinError("Not authenticated")
          return
        }

        await groupRepo.join(group.id, user.id)

        // Invalidate groups cache
        await globalMutate("my-groups")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join group"
        // Handle duplicate membership
        if (message.includes("23505") || message.includes("duplicate")) {
          setJoinError("Already a member of this group")
        } else {
          setJoinError(message)
        }
      } finally {
        setIsJoining(false)
      }
    },
    [supabase, groupRepo, group, globalMutate],
  )

  const generateInviteCode = useCallback(
    async (groupId: string): Promise<string | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        return await groupRepo.generateInviteCode(groupId)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate invite code"
        setJoinError(message)
        return null
      }
    },
    [supabase, groupRepo],
  )

  return {
    group: group ?? null,
    isLoading,
    isJoining,
    error: error ? String(error) : null,
    joinError,
    joinGroup,
    generateInviteCode,
  }
}
