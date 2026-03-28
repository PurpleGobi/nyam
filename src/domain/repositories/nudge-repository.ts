// src/domain/repositories/nudge-repository.ts
// R1: domain 인터페이스 — 외부 의존 0

import type { Nudge, NudgeFatigue } from '@/domain/entities/nudge'

/**
 * Nudge Repository 인터페이스
 * infrastructure/repositories/supabase-nudge-repository.ts에서 구현
 */
export interface NudgeRepository {
  /** 최근 N시간 이내 넛지 이력 조회 (24h 중복 방지용) */
  getRecentHistory(userId: string, hours: number): Promise<Nudge[]>

  /** 사용자 넛지 피로도 조회 */
  getFatigue(userId: string): Promise<NudgeFatigue | null>

  /** 넛지 생성 (nudge_history 삽입) */
  createNudge(nudge: Omit<Nudge, 'id' | 'createdAt'>): Promise<void>

  /** 넛지 상태 업데이트 */
  updateStatus(id: string, status: Nudge['status']): Promise<void>

  /** 사용자 피로도 증가 (score + 1) */
  incrementFatigue(userId: string): Promise<void>
}
