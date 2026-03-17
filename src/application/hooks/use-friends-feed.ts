"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos } from "@/domain/entities/record"

export function useFriendsFeed(limit = 20) {
  const supabase = createClient()
  const recordRepo = getRecordRepository()

  const { data, error, isLoading, mutate } = useSWR<RecordWithPhotos[]>(
    `friends-feed/${limit}`,
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get all groups the user belongs to
      const { data: memberships, error: memberError } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "active")

      if (memberError || !memberships?.length) return []

      const groupIds = memberships.map((m) => m.group_id as string)

      // Get shared record IDs from these groups
      const { data: shares, error: shareError } = await supabase
        .from("record_shares")
        .select("record_id")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (shareError || !shares?.length) return []

      // Deduplicate record IDs
      const uniqueRecordIds = [...new Set(shares.map((s) => s.record_id as string))]

      // Fetch full records with photos
      const records: RecordWithPhotos[] = []
      for (const recordId of uniqueRecordIds) {
        const record = await recordRepo.getById(recordId)
        if (record && record.userId !== user.id) {
          records.push(record)
        }
      }

      return records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
  )

  return {
    records: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
