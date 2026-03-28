// src/domain/services/xp-calculator.ts
// R1: 외부 의존 0

import type { DiningRecord } from '@/domain/entities/record'
import type {
  LevelThreshold, LevelInfo, AxisType, DetailAxisGain,
  SocialAction, DailySocialCounts, Milestone,
} from '@/domain/entities/xp'

// ────────────────────────────────────────────
// 1. 기록 XP 산출
// ────────────────────────────────────────────

/**
 * 기록 품질 기반 XP 산출 (종합 XP에 적립).
 *
 * | 기록 수준         | XP  |
 * |-------------------|-----|
 * | 이름만 등록       |  0  |
 * | + 사분면 점수     | +3  |
 * | + 사진 (EXIF GPS) | +8  |
 * | + 풀 기록         | +18 |
 */
export function calculateRecordXp(record: DiningRecord): number {
  const hasScore = record.satisfaction !== null && record.satisfaction !== undefined
  const hasPhoto = record.hasExifGps === true && record.isExifVerified === true
  const hasFullReview =
    hasScore &&
    hasPhoto &&
    !!record.comment &&
    record.comment.length > 0 &&
    record.menuTags !== null &&
    record.menuTags !== undefined &&
    record.menuTags.length > 0

  if (hasFullReview) return 18
  if (hasPhoto && hasScore) return 8
  if (hasScore) return 3
  return 0
}

/**
 * XP reason 문자열 산출.
 */
export function getRecordXpReason(xp: number): 'record_full' | 'record_photo' | 'record_score' | 'record_name' {
  if (xp === 18) return 'record_full'
  if (xp === 8) return 'record_photo'
  if (xp === 3) return 'record_score'
  return 'record_name'
}

// ────────────────────────────────────────────
// 2. 세부 축 XP 산출
// ────────────────────────────────────────────

/**
 * 기록에서 세부 축 XP 산출 (종합 XP에 미포함).
 * 식당 기록: area(지역) + genre(장르) 각 +5
 * 와인 기록: wine_region(산지) + wine_variety(품종) 각 +5
 */
export function calculateDetailAxisXp(
  record: DiningRecord,
  restaurantArea?: string | null,
  restaurantGenre?: string | null,
  wineRegion?: string | null,
  wineVariety?: string | null,
): DetailAxisGain[] {
  const gains: DetailAxisGain[] = []
  const XP_PER_AXIS = 5

  if (record.targetType === 'restaurant') {
    if (restaurantArea) {
      gains.push({ axisType: 'area', axisValue: restaurantArea, xp: XP_PER_AXIS })
    }
    if (restaurantGenre) {
      gains.push({ axisType: 'genre', axisValue: restaurantGenre, xp: XP_PER_AXIS })
    }
  } else if (record.targetType === 'wine') {
    if (wineRegion) {
      gains.push({ axisType: 'wine_region', axisValue: wineRegion, xp: XP_PER_AXIS })
    }
    if (wineVariety) {
      gains.push({ axisType: 'wine_variety', axisValue: wineVariety, xp: XP_PER_AXIS })
    }
  }

  return gains
}

/**
 * 세부 축 XP → 카테고리 XP 합산 대상 매핑.
 */
export function getCategoryForAxisType(axisType: AxisType): 'restaurant' | 'wine' | null {
  switch (axisType) {
    case 'area':
    case 'genre':
      return 'restaurant'
    case 'wine_region':
    case 'wine_variety':
      return 'wine'
    case 'category':
      return null
    default:
      return null
  }
}

// ────────────────────────────────────────────
// 3. 소셜 XP 산출
// ────────────────────────────────────────────

const SOCIAL_XP_MAP: Record<SocialAction, number> = {
  share: 1,
  like: 1,
  follow: 1,
  mutual: 2,
}

const SOCIAL_DAILY_CAP = 10

/**
 * 소셜 XP 산출 (일일 상한 10 적용).
 * 상한 초과 시 잔여분만 반환, 완전 초과면 0.
 */
export function calculateSocialXp(
  action: SocialAction,
  dailyCounts: DailySocialCounts,
): number {
  const baseXp = SOCIAL_XP_MAP[action]

  if (dailyCounts.total + baseXp > SOCIAL_DAILY_CAP) {
    const remaining = SOCIAL_DAILY_CAP - dailyCounts.total
    return Math.max(0, remaining)
  }

  return baseXp
}

// ────────────────────────────────────────────
// 4. 보너스 XP 테이블
// ────────────────────────────────────────────

export const BONUS_XP_MAP = {
  onboard: 10,
  first_record: 5,
  first_bubble: 5,
  first_share: 3,
} as const

// ────────────────────────────────────────────
// 5. 레벨 산출
// ────────────────────────────────────────────

/**
 * XP → 레벨 정보 산출.
 * level_thresholds 배열은 level ASC 정렬 전제.
 */
export function getLevel(
  totalXp: number,
  thresholds: LevelThreshold[],
): LevelInfo {
  let currentLevel = thresholds[0]

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalXp >= thresholds[i].requiredXp) {
      currentLevel = thresholds[i]
      break
    }
  }

  const nextThreshold = thresholds.find((t) => t.level === currentLevel.level + 1)
  const nextLevelXp = nextThreshold ? nextThreshold.requiredXp : currentLevel.requiredXp
  const xpInCurrentLevel = totalXp - currentLevel.requiredXp
  const xpNeededForNext = nextLevelXp - currentLevel.requiredXp
  const progress = xpNeededForNext > 0 ? Math.min(1, xpInCurrentLevel / xpNeededForNext) : 1

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    color: currentLevel.color,
    currentXp: totalXp,
    nextLevelXp,
    progress,
  }
}

/**
 * 레벨 색상 반환 (레벨 테이블 없이 직접 산출).
 */
export function getLevelColor(level: number): string {
  if (level <= 3) return '#7EAE8B'
  if (level <= 5) return '#7A9BAE'
  if (level <= 7) return '#8B7396'
  if (level <= 9) return '#C17B5E'
  return '#C9A96E'
}

/**
 * 레벨 칭호 반환.
 */
export function getLevelTitle(level: number): string {
  if (level <= 3) return '입문자'
  if (level <= 5) return '초보 미식가'
  if (level <= 7) return '탐식가'
  if (level <= 9) return '미식가'
  return '식도락 마스터'
}

// ────────────────────────────────────────────
// 6. 어뷰징 방지 체크 (순수 함수)
// ────────────────────────────────────────────

const DAILY_RECORD_CAP = 20
const DUPLICATE_RESTAURANT_MONTHS = 6

/**
 * 하루 기록 상한 체크.
 */
export function isDailyRecordCapReached(dailyCount: number): boolean {
  return dailyCount >= DAILY_RECORD_CAP
}

/**
 * 같은 식당 점수 6개월 제한 체크.
 * lastScoreDate가 6개월 이내면 true (차단).
 */
export function isDuplicateScoreBlocked(lastScoreDate: string | null): boolean {
  if (!lastScoreDate) return false
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - DUPLICATE_RESTAURANT_MONTHS)
  return new Date(lastScoreDate) > sixMonthsAgo
}

// ────────────────────────────────────────────
// 7. 마일스톤 체크
// ────────────────────────────────────────────

/**
 * 현재 카운트가 마일스톤 달성 기준을 넘었는지 체크.
 */
export function checkMilestoneReached(
  currentCount: number,
  milestone: Milestone,
): boolean {
  return currentCount >= milestone.threshold
}

// ────────────────────────────────────────────
// 8. 레벨 커브 생성 유틸 (시드 데이터 생성용)
// ────────────────────────────────────────────

const ANCHORS: [number, number][] = [
  [1, 0], [2, 3], [6, 25], [8, 50], [12, 100], [18, 200],
  [30, 500], [62, 3_700], [72, 7_500], [78, 12_000], [81, 16_000],
  [85, 25_000], [92, 50_000], [99, 100_000],
]

export function generateLevelThresholds(): LevelThreshold[] {
  const thresholds: LevelThreshold[] = []

  for (let lv = 1; lv <= 99; lv++) {
    let xp = 0
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const [lvA, xpA] = ANCHORS[i]
      const [lvB, xpB] = ANCHORS[i + 1]
      if (lv >= lvA && lv <= lvB) {
        const ratio = (lv - lvA) / (lvB - lvA)
        xp = Math.round(xpA + ratio * (xpB - xpA))
        break
      }
    }

    thresholds.push({
      level: lv,
      requiredXp: xp,
      title: getLevelTitle(lv),
      color: getLevelColor(lv),
    })
  }

  return thresholds
}

// ────────────────────────────────────────────
// 9. 상수 export
// ────────────────────────────────────────────

export const XP_CONSTANTS = {
  RECORD_NAME: 0,
  RECORD_SCORE: 3,
  RECORD_PHOTO: 8,
  RECORD_FULL: 18,
  DETAIL_AXIS: 5,
  SOCIAL_SHARE: 1,
  SOCIAL_LIKE: 1,
  SOCIAL_FOLLOW: 1,
  SOCIAL_MUTUAL: 2,
  SOCIAL_DAILY_CAP: 10,
  DAILY_RECORD_CAP: 20,
  DUPLICATE_MONTHS: 6,
} as const
