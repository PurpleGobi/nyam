// src/domain/entities/nudge.ts
// R1: 외부 의존 0

/**
 * DATA_MODEL.md §5 nudge_history.nudge_type
 * Phase 1: photo, unrated, time 만 활성 사용
 */
export type NudgeType = 'location' | 'time' | 'photo' | 'unrated' | 'new_area' | 'weekly'

/** nudge_history.status */
export type NudgeStatus = 'sent' | 'opened' | 'acted' | 'dismissed' | 'skipped'

/** nudge_history 테이블 1:1 매핑 */
export interface Nudge {
  id: string
  userId: string
  nudgeType: NudgeType
  targetId: string | null
  status: NudgeStatus
  createdAt: string
}

/**
 * nudge_fatigue 테이블 1:1 매핑
 * score >= 10이면 넛지 억제
 * pausedUntil이 현재보다 미래면 넛지 중지
 */
export interface NudgeFatigue {
  userId: string
  score: number
  lastNudgeAt: string | null
  pausedUntil: string | null
}

/** 화면에 표시할 넛지 정보 (priority service 출력) */
export interface NudgeDisplay {
  type: NudgeType
  icon: string
  title: string
  subtitle: string
  actionLabel: string
  actionHref: string
  targetId: string | null
}
