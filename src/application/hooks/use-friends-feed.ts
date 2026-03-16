'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'
import type { FriendFeedItem } from '@/domain/entities/friend-feed'

const AVATAR_COLORS = [
  '#FF6038', '#4A90D9', '#7B61FF', '#2ECC71',
  '#E67E22', '#E74C3C', '#1ABC9C', '#9B59B6',
]

function deterministicColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function useFriendsFeed(userId: string | undefined) {
  const { data, isLoading, error } = useSWR(
    userId ? ['friends-feed', userId] : null,
    async () => {
      const supabase = createClient()

      // 1. Get user's group IDs
      const { data: memberships, error: memError } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userId!)

      if (memError || !memberships || memberships.length === 0) return []

      const groupIds = memberships.map((m) => m.group_id)

      // 2. Get other member user IDs from those groups
      const { data: otherMembers, error: otherError } = await supabase
        .from('group_memberships')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .neq('user_id', userId!)

      if (otherError || !otherMembers || otherMembers.length === 0) return []

      const friendUserIds = [...new Set(otherMembers.map((m) => m.user_id))]

      // Build a map of userId -> first groupId for groupName lookup
      const userGroupMap = new Map<string, string>()
      for (const m of otherMembers) {
        if (!userGroupMap.has(m.user_id)) {
          userGroupMap.set(m.user_id, m.group_id)
        }
      }

      // 3. Fetch recent records from those users
      const { data: records, error: recError } = await supabase
        .from('records')
        .select('id, user_id, menu_name, comment, rating_overall, category, created_at')
        .in('user_id', friendUserIds)
        .in('visibility', ['public', 'group'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (recError || !records || records.length === 0) return []

      // 4. Fetch user nicknames
      const recordUserIds = [...new Set(records.map((r) => r.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, nickname')
        .in('id', recordUserIds)

      const profileMap = new Map<string, string>()
      if (users) {
        for (const u of users) {
          profileMap.set(u.id, u.nickname ?? '익명')
        }
      }

      // 5. Fetch group names
      const relevantGroupIds = [...new Set([...userGroupMap.values()])]
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', relevantGroupIds)

      const groupNameMap = new Map<string, string>()
      if (groups) {
        for (const g of groups) {
          groupNameMap.set(g.id, g.name)
        }
      }

      return records.map((row): FriendFeedItem => {
        const nickname = profileMap.get(row.user_id) ?? '익명'
        const groupId = userGroupMap.get(row.user_id) ?? ''
        return {
          id: row.id,
          userId: row.user_id,
          nickname,
          avatarInitial: nickname.charAt(0),
          avatarColor: deterministicColor(row.user_id),
          restaurantName: row.menu_name ?? '',
          comment: row.comment,
          ratingOverall: row.rating_overall ?? 0,
          area: row.category ?? '',
          groupName: groupNameMap.get(groupId) ?? '',
        }
      })
    },
  )

  return { items: data ?? [], isLoading, error }
}
