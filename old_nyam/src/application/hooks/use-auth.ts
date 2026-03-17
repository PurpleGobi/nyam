'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/infrastructure/supabase/client'

type OAuthProvider = 'kakao' | 'google' | 'naver'
type SupabaseProvider = Exclude<OAuthProvider, 'naver'>

export interface UseAuthReturn {
  readonly user: User | null
  readonly session: Session | null
  readonly isLoading: boolean
  readonly signIn: (provider: OAuthProvider) => Promise<void>
  readonly signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial)
      setUser(initial?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, updated) => {
        setSession(updated)
        setUser(updated?.user ?? null)
        setIsLoading(false)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (provider: OAuthProvider) => {
    if (provider === 'naver') {
      const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
      const redirectUri = encodeURIComponent(
        `${window.location.origin}/auth/naver/callback`
      )
      const state = crypto.randomUUID()
      sessionStorage.setItem('naver_oauth_state', state)
      window.location.href =
        `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as SupabaseProvider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return useMemo(
    () => ({ user, session, isLoading, signIn, signOut }),
    [user, session, isLoading, signIn, signOut],
  )
}
