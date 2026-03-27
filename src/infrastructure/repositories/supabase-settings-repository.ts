import { createClient } from '@/infrastructure/supabase/client'
import type { SettingsRepository, BubbleOverride } from '@/domain/repositories/settings-repository'
import type { UserSettings, VisibilityConfig } from '@/domain/entities/settings'

export class SupabaseSettingsRepository implements SettingsRepository {
  private get supabase() {
    return createClient()
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('users')
      .select('nickname, bio, avatar_url, privacy_profile, privacy_records, visibility_public, visibility_bubble, notify_push, notify_level_up, notify_bubble_join, notify_follow, dnd_start, dnd_end, pref_landing, pref_home_tab, pref_default_sort, pref_record_input, pref_bubble_share, pref_temp_unit, pref_view_mode')
      .eq('id', userId)
      .single()

    if (error) throw new Error(`Settings 조회 실패: ${error.message}`)

    return {
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
    }
  }

  async updateSetting(userId: string, field: string, value: unknown): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ [field]: value })
      .eq('id', userId)

    if (error) throw new Error(`Setting 업데이트 실패: ${error.message}`)
  }

  async getVisibilityConfig(userId: string): Promise<{ public: VisibilityConfig; bubble: VisibilityConfig }> {
    const { data, error } = await this.supabase
      .from('users')
      .select('visibility_public, visibility_bubble')
      .eq('id', userId)
      .single()

    if (error) throw new Error(`VisibilityConfig 조회 실패: ${error.message}`)

    return {
      public: data.visibility_public as VisibilityConfig,
      bubble: data.visibility_bubble as VisibilityConfig,
    }
  }

  async updateVisibilityConfig(userId: string, scope: 'public' | 'bubble', config: VisibilityConfig): Promise<void> {
    const field = scope === 'public' ? 'visibility_public' : 'visibility_bubble'
    const { error } = await this.supabase
      .from('users')
      .update({ [field]: config })
      .eq('id', userId)

    if (error) throw new Error(`VisibilityConfig 업데이트 실패: ${error.message}`)
  }

  async getBubbleOverrides(userId: string): Promise<BubbleOverride[]> {
    const { data, error } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, visibility_override, bubble:bubbles(name)')
      .eq('user_id', userId)
      .not('visibility_override', 'is', null)

    if (error) throw new Error(`BubbleOverrides 조회 실패: ${error.message}`)

    return (data ?? []).map((r) => ({
      bubbleId: r.bubble_id as string,
      bubbleName: (r.bubble as unknown as Record<string, unknown>)?.name as string ?? '',
      visibilityConfig: r.visibility_override as unknown as VisibilityConfig,
    }))
  }
}
