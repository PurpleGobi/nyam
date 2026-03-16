'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'
import type { ReactionType } from '@/infrastructure/supabase/types'

export interface Notification {
  readonly id: string
  readonly type: 'reaction' | 'share'
  readonly message: string
  readonly recordId: string
  readonly createdAt: string
}

const REACTION_LABELS: Record<ReactionType, string> = {
  like: '좋아요',
  useful: '유용해요',
  yummy: '맛있겠다',
  comment: '댓글',
}

export function useNotifications(userId: string | undefined) {
  const { data, isLoading, mutate } = useSWR(
    userId ? ['notifications', userId] : null,
    async (): Promise<Notification[]> => {
      const supabase = createClient()

      // Fetch reactions on the user's records
      const { data: userRecordIds } = await supabase
        .from('records')
        .select('id')
        .eq('user_id', userId!)

      const recordIds = (userRecordIds ?? []).map((r) => r.id)

      const reactionNotifs: Notification[] = []
      if (recordIds.length > 0) {
        const { data: reactions } = await supabase
          .from('reactions')
          .select('id, type, created_at, user_id, record_id')
          .in('record_id', recordIds)
          .neq('user_id', userId!)
          .order('created_at', { ascending: false })
          .limit(30)

        // Fetch menu names for reacted records
        const reactedRecordIds = [...new Set((reactions ?? []).map((r) => r.record_id))]
        const { data: reactedRecords } = await supabase
          .from('records')
          .select('id, menu_name')
          .in('id', reactedRecordIds.length > 0 ? reactedRecordIds : ['_none_'])

        const menuMap = new Map((reactedRecords ?? []).map((r) => [r.id, r.menu_name]))

        for (const row of reactions ?? []) {
          const menuName = menuMap.get(row.record_id) ?? '알 수 없는 메뉴'
          const reactionType = row.type as ReactionType
          const label = REACTION_LABELS[reactionType] ?? reactionType
          reactionNotifs.push({
            id: `reaction-${row.id}`,
            type: 'reaction' as const,
            message: `누군가 '${menuName}' 기록에 ${label}를 눌렀습니다`,
            recordId: row.record_id,
            createdAt: row.created_at,
          })
        }
      }

      // Fetch record shares
      const { data: shares } = await supabase
        .from('record_shares')
        .select('record_id, shared_at, group_id')
        .order('shared_at', { ascending: false })
        .limit(20)

      const shareRecordIds = [...new Set((shares ?? []).map((s) => s.record_id))]
      const shareGroupIds = [...new Set((shares ?? []).map((s) => s.group_id))]

      const [shareRecordsResult, shareGroupsResult] = await Promise.all([
        supabase.from('records').select('id, menu_name').in('id', shareRecordIds.length > 0 ? shareRecordIds : ['_none_']),
        supabase.from('groups').select('id, name').in('id', shareGroupIds.length > 0 ? shareGroupIds : ['_none_']),
      ])

      const shareMenuMap = new Map((shareRecordsResult.data ?? []).map((r) => [r.id, r.menu_name]))
      const groupNameMap = new Map((shareGroupsResult.data ?? []).map((g) => [g.id, g.name]))

      const shareNotifs: Notification[] = (shares ?? []).map((row) => ({
        id: `share-${row.record_id}-${row.group_id}`,
        type: 'share' as const,
        message: `'${groupNameMap.get(row.group_id) ?? '그룹'}' 그룹에 '${shareMenuMap.get(row.record_id) ?? '메뉴'}' 기록이 공유되었습니다`,
        recordId: row.record_id,
        createdAt: row.shared_at,
      }))

      const combined = [...reactionNotifs, ...shareNotifs]
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return combined
    },
  )

  const notifications = data ?? []

  return {
    notifications,
    isLoading,
    mutate,
    unreadCount: notifications.length,
  }
}
