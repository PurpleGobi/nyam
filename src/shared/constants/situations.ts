/**
 * Situation presets for context-aware restaurant recommendations.
 * Keywords are auto-inserted into AI prompts when a situation is selected.
 * Labels adapt to time of day via getMealLabel().
 */

export interface SituationPreset {
  id: string;
  /** Static label (used when no time-based variant applies) */
  label: string;
  /** Time-aware label template: {meal} is replaced by getMealLabel() */
  labelTemplate?: string;
  icon: string;
  keywords: readonly string[];
}

/** Returns a meal-period word based on current hour. */
export function getMealLabel(): string {
  const hour = new Date().getHours()
  if (hour < 11) return '아침'
  if (hour < 14) return '점심'
  if (hour < 17) return '오후'
  if (hour < 21) return '저녁'
  return '야식'
}

/** Resolve a preset label, replacing {meal} with current meal period. */
export function resolvePresetLabel(preset: SituationPreset): string {
  if (preset.labelTemplate) {
    return preset.labelTemplate.replace('{meal}', getMealLabel())
  }
  return preset.label
}

export const SITUATION_PRESETS: readonly SituationPreset[] = [
  {
    id: "business-meal",
    label: "비즈니스 식사",
    labelTemplate: "비즈니스 {meal}",
    icon: "briefcase",
    keywords: ["조용함", "코스 가능", "빠른 서빙"],
  },
  {
    id: "date",
    label: "데이트",
    icon: "heart",
    keywords: ["분위기", "사진 잘 나오는", "예약 가능"],
  },
  {
    id: "solo-dining",
    label: "혼밥",
    icon: "user",
    keywords: ["카운터석", "부담 없는", "1인 메뉴"],
  },
  {
    id: "family-gathering",
    label: "가족 모임",
    icon: "home",
    keywords: ["넓은 공간", "다양한 메뉴", "주차"],
  },
  {
    id: "friends-gathering",
    label: "친구 모임",
    icon: "users",
    keywords: ["시끌벅적 OK", "공유 메뉴", "술 가능"],
  },
] as const;
