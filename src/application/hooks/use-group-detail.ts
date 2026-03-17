"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { SupabaseGroupRepository } from "@/infrastructure/repositories/supabase-group-repository"
import { getRecordRepository } from "@/di/repositories"
import type { GroupWithStats, GroupMembership } from "@/domain/entities/group"
import type { RecordWithPhotos } from "@/domain/entities/record"

export function useGroupDetail(groupId: string | null) {
  const supabase = createClient()
  const groupRepo = useMemo(() => new SupabaseGroupRepository(), [])
  const recordRepo = useMemo(() => getRecordRepository(), [])

  const { data: group, error: groupError, isLoading, mutate } = useSWR<GroupWithStats | null>(
    groupId ? `group/${groupId}` : null,
    async () => {
      if (!groupId) return null
      return groupRepo.getById(groupId)
    },
  )

  const { data: members } = useSWR<GroupMembership[]>(
    groupId ? `group/${groupId}/members` : null,
    async () => {
      if (!groupId) return []
      return groupRepo.getMembers(groupId)
    },
  )

  const { data: recentRecords } = useSWR<RecordWithPhotos[]>(
    groupId ? `group/${groupId}/records` : null,
    async () => {
      if (!groupId) return []

      // Fetch member user IDs, then get their shared records
      const memberList = await groupRepo.getMembers(groupId)
      if (memberList.length === 0) return []

      const memberIds = memberList.map((m) => m.userId)

      const { data: shareRows, error: shareError } = await supabase
        .from("record_shares")
        .select("record_id")
        .eq("group_id", groupId)
        .limit(20)

      if (shareError || !shareRows?.length) return []

      const recordIds = shareRows.map((r) => r.record_id as string)
      const records: RecordWithPhotos[] = []

      for (const id of recordIds) {
        const record = await recordRepo.getById(id)
        if (record && memberIds.includes(record.userId)) {
          records.push(record)
        }
      }

      return records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
  )

  return {
    group: group ?? null,
    members: members ?? [],
    recentRecords: recentRecords ?? [],
    isLoading,
    error: groupError ? String(groupError) : null,
    mutate,
  }
}
