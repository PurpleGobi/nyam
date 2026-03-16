'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface GroupFeedItem {
  id: string
  recordId: string
  sharedAt: string
  sharedByUserId: string
  record: {
    id: string
    menuName: string
    category: string
    ratingOverall: number
    comment: string | null
    createdAt: string
  }
}

interface RawFeedRow {
  id: string
  record_id: string
  shared_at: string
  user_id: string
  records: {
    id: string
    menu_name: string
    category: string
    rating_overall: number
    comment: string | null
    created_at: string
  }
}

function mapToFeedItem(row: RawFeedRow): GroupFeedItem {
  return {
    id: row.id,
    recordId: row.record_id,
    sharedAt: row.shared_at,
    sharedByUserId: row.user_id,
    record: {
      id: row.records.id,
      menuName: row.records.menu_name,
      category: row.records.category,
      ratingOverall: row.records.rating_overall,
      comment: row.records.comment,
      createdAt: row.records.created_at,
    },
  }
}

export function useGroupFeed(groupId: string | undefined) {
  const { data, isLoading, mutate } = useSWR(
    groupId ? ['group-feed', groupId] : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('record_shares')
        .select(
          'id, record_id, shared_at, user_id, records!inner(id, menu_name, category, rating_overall, comment, created_at)',
        )
        .eq('group_id', groupId!)
        .order('shared_at', { ascending: false })
        .limit(30)

      if (error) throw new Error(error.message)

      return (data as unknown as RawFeedRow[]).map(mapToFeedItem)
    },
  )

  return {
    feed: data ?? [],
    isLoading,
    mutate,
  }
}
