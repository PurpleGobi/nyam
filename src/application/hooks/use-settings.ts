'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback, useRef } from 'react'
import { settingsRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { VisibilityConfig, FollowPolicy, DeleteMode } from '@/domain/entities/settings'

const DEBOUNCE_MS = 500

export function useSettings() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { mutate } = useSWRConfig()

  const { data: settings, isLoading, error } = useSWR(
    userId ? ['settings', userId] : null,
    ([, id]) => settingsRepo.getUserSettings(id),
  )

  const { data: bubbleOverrides } = useSWR(
    userId ? ['bubble-overrides', userId] : null,
    ([, id]) => settingsRepo.getBubblePrivacyOverrides(id),
  )

  // ── 프라이버시 ──

  const updateIsPublic = useCallback(async (value: boolean) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, isPublic: value }, false)
    try {
      await settingsRepo.updateIsPublic(userId, value)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  const updateFollowPolicy = useCallback(async (value: FollowPolicy) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, followPolicy: value }, false)
    try {
      await settingsRepo.updateFollowPolicy(userId, value)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  const updateFollowConditions = useCallback(async (minRecords: number | null, minLevel: number | null) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, followMinRecords: minRecords, followMinLevel: minLevel }, false)
    try {
      await settingsRepo.updateFollowConditions(userId, minRecords, minLevel)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  const updateVisibilityPublic = useCallback(async (config: VisibilityConfig) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, visibilityPublic: config }, false)
    try {
      await settingsRepo.updateVisibilityPublic(userId, config)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  const updateVisibilityBubble = useCallback(async (config: VisibilityConfig) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, visibilityBubble: config }, false)
    try {
      await settingsRepo.updateVisibilityBubble(userId, config)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  // ── 알림 (optimistic + debounce) ──

  const notifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateNotify = useCallback(async (field: string, value: boolean) => {
    if (!userId || !settings) return
    // camelCase mapping for optimistic update
    const camelField = field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    mutate(['settings', userId], { ...settings, [camelField]: value }, false)
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current)
    notifyTimerRef.current = setTimeout(async () => {
      try {
        await settingsRepo.updateNotifySetting(userId, field, value)
      } catch {
        mutate(['settings', userId])
      }
    }, DEBOUNCE_MS)
  }, [userId, settings, mutate])

  // ── 환경설정 (optimistic + debounce) ──

  const prefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePreference = useCallback(async (field: string, value: string) => {
    if (!userId || !settings) return
    const camelField = field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    mutate(['settings', userId], { ...settings, [camelField]: value }, false)
    if (prefTimerRef.current) clearTimeout(prefTimerRef.current)
    prefTimerRef.current = setTimeout(async () => {
      try {
        await settingsRepo.updatePreference(userId, field, value)
      } catch {
        mutate(['settings', userId])
      }
    }, DEBOUNCE_MS)
  }, [userId, settings, mutate])

  // ── 계정 삭제 ──

  const requestDeletion = useCallback(async (mode: DeleteMode) => {
    if (!userId) return
    await settingsRepo.requestAccountDeletion(userId, mode)
    mutate(['settings', userId])
  }, [userId, mutate])

  const cancelDeletion = useCallback(async () => {
    if (!userId) return
    await settingsRepo.cancelAccountDeletion(userId)
    mutate(['settings', userId])
  }, [userId, mutate])

  const updateBubbleVisibility = useCallback(async (bubbleId: string, config: VisibilityConfig | null) => {
    if (!userId) return
    await settingsRepo.updateBubbleVisibilityOverride(userId, bubbleId, config)
    mutate(['bubble-overrides', userId])
  }, [userId, mutate])

  // ── 계정 정보 수정 ──

  const updateNickname = useCallback(async (nickname: string) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, nickname }, false)
    await settingsRepo.updateNickname(userId, nickname)
  }, [userId, settings, mutate])

  const updateBio = useCallback(async (bio: string) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, bio }, false)
    await settingsRepo.updateBio(userId, bio)
  }, [userId, settings, mutate])

  const updateAvatar = useCallback(async (file: File) => {
    if (!userId || !settings) return
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `profiles/${userId}.${ext}`
    const { createClient } = await import('@/infrastructure/supabase/client')
    const supabase = createClient()
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await settingsRepo.updateAvatar(userId, publicUrl)
    mutate(['settings', userId], { ...settings, avatarUrl: publicUrl }, false)
  }, [userId, settings, mutate])

  const updateDndTime = useCallback(async (start: string | null, end: string | null) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, dndStart: start, dndEnd: end }, false)
    await settingsRepo.updateDndTime(userId, start, end)
  }, [userId, settings, mutate])

  // ── 데이터 ──

  const exportData = useCallback(async (format: 'json' | 'csv') => {
    if (!userId) return
    const blob = await settingsRepo.exportData(userId, format)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nyam-export.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }, [userId])

  const importData = useCallback(async (file: File) => {
    if (!userId) return
    await settingsRepo.importData(userId, file)
  }, [userId])

  const downloadTemplate = useCallback(async () => {
    const blob = await settingsRepo.generateImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nyam-import-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const clearCache = useCallback(async () => {
    await settingsRepo.clearCache()
  }, [])

  return {
    settings,
    bubbleOverrides,
    isLoading,
    error,
    updateIsPublic,
    updateFollowPolicy,
    updateFollowConditions,
    updateVisibilityPublic,
    updateVisibilityBubble,
    updateBubbleVisibility,
    updateNotify,
    updatePreference,
    requestDeletion,
    cancelDeletion,
    updateNickname,
    updateBio,
    updateDndTime,
    updateAvatar,
    exportData,
    importData,
    downloadTemplate,
    clearCache,
  }
}
