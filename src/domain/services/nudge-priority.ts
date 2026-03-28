// src/domain/services/nudge-priority.ts
// R1: 외부 의존 0

import type { NudgeType, Nudge, NudgeFatigue, NudgeDisplay } from '@/domain/entities/nudge'

/** 넛지 후보 — 생성 조건을 통과한 항목 */
export interface NudgeCandidate {
  type: NudgeType
  priority: number
  data: {
    targetId: string | null
    icon: string
    title: string
    subtitle: string
    actionLabel: string
    actionHref: string
  }
}

/**
 * Phase 1 우선순위: photo(1) > unrated(2) > time(3)
 * 낮을수록 우선
 */
const PRIORITY_MAP: Partial<Record<NudgeType, number>> = {
  photo: 1,
  unrated: 2,
  time: 3,
}

/**
 * 넛지 우선순위 결정 서비스
 *
 * 조건:
 * - fatigue.pausedUntil이 현재보다 미래면 null 반환
 * - fatigue.score >= 10이면 null 반환
 * - 같은 타입 넛지는 24시간 이내 재표시 안 함
 */
export function selectTopNudge(
  candidates: NudgeCandidate[],
  fatigue: NudgeFatigue | null,
  recentHistory: Nudge[],
): NudgeDisplay | null {
  if (candidates.length === 0) return null

  // fatigue 차단: pausedUntil이 현재보다 미래
  if (fatigue) {
    if (fatigue.pausedUntil && new Date(fatigue.pausedUntil) > new Date()) {
      return null
    }
    if (fatigue.score >= 10) {
      return null
    }
  }

  // 24시간 이내 표시된 타입 집합
  const now = Date.now()
  const recentTypes = new Set<NudgeType>()
  for (const h of recentHistory) {
    const elapsed = now - new Date(h.createdAt).getTime()
    if (elapsed < 24 * 60 * 60 * 1000) {
      recentTypes.add(h.nudgeType)
    }
  }

  // 24시간 중복 제거 + 우선순위 정렬
  const filtered = candidates
    .filter((c) => !recentTypes.has(c.type))
    .sort((a, b) => {
      const pa = PRIORITY_MAP[a.type] ?? 99
      const pb = PRIORITY_MAP[b.type] ?? 99
      return pa - pb
    })

  if (filtered.length === 0) return null

  const top = filtered[0]
  return {
    type: top.type,
    icon: top.data.icon,
    title: top.data.title,
    subtitle: top.data.subtitle,
    actionLabel: top.data.actionLabel,
    actionHref: top.data.actionHref,
    targetId: top.data.targetId,
  }
}
