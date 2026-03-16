'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/infrastructure/supabase/client'

export function useShareRecord() {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shareToGroup = useCallback(async (recordId: string, groupId: string) => {
    setIsSharing(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: shareError } = await supabase
        .from('record_shares')
        .insert({ record_id: recordId, group_id: groupId })

      if (shareError) throw new Error(shareError.message)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share')
      return false
    } finally {
      setIsSharing(false)
    }
  }, [])

  return { shareToGroup, isSharing, error }
}
