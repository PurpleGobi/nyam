/**
 * Derives a gamified TasteStyleProfile from a UserPreferenceSummary.
 */

import type { UserPreferenceSummary } from '@/domain/entities/interaction'
import type {
  FoodPersona,
  FoodPersonaType,
  TasteStyleLevel,
  TasteStyleProfile,
} from '@/domain/entities/taste-style'

// ── Persona definitions ──────────────────────────────────────

const PERSONAS: Record<FoodPersonaType, FoodPersona> = {
  adventurer: {
    type: 'adventurer',
    title: '미식 모험가',
    subtitle: '새로운 맛을 찾아 떠나는 탐험가',
    emoji: '\u{1F30D}',
  },
  loyalist: {
    type: 'loyalist',
    title: '단골 미식가',
    subtitle: '확실한 맛집을 고집하는 감별사',
    emoji: '\u{1F451}',
  },
  trendsetter: {
    type: 'trendsetter',
    title: '트렌드 세터',
    subtitle: '핫플을 가장 먼저 발견하는 선구자',
    emoji: '\u{1F525}',
  },
  socialite: {
    type: 'socialite',
    title: '소셜 미식가',
    subtitle: '함께 먹으면 더 맛있는 걸 아는 사람',
    emoji: '\u{1F37B}',
  },
  'solo-gourmet': {
    type: 'solo-gourmet',
    title: '솔로 그루메',
    subtitle: '혼자만의 미식 세계를 즐기는 감정가',
    emoji: '\u{1F374}',
  },
  newcomer: {
    type: 'newcomer',
    title: '미식 입문자',
    subtitle: '나만의 맛집 스타일을 만들어가는 중',
    emoji: '\u{1F331}',
  },
}

// ── Level system ─────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 10, 30, 60, 100, 150, 220, 300, 400, 500]
const LEVEL_TITLES = [
  '맛집 새내기',
  '동네 탐험가',
  '미식 견습생',
  '맛 감별사',
  '미식 전문가',
  '맛집 사냥꾼',
  '그루메 마스터',
  '미식 현자',
  '레전드 미식가',
  '미식의 신',
]

function computeLevel(totalInteractions: number): TasteStyleLevel {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalInteractions >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 100

  return {
    level,
    title: LEVEL_TITLES[level - 1] ?? LEVEL_TITLES[LEVEL_TITLES.length - 1],
    currentXp: totalInteractions - currentThreshold,
    nextLevelXp: nextThreshold - currentThreshold,
  }
}

// ── Persona classification ───────────────────────────────────

function classifyPersona(summary: UserPreferenceSummary): FoodPersonaType {
  if (summary.totalInteractions < 5) return 'newcomer'

  const cuisineCount = summary.topCuisines.length
  const regionCount = summary.topRegions.length
  const searchCount = summary.searchKeywords.length

  // Check if situation-focused
  const hasSocialSituations = summary.topSituations.some(s =>
    ['데이트', '가족 모임', '친구 모임', '비즈니스'].some(k => s.label.includes(k)),
  )
  const hasSoloSituation = summary.topSituations.some(s => s.label.includes('혼밥'))

  if (hasSoloSituation && !hasSocialSituations) return 'solo-gourmet'
  if (hasSocialSituations && summary.topSituations.length >= 2) return 'socialite'
  if (searchCount >= 3) return 'trendsetter'
  if (cuisineCount >= 4 && regionCount >= 3) return 'adventurer'

  return 'loyalist'
}

// ── Stats computation ────────────────────────────────────────

function computeStats(summary: UserPreferenceSummary) {
  const cuisineCount = summary.topCuisines.length
  const regionCount = summary.topRegions.length
  const total = summary.totalInteractions

  // Check concentration: if top item has >60% of counts, high consistency
  const topCuisineRatio = summary.topCuisines.length > 0
    ? summary.topCuisines[0].count / Math.max(total, 1)
    : 0

  return {
    diversity: Math.min(100, cuisineCount * 20),
    exploration: Math.min(100, regionCount * 20),
    consistency: Math.min(100, Math.round(topCuisineRatio * 200)),
    engagement: Math.min(100, Math.round((total / 100) * 100)),
  }
}

// ── Main resolver ────────────────────────────────────────────

export function buildTasteStyleProfile(summary: UserPreferenceSummary): TasteStyleProfile {
  const personaType = classifyPersona(summary)

  return {
    persona: PERSONAS[personaType],
    level: computeLevel(summary.totalInteractions),
    topCuisines: summary.topCuisines.map(c => c.label),
    topRegions: summary.topRegions.map(r => r.label),
    topSituations: summary.topSituations.map(s => s.label),
    stats: computeStats(summary),
    totalInteractions: summary.totalInteractions,
  }
}
