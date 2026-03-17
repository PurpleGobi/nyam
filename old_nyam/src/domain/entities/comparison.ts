export type ComparisonStatus = 'in_progress' | 'completed' | 'abandoned'
export type ComparisonAspect = 'taste' | 'atmosphere' | 'value' | 'revisit' | 'overall'

export interface Comparison {
  id: string
  userId: string
  category: string
  bracketSize: 4 | 8 | 16
  status: ComparisonStatus
  winnerRecordId: string | null
  createdAt: string
  completedAt: string | null
}

export interface ComparisonMatchup {
  id: string
  comparisonId: string
  round: number
  aspect: ComparisonAspect
  recordAId: string
  recordBId: string
  winnerId: string | null
  createdAt: string
}
