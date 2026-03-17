'use client'

import useSWR from 'swr'
import { getGroupRepository } from '@/di/repositories'

export function useGroupDetail(groupId: string | undefined) {
  const repo = getGroupRepository()

  const group = useSWR(
    groupId ? ['group', groupId] : null,
    () => repo.getById(groupId!),
  )

  const members = useSWR(
    groupId ? ['group-members', groupId] : null,
    () => repo.getMembers(groupId!),
  )

  return {
    group: group.data,
    members: members.data ?? [],
    isLoading: group.isLoading || members.isLoading,
    error: group.error || members.error,
    mutateGroup: group.mutate,
    mutateMembers: members.mutate,
  }
}
