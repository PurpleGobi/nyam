// src/domain/repositories/nudge-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { NudgeDisplay } from '@/domain/entities/nudge'

export interface NudgeFatigue {
  userId: string
  dismissCount: number
  lastDismissedAt: string | null
}

/**
 * Nudge Repository 인터페이스
 * infrastructure/repositories/supabase-nudge-repository.ts에서 구현
 */
export interface NudgeRepository {
  /** 사용자에게 표시할 활성 넛지 목록 조회 */
  getActiveNudge(userId: string): Promise<NudgeDisplay[]>

  /** 넛지 액션 수행 처리 */
  markAsActed(nudgeId: string): Promise<void>

  /** 넛지 닫기 처리 */
  dismiss(nudgeId: string): Promise<void>

  /** 사용자 넛지 피로도 조회 */
  getFatigue(userId: string): Promise<NudgeFatigue | null>
}
