'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'

export interface MapPin {
  id: string
  lat: number
  lng: number
  rating: number
  name: string
  friendName?: string
  color?: string
}

const PIN_COLORS = [
  '#4A90D9', '#7B61FF', '#2ECC71', '#E67E22',
  '#E74C3C', '#1ABC9C', '#9B59B6', '#3498DB',
]

function deterministicColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return PIN_COLORS[Math.abs(hash) % PIN_COLORS.length]
}

export function useRecordsForMap(userId: string | undefined) {
  const { data, isLoading, error } = useSWR(
    userId ? ['records-for-map', userId] : null,
    async () => {
      const supabase = createClient()

      // 1. Fetch user's records with location
      const { data: myRecords, error: myError } = await supabase
        .from('records')
        .select('id, menu_name, rating_overall, location_lat, location_lng')
        .eq('user_id', userId!)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)

      if (myError) throw myError

      const myPins: MapPin[] = (myRecords ?? []).map((row) => ({
        id: row.id,
        lat: row.location_lat!,
        lng: row.location_lng!,
        rating: row.rating_overall ?? 0,
        name: row.menu_name ?? '',
      }))

      // 2. Get friend user IDs via group memberships
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', userId!)

      let friendPins: MapPin[] = []

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map((m) => m.group_id)

        const { data: otherMembers } = await supabase
          .from('group_memberships')
          .select('user_id')
          .in('group_id', groupIds)
          .neq('user_id', userId!)

        if (otherMembers && otherMembers.length > 0) {
          const friendUserIds = [...new Set(otherMembers.map((m) => m.user_id))]

          // 3. Fetch friend records with location
          const { data: friendRecords } = await supabase
            .from('records')
            .select('id, user_id, menu_name, rating_overall, location_lat, location_lng')
            .in('user_id', friendUserIds)
            .in('visibility', ['public', 'group'])
            .not('location_lat', 'is', null)
            .not('location_lng', 'is', null)
            .limit(50)

          if (friendRecords && friendRecords.length > 0) {
            // Fetch nicknames for friend records
            const friendRecordUserIds = [...new Set(friendRecords.map((r) => r.user_id))]
            const { data: users } = await supabase
              .from('users')
              .select('id, nickname')
              .in('id', friendRecordUserIds)

            const profileMap = new Map<string, string>()
            if (users) {
              for (const u of users) {
                profileMap.set(u.id, u.nickname ?? '익명')
              }
            }

            friendPins = friendRecords.map((row) => ({
              id: row.id,
              lat: row.location_lat!,
              lng: row.location_lng!,
              rating: row.rating_overall ?? 0,
              name: row.menu_name ?? '',
              friendName: profileMap.get(row.user_id) ?? '익명',
              color: deterministicColor(row.user_id),
            }))
          }
        }
      }

      return { myPins, friendPins }
    },
  )

  return {
    myPins: data?.myPins ?? [],
    friendPins: data?.friendPins ?? [],
    isLoading,
    error,
  }
}
