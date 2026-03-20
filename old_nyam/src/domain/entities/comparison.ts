export interface ComparisonMatchup {
  id: string
  comparisonId: string
  record1Id: string
  record2Id: string
  winnerId: string | null
  round: number
}

export interface Comparison {
  id: string
  userId: string
  recordType: string
  status: "in_progress" | "completed"
  matchups: ComparisonMatchup[]
  winnerId: string | null
  createdAt: string
  completedAt: string | null
}
