'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { settingsRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { VisibilityConfig, PrivacyProfile, PrivacyRecords, DeleteMode } from '@/domain/entities/settings'

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

  const updatePrivacyProfile = useCallback(async (value: PrivacyProfile) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, privacyProfile: value }, false)
    try {
      await settingsRepo.updatePrivacyProfile(userId, value)
    } catch {
      mutate(['settings', userId])
    }
  }, [userId, settings, mutate])

  const updatePrivacyRecords = useCallback(async (value: PrivacyRecords) => {
    if (!userId || !settings) return
    mutate(['settings', userId], { ...settings, privacyRecords: value }, false)
    try {
      await settingsRepo.updatePrivacyRecords(userId, value)
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

  // ── 알림 ──

  const updateNotify = useCallback(async (field: string, value: boolean) => {
    if (!userId) return
    await settingsRepo.updateNotifySetting(userId, field, value)
    mutate(['settings', userId])
  }, [userId, mutate])

  // ── 환경설정 ──

  const updatePreference = useCallback(async (field: string, value: string) => {
    if (!userId) return
    await settingsRepo.updatePreference(userId, field, value)
    mutate(['settings', userId])
  }, [userId, mutate])

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

  return {
    settings,
    bubbleOverrides,
    isLoading,
    error,
    updatePrivacyProfile,
    updatePrivacyRecords,
    updateVisibilityPublic,
    updateVisibilityBubble,
    updateNotify,
    updatePreference,
    requestDeletion,
    cancelDeletion,
  }
}
