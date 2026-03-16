'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface PublicGroup {
  id: string
  name: string
  description: string | null
  type: string
  memberCount: number
  createdAt: string
}

export function usePublicGroups() {
  return useSWR('public-groups', async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('groups')
      .select('id, name, description, type, created_at')
      .in('type', ['public', 'viewonly'])
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!data) return []

    return Promise.all(data.map(async (g) => {
      const { count } = await supabase
        .from('group_memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('group_id', g.id)

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        memberCount: count ?? 0,
        createdAt: g.created_at,
      } satisfies PublicGroup
    }))
  })
}
