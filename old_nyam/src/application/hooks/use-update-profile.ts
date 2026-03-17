'use client'

import { useCallback, useState } from 'react'
import { getUserRepository } from '@/di/repositories'

interface UpdateProfileParams {
  nickname?: string
  avatarUrl?: string
}

export function useUpdateProfile() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const repo = getUserRepository()

  const updateProfile = useCallback(async (userId: string, params: UpdateProfileParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const updated = await repo.updateProfile(userId, params)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [repo])

  return { updateProfile, isLoading, error }
}
