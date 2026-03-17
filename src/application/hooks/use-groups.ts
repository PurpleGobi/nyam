"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { SupabaseGroupRepository } from "@/infrastructure/repositories/supabase-group-repository"
import type { GroupWithStats } from "@/domain/entities/group"

export function useGroups() {
  const supabase = createClient()
  const repo = new SupabaseGroupRepository()

  const { data: myGroups, error, isLoading, mutate } = useSWR<GroupWithStats[]>(
    "my-groups",
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      return repo.getMyGroups(user.id)
    },
  )

  return {
    groups: myGroups ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
