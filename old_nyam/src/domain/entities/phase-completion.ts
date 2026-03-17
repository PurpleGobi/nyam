export interface PhaseCompletion {
  id: string
  userId: string
  recordId: string | null
  phase: 1 | 2 | 3
  xpEarned: number
  completedAt: string
}

export const PHASE_XP = {
  1: 5,
  2: 15,
  3: 5,
} as const
