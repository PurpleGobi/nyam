import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'
import type { AuthUser, AuthSession, AuthProvider } from '@/domain/entities/auth'

export function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    nickname: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '사용자',
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    authProvider: (user.app_metadata?.provider ?? 'google') as AuthProvider,
  }
}

export function mapSupabaseSession(session: SupabaseSession): AuthSession {
  return {
    user: mapSupabaseUser(session.user),
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  }
}
