export type AuthProvider = 'google' | 'kakao' | 'naver' | 'apple'

export interface AuthUser {
  id: string
  email: string | null
  nickname: string
  avatarUrl: string | null
  authProvider: AuthProvider
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt: number | null
}
