// src/domain/entities/nudge.ts
// R1: 외부 의존 0

export type NudgeType = 'location' | 'time' | 'photo' | 'unrated' | 'new_area' | 'weekly'

export interface NudgeDisplay {
  type: NudgeType
  icon: string
  title: string
  subtitle: string
  actionLabel: string
  actionHref: string
}
