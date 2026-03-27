// src/domain/repositories/settings-repository.ts
// R1: 외부 의존 0

import type { UserSettings, VisibilityConfig } from '@/domain/entities/settings'

export interface BubbleOverride {
  bubbleId: string
  bubbleName: string
  visibilityConfig: VisibilityConfig
}

export interface SettingsRepository {
  getSettings(userId: string): Promise<UserSettings>
  updateSetting(userId: string, field: string, value: unknown): Promise<void>
  getVisibilityConfig(userId: string): Promise<{ public: VisibilityConfig; bubble: VisibilityConfig }>
  updateVisibilityConfig(userId: string, scope: 'public' | 'bubble', config: VisibilityConfig): Promise<void>
  getBubbleOverrides(userId: string): Promise<BubbleOverride[]>
}
