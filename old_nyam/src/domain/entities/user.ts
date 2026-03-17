export interface User {
  id: string
  nickname: string
  avatarUrl: string | null
  email: string
  authProvider: 'kakao' | 'naver' | 'google' | 'apple'
  createdAt: string
  lastActiveAt: string
}

export interface UserStats {
  userId: string
  totalRecords: number
  totalPhotos: number
  recordsThisWeek: number
  recordsThisMonth: number
  avgWeeklyFrequency: number
  currentStreakDays: number
  longestStreakDays: number
  avgCompleteness: number
  nyamLevel: number
  points: number
  groupsCount: number
  sharedRecordsCount: number
  reactionsReceived: number
}
