"use client"

import useSWR from "swr"
import { SupabaseGroupRepository } from "@/infrastructure/repositories/supabase-group-repository"
import type { GroupWithStats } from "@/domain/entities/group"

export function usePublicGroups() {
  const repo = new SupabaseGroupRepository()

  const { data, isLoading } = useSWR<GroupWithStats[]>(
    "public-groups",
    () => repo.getPublicGroups(),
  )

  return { groups: data ?? [], isLoading }
}
