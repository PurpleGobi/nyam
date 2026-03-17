'use client'

import useSWR from 'swr'
import { createClient } from '@/infrastructure/supabase/client'
import { useAuthContext } from '@/presentation/providers/auth-provider'

interface UsePremiumGroupResult {
  isPremium: boolean
  hasAccess: boolean
  isLoading: boolean
}

/**
 * Checks if a group is premium (viewonly type) and whether the current user has access.
 * A user has access if they are an active member of the group.
 */
export function usePremiumGroup(groupId: string | undefined): UsePremiumGroupResult {
  const { user } = useAuthContext()

  const { data, isLoading } = useSWR(
    groupId ? ['premium-group-check', groupId, user?.id] : null,
    async () => {
      const supabase = createClient()

      const { data: group } = await supabase
        .from('groups')
        .select('type')
        .eq('id', groupId!)
        .single()

      const isPremium = group?.type === 'viewonly'

      if (!isPremium || !user?.id) {
        return { isPremium, hasAccess: !isPremium }
      }

      const { data: membership } = await supabase
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId!)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      return {
        isPremium,
        hasAccess: !!membership,
      }
    },
  )

  return {
    isPremium: data?.isPremium ?? false,
    hasAccess: data?.hasAccess ?? false,
    isLoading,
  }
}
