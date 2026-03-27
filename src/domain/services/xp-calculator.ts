// src/domain/services/xp-calculator.ts
// R1: 외부 의존 0

import type { DiningRecord } from '@/domain/entities/record'
import type { LevelThreshold, LevelInfo } from '@/domain/entities/xp'

/**
 * 기록 품질 XP 계산
 * XP_SYSTEM.md §4-1 기록 품질 XP
 * - checked (이름만): 0 XP (XP 없음)
 * - rated (점수만): +3 XP
 * - rated + 사진: +8 XP
 * - rated + 사진 + 코멘트 (풀 기록): +18 XP
 */
export function calculateRecordXp(record: DiningRecord, hasPhotos: boolean): number {
  if (record.status === 'checked') return 0
  if (record.status !== 'rated') return 0

  const hasScore = record.satisfaction !== null
  const hasComment = record.comment !== null && record.comment.length > 0

  if (hasScore && hasPhotos && hasComment) return 18
  if (hasScore && hasPhotos) return 8
  if (hasScore) return 3
  return 0
}

/**
 * 총 XP → 레벨 계산
 */
export function getLevel(totalXp: number, thresholds: LevelThreshold[]): LevelInfo {
  const sorted = [...thresholds].sort((a, b) => b.level - a.level)
  const current = sorted.find((t) => totalXp >= t.requiredXp) ?? sorted[sorted.length - 1]
  const next = sorted.find((t) => t.level === current.level + 1)

  const currentXp = totalXp - current.requiredXp
  const nextLevelXp = next ? next.requiredXp - current.requiredXp : 1
  const progress = Math.min(1, currentXp / nextLevelXp)

  return {
    level: current.level,
    title: current.title ?? '입문자',
    color: current.color ?? '#7EAE8B',
    currentXp,
    nextLevelXp,
    progress,
  }
}

/**
 * 레벨 → 색상 (5단계)
 */
export function getLevelColor(level: number): string {
  if (level <= 3) return '#7EAE8B'
  if (level <= 5) return '#7A9BAE'
  if (level <= 7) return '#8B7396'
  if (level <= 9) return '#C17B5E'
  return '#C9A96E'
}

/**
 * 일일 기록 캡 체크 (어뷰징 방지, 20개)
 */
export function isDailyRecordCapReached(todayRecordCount: number): boolean {
  return todayRecordCount >= 20
}

/**
 * 중복 점수 차단 (같은 대상 6개월 이내)
 */
export function isDuplicateScoreBlocked(lastScoreDate: string | null): boolean {
  if (!lastScoreDate) return false
  const sixMonths = 180 * 24 * 60 * 60 * 1000
  return Date.now() - new Date(lastScoreDate).getTime() < sixMonths
}
