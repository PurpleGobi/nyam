'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export function useBookmarks(userId: string | undefined) {
  const { data, isLoading, mutate } = useSWR(
    userId ? ['bookmarks', userId] : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookmarks')
        .select('record_id')
        .eq('user_id', userId!)

      if (error) throw error
      return new Set((data ?? []).map((row) => row.record_id))
    },
  )

  return {
    bookmarkedIds: data ?? new Set<string>(),
    isLoading,
    mutate,
  }
}
