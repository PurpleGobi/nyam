export type ChallengeType = 'category' | 'region' | 'frequency' | 'variety'

export interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  target: number
  icon: string
}

export interface ChallengeProgress {
  challengeId: string
  current: number
  target: number
  completed: boolean
}

export interface ChallengeWithProgress extends Challenge {
  progress: ChallengeProgress
}
