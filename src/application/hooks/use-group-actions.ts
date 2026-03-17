"use client"

import { useCallback, useMemo, useState } from "react"
import { createClient } from "@/infrastructure/supabase/client"
import { SupabaseGroupRepository } from "@/infrastructure/repositories/supabase-group-repository"

export function useGroupActions() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const repo = useMemo(() => new SupabaseGroupRepository(), [])

  const createGroup = useCallback(async (input: {
    name: string
    description?: string
    accessType?: "private" | "public"
    sharingType?: "interactive" | "view_only"
  }) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      return await repo.create(user.id, input)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, repo])

  const joinGroup = useCallback(async (groupId: string) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      return await repo.join(groupId, user.id)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, repo])

  const leaveGroup = useCallback(async (groupId: string) => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      await repo.leave(groupId, user.id)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, repo])

  return { createGroup, joinGroup, leaveGroup, isLoading }
}
