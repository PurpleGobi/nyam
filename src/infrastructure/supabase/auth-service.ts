import { createClient } from './client'
import type { AuthProvider } from '@/domain/entities/auth'

export async function signInWithProvider(provider: AuthProvider, redirectTo: string) {
  const client = createClient()
  const options: Record<string, unknown> = { redirectTo }

  if (provider === 'google') {
    options.queryParams = {
      access_type: 'offline',
      prompt: 'consent',
    }
  }

  return client.auth.signInWithOAuth({
    provider: provider as never, // infrastructure 레이어에서만 허용 — Supabase SDK에 'naver'/'kakao' 타입 없음
    options,
  })
}

export async function signOutUser() {
  const client = createClient()
  return client.auth.signOut()
}
