'use client'

import { useCallback, useState } from 'react'
import type { GroupType } from '@/domain/entities/group'

interface InviteGroupInfo {
  id: string
  name: string
  description: string | null
  type: GroupType
  memberCount: number
}

export function useInvite() {
  const [isLoading, setIsLoading] = useState(false)

  const generateInviteLink = useCallback(async (groupId: string): Promise<string | null> => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/groups/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })

      if (!res.ok) {
        const data: unknown = await res.json()
        const message = data && typeof data === 'object' && 'error' in data
          ? String((data as { error: string }).error)
          : 'Failed to generate invite link'
        throw new Error(message)
      }

      const { inviteUrl } = (await res.json()) as { inviteUrl: string }
      return inviteUrl
    } catch (err) {
      console.error('Failed to generate invite link:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getInviteInfo = useCallback(async (token: string): Promise<InviteGroupInfo | null> => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/groups/invite?token=${encodeURIComponent(token)}`)

      if (!res.ok) {
        return null
      }

      const { group } = (await res.json()) as { group: InviteGroupInfo }
      return group
    } catch (err) {
      console.error('Failed to get invite info:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { generateInviteLink, getInviteInfo, isLoading }
}
