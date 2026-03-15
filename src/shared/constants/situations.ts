/**
 * Situation presets for context-aware restaurant recommendations.
 * Keywords are auto-inserted into AI prompts when a situation is selected.
 */

export interface SituationPreset {
  id: string;
  label: string;
  icon: string;
  keywords: readonly string[];
}

export const SITUATION_PRESETS: readonly SituationPreset[] = [
  {
    id: "business-lunch",
    label: "비즈니스 점심",
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
