import { signInWithProvider, signOutUser } from '@/shared/di/container'
import type { AuthProvider } from '@/domain/entities/auth'

export function useAuthActions() {
  const signInWithOAuth = async (provider: AuthProvider, nextPath?: string) => {
    const next = nextPath ?? '/'
    sessionStorage.setItem('auth_redirect_next', next)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await signInWithProvider(provider, redirectTo)
    if (error) throw error
  }

  const signOut = async () => {
    await signOutUser()
  }

  return { signInWithOAuth, signOut }
}
