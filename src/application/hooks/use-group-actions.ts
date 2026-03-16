'use client'

import { useCallback, useState } from 'react'
import { getGroupRepository } from '@/di/repositories'
import type { GroupType, GroupEntryRequirements } from '@/domain/entities/group'

interface CreateGroupParams {
  name: string
  description: string
  type: GroupType
  ownerId: string
  entryRequirements: GroupEntryRequirements
}

export function useGroupActions() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const repo = getGroupRepository()

  const createGroup = useCallback(async (params: CreateGroupParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const group = await repo.create(params)
      return group
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create group'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  const joinGroup = useCallback(async (groupId: string, userId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await repo.join(groupId, userId)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join group'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  const leaveGroup = useCallback(async (groupId: string, userId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await repo.leave(groupId, userId)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to leave group'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  return { createGroup, joinGroup, leaveGroup, isLoading, error }
}
