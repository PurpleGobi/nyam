'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createAuthClient } from '@/di/repositories'

type OAuthProvider = 'kakao' | 'google' | 'apple' | 'naver'
type SupabaseProvider = Exclude<OAuthProvider, 'naver'>

interface UseAuthReturn {
  readonly user: User | null
  readonly session: Session | null
  readonly isLoading: boolean
  readonly signIn: (provider: OAuthProvider) => Promise<void>
  readonly signOut: () => Promise<void>
}

/**
 * Hook for Supabase Auth state management.
 * Listens to auth state changes and provides sign-in/sign-out methods.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createAuthClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        setSession(updatedSession)
        setUser(updatedSession?.user ?? null)
        setIsLoading(false)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (provider: OAuthProvider) => {
    if (provider === 'naver') {
      // Naver is not a built-in Supabase provider, use manual OAuth flow
      const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
      const redirectUri = encodeURIComponent(`${window.location.origin}/auth/naver/callback`)
      const state = crypto.randomUUID()
      sessionStorage.setItem('naver_oauth_state', state)
      window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
      return
    }

    const supabase = createAuthClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as SupabaseProvider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createAuthClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }, [])

  return { user, session, isLoading, signIn, signOut }
}
