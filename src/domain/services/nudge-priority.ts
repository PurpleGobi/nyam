// src/domain/services/nudge-priority.ts
// R1: 외부 의존 0

import type { NudgeDisplay } from '@/domain/entities/nudge'

const PRIORITY_MAP: Record<string, number> = {
  unrated: 1,
  photo: 2,
  meal_time: 3,
  bubble_invite: 4,
  weekly: 5,
}

/**
 * 넛지 목록 중 가장 높은 우선순위(숫자가 낮을수록 우선)를 선택
 * unrated(1) > photo(2) > meal_time(3) > bubble_invite(4) > weekly(5)
 */
export function selectTopNudge(nudges: NudgeDisplay[]): NudgeDisplay | null {
  if (nudges.length === 0) return null

  let top: NudgeDisplay = nudges[0]
  let topPriority = PRIORITY_MAP[top.type] ?? 99

  for (let i = 1; i < nudges.length; i++) {
    const priority = PRIORITY_MAP[nudges[i].type] ?? 99
    if (priority < topPriority) {
      top = nudges[i]
      topPriority = priority
    }
  }

  return top
}
