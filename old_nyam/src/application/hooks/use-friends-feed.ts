"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { getRecordRepository } from "@/di/repositories"
import type { RecordWithPhotos } from "@/domain/entities/record"

export interface FriendsFeedRecord extends RecordWithPhotos {
  authorNickname: string
  authorAvatarUrl: string | null
}

export function useFriendsFeed(userId: string | null, limit = 20) {
  const supabase = createClient()
  const recordRepo = getRecordRepository()

  const { data, error, isLoading, mutate } = useSWR<FriendsFeedRecord[]>(
    userId ? `friends-feed/${userId}/${limit}` : null,
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

      // Fetch full records with photos + author info
      const records: FriendsFeedRecord[] = []
      for (const recordId of uniqueRecordIds) {
        const record = await recordRepo.getById(recordId)
        if (record && record.userId !== user.id) {
          // Fetch author info
          const { data: author } = await supabase
            .from("users")
            .select("nickname, avatar_url")
            .eq("id", record.userId)
            .single()

          records.push({
            ...record,
            authorNickname: author?.nickname ?? "익명",
            authorAvatarUrl: author?.avatar_url ?? null,
          })
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
