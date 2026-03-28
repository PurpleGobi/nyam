import { createClient } from '@/infrastructure/supabase/client'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import type { UserSettings, VisibilityConfig, PrivacyProfile, PrivacyRecords, BubblePrivacyOverride, DeleteMode } from '@/domain/entities/settings'

const SETTINGS_SELECT = 'nickname, bio, avatar_url, privacy_profile, privacy_records, visibility_public, visibility_bubble, notify_push, notify_level_up, notify_bubble_join, notify_follow, dnd_start, dnd_end, pref_landing, pref_home_tab, pref_restaurant_sub, pref_wine_sub, pref_bubble_tab, pref_default_sort, pref_record_input, pref_bubble_share, pref_temp_unit, pref_view_mode, deleted_at, delete_mode, delete_scheduled_at'

export class SupabaseSettingsRepository implements SettingsRepository {
  private get supabase() {
    return createClient()
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('users')
      .select(SETTINGS_SELECT)
      .eq('id', userId)
      .single()

    if (error) throw new Error(`Settings 조회 실패: ${error.message}`)

    return {
      nickname: data.nickname as string,
      bio: data.bio as string | null,
      avatarUrl: data.avatar_url as string | null,
      privacyProfile: (data.privacy_profile as PrivacyProfile) ?? 'bubble_only',
      privacyRecords: (data.privacy_records as PrivacyRecords) ?? 'shared_only',
      visibilityPublic: data.visibility_public as VisibilityConfig,
      visibilityBubble: data.visibility_bubble as VisibilityConfig,
      notifyPush: (data.notify_push as boolean) ?? true,
      notifyLevelUp: (data.notify_level_up as boolean) ?? true,
      notifyBubbleJoin: (data.notify_bubble_join as boolean) ?? true,
      notifyFollow: (data.notify_follow as boolean) ?? true,
      dndStart: data.dnd_start as string | null,
      dndEnd: data.dnd_end as string | null,
      prefLanding: (data.pref_landing as string) ?? 'last',
      prefHomeTab: (data.pref_home_tab as string) ?? 'last',
      prefRestaurantSub: (data.pref_restaurant_sub as string) ?? 'last',
      prefWineSub: (data.pref_wine_sub as string) ?? 'last',
      prefBubbleTab: (data.pref_bubble_tab as string) ?? 'last',
      prefViewMode: (data.pref_view_mode as string) ?? 'last',
      prefDefaultSort: (data.pref_default_sort as string) ?? 'latest',
      prefRecordInput: (data.pref_record_input as string) ?? 'camera',
      prefBubbleShare: (data.pref_bubble_share as string) ?? 'ask',
      prefTempUnit: (data.pref_temp_unit as string) ?? 'C',
      deletedAt: data.deleted_at as string | null,
      deleteMode: data.delete_mode as DeleteMode | null,
      deleteScheduledAt: data.delete_scheduled_at as string | null,
    }
  }

  // ── 계정 ──

  async updateNickname(userId: string, nickname: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ nickname }).eq('id', userId)
    if (error) throw error
  }

  async updateBio(userId: string, bio: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ bio }).eq('id', userId)
    if (error) throw error
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', userId)
    if (error) throw error
  }

  // ── 프라이버시 ──

  async updatePrivacyProfile(userId: string, value: PrivacyProfile): Promise<void> {
    const { error } = await this.supabase.from('users').update({ privacy_profile: value }).eq('id', userId)
    if (error) throw error
  }

  async updatePrivacyRecords(userId: string, value: PrivacyRecords): Promise<void> {
    const { error } = await this.supabase.from('users').update({ privacy_records: value }).eq('id', userId)
    if (error) throw error
  }

  async updateVisibilityPublic(userId: string, config: VisibilityConfig): Promise<void> {
    const { error } = await this.supabase.from('users').update({ visibility_public: config }).eq('id', userId)
    if (error) throw error
  }

  async updateVisibilityBubble(userId: string, config: VisibilityConfig): Promise<void> {
    const { error } = await this.supabase.from('users').update({ visibility_bubble: config }).eq('id', userId)
    if (error) throw error
  }

  // ── 버블별 프라이버시 ──

  async getBubblePrivacyOverrides(userId: string): Promise<BubblePrivacyOverride[]> {
    const { data, error } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, visibility_override, bubble:bubbles(name, avatar_color)')
      .eq('user_id', userId)

    if (error) throw error

    return (data ?? []).map((r) => {
      const bubble = r.bubble as unknown as Record<string, unknown> | null
      return {
        bubbleId: r.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleAvatarColor: (bubble?.avatar_color as string) ?? null,
        useDefault: r.visibility_override === null,
        visibilityOverride: r.visibility_override as VisibilityConfig | null,
      }
    })
  }

  async updateBubbleVisibilityOverride(userId: string, bubbleId: string, override: VisibilityConfig | null): Promise<void> {
    const { error } = await this.supabase
      .from('bubble_members')
      .update({ visibility_override: override })
      .eq('user_id', userId)
      .eq('bubble_id', bubbleId)
    if (error) throw error
  }

  // ── 알림 ──

  async updateNotifySetting(userId: string, field: string, value: boolean): Promise<void> {
    const { error } = await this.supabase.from('users').update({ [field]: value }).eq('id', userId)
    if (error) throw error
  }

  async updateDndTime(userId: string, start: string | null, end: string | null): Promise<void> {
    const { error } = await this.supabase.from('users').update({ dnd_start: start, dnd_end: end }).eq('id', userId)
    if (error) throw error
  }

  // ── 환경설정 ──

  async updatePreference(userId: string, field: string, value: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ [field]: value }).eq('id', userId)
    if (error) throw error
  }

  // ── 계정 삭제 ──

  async requestAccountDeletion(userId: string, mode: DeleteMode): Promise<void> {
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + 30)

    const { error } = await this.supabase.from('users').update({
      deleted_at: new Date().toISOString(),
      delete_mode: mode,
      delete_scheduled_at: scheduledAt.toISOString(),
    }).eq('id', userId)
    if (error) throw error
  }

  async cancelAccountDeletion(userId: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({
      deleted_at: null,
      delete_mode: null,
      delete_scheduled_at: null,
    }).eq('id', userId)
    if (error) throw error
  }

  // ── 데이터 ──

  async exportData(userId: string, format: 'json' | 'csv'): Promise<Blob> {
    const { data: records } = await this.supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)

    const content = format === 'json'
      ? JSON.stringify(records ?? [], null, 2)
      : convertToCsv(records ?? [])

    return new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
  }

  async importData(userId: string, file: File): Promise<void> {
    const text = await file.text()
    const isJson = file.name.endsWith('.json')

    let rows: Record<string, unknown>[]
    if (isJson) {
      rows = JSON.parse(text)
    } else {
      rows = parseCsv(text)
    }

    if (rows.length === 0) return

    for (const row of rows) {
      row.user_id = userId
      delete row.id
      delete row.created_at
      delete row.updated_at
    }

    const { error } = await this.supabase
      .from('records')
      .insert(rows)
    if (error) throw error
  }

  async getCacheSize(): Promise<number> {
    if (typeof window === 'undefined') return 0
    const caches = await window.caches?.keys()
    if (!caches) return 0
    let total = 0
    for (const name of caches) {
      const cache = await window.caches.open(name)
      const keys = await cache.keys()
      total += keys.length * 50_000
    }
    return total
  }

  async clearCache(): Promise<void> {
    if (typeof window === 'undefined') return
    const caches = await window.caches?.keys()
    if (!caches) return
    for (const name of caches) {
      await window.caches.delete(name)
    }
  }
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => {
      const trimmed = v.trim()
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1)
      }
      return trimmed
    })
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

function convertToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  }
  return lines.join('\n')
}
