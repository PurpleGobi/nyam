'use client'

import { useState, useEffect, useCallback } from 'react'
import type { UserSettings } from '@/domain/entities/settings'
import { getSupabaseClient } from '@/shared/di/container'

export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseClient()
    supabase
      .from('users')
      .select('nickname, bio, avatar_url, privacy_profile, privacy_records, visibility_public, visibility_bubble, notify_push, notify_level_up, notify_bubble_join, notify_follow, dnd_start, dnd_end, pref_landing, pref_home_tab, pref_default_sort, pref_record_input, pref_bubble_share, pref_temp_unit, pref_view_mode')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            nickname: data.nickname,
            bio: data.bio,
            avatarUrl: data.avatar_url,
            privacyProfile: data.privacy_profile as UserSettings['privacyProfile'],
            privacyRecords: data.privacy_records as UserSettings['privacyRecords'],
            visibilityPublic: data.visibility_public as UserSettings['visibilityPublic'],
            visibilityBubble: data.visibility_bubble as UserSettings['visibilityBubble'],
            notifyPush: data.notify_push,
            notifyLevelUp: data.notify_level_up,
            notifyBubbleJoin: data.notify_bubble_join,
            notifyFollow: data.notify_follow,
            dndStart: data.dnd_start,
            dndEnd: data.dnd_end,
            prefLanding: data.pref_landing,
            prefHomeTab: data.pref_home_tab,
            prefDefaultSort: data.pref_default_sort,
            prefRecordInput: data.pref_record_input,
            prefBubbleShare: data.pref_bubble_share,
            prefTempUnit: data.pref_temp_unit,
            prefViewMode: data.pref_view_mode,
          })
        }
        setIsLoading(false)
      })
  }, [userId])

  const updateSetting = useCallback(
    async (field: string, value: unknown) => {
      if (!userId) return
      const supabase = getSupabaseClient()
      await supabase.from('users').update({ [field]: value }).eq('id', userId)
      setSettings((prev) => prev ? { ...prev, [camelToSettingsKey(field)]: value } : prev)
    },
    [userId],
  )

  return { settings, isLoading, updateSetting }
}

function camelToSettingsKey(snakeKey: string): string {
  return snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
