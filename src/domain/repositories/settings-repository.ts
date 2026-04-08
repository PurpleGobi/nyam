// src/domain/repositories/settings-repository.ts
// R1: 외부 의존 0

import type { UserSettings, VisibilityConfig, FollowPolicy, BubblePrivacyOverride, DeleteMode } from '@/domain/entities/settings'

export interface SettingsRepository {
  getUserSettings(userId: string): Promise<UserSettings>

  // 계정
  updateNickname(userId: string, nickname: string): Promise<void>
  updateBio(userId: string, bio: string): Promise<void>
  updateAvatar(userId: string, avatarUrl: string): Promise<void>

  // 프라이버시
  updateIsPublic(userId: string, value: boolean): Promise<void>
  updateFollowPolicy(userId: string, value: FollowPolicy): Promise<void>
  updateFollowConditions(userId: string, minRecords: number | null, minLevel: number | null): Promise<void>
  updateVisibilityPublic(userId: string, config: VisibilityConfig): Promise<void>
  updateVisibilityBubble(userId: string, config: VisibilityConfig): Promise<void>

  // 버블별 프라이버시
  getBubblePrivacyOverrides(userId: string): Promise<BubblePrivacyOverride[]>
  updateBubbleVisibilityOverride(userId: string, bubbleId: string, override: VisibilityConfig | null): Promise<void>

  // 알림
  updateNotifySetting(userId: string, field: string, value: boolean): Promise<void>
  updateDndTime(userId: string, start: string | null, end: string | null): Promise<void>

  // 화면/기능 디폴트
  updatePreference(userId: string, field: string, value: string): Promise<void>

  // 계정 삭제
  requestAccountDeletion(userId: string, mode: DeleteMode): Promise<void>
  cancelAccountDeletion(userId: string): Promise<void>

  // 데이터
  exportData(userId: string, format: 'json' | 'csv'): Promise<Blob>
  importData(userId: string, file: File): Promise<void>
  generateImportTemplate(): Promise<Blob>
  getCacheSize(): Promise<number>
  clearCache(): Promise<void>
}
