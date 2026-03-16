'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/infrastructure/supabase/client'

export function useBookmarkActions() {
  const [isLoading, setIsLoading] = useState(false)

  const toggleBookmark = useCallback(
    async (recordId: string, userId: string, isBookmarked: boolean) => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        if (isBookmarked) {
          const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('record_id', recordId)
            .eq('user_id', userId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('bookmarks')
            .insert({ record_id: recordId, user_id: userId })
          if (error) throw error
        }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { toggleBookmark, isLoading }
}
