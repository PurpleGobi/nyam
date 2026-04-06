// src/domain/entities/calendar.ts
// R1: 외부 의존 0 — React, Supabase, Next.js import 금지

export interface CalendarDayData {
  date: string
  photoUrl: string | null
  topScore: number | null
  recordCount: number
}
