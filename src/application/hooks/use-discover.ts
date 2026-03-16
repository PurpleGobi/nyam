'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface DiscoverFilters {
  query: string
  category: string | null
  situation: string | null
}

interface DiscoverRecord {
  id: string
  menuName: string
  category: string
  ratingOverall: number
  createdAt: string
  comment: string | null
  flavorTags: string[]
  userId: string
}

async function fetchDiscoverRecords(filters: DiscoverFilters): Promise<DiscoverRecord[]> {
  const supabase = createClient()
  let query = supabase
    .from('records')
    .select('id, menu_name, category, rating_overall, created_at, comment, flavor_tags, user_id')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(30)

  if (filters.query.trim()) {
    query = query.or(`menu_name.ilike.%${filters.query}%,comment.ilike.%${filters.query}%`)
  }
  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.situation) {
    query = query.contains('tags', [filters.situation])
  }

  const { data } = await query

  if (!data) return []
  return data.map((r) => ({
    id: r.id,
    menuName: r.menu_name ?? '',
    category: r.category ?? '',
    ratingOverall: r.rating_overall ?? 0,
    createdAt: r.created_at,
    comment: r.comment,
    flavorTags: r.flavor_tags ?? [],
    userId: r.user_id,
  }))
}

export function useDiscover(filters: DiscoverFilters) {
  const key = filters.query || filters.category || filters.situation
    ? ['discover', filters.query, filters.category, filters.situation]
    : ['discover-feed']

  return useSWR(key, () => fetchDiscoverRecords(filters))
}
