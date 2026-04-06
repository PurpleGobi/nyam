'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/shared/di/container'
import { mapSupabaseUser, mapSupabaseSession } from '@/shared/di/auth-mappers'
import type { AuthUser, AuthSession } from '@/domain/entities/auth'

interface UseAuthSubscriptionReturn {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  signOut: () => Promise<void>
}

/**
 * Supabase auth 구독 로직을 application 레이어에서 관리하는 hook.
 * 초기 세션 로드 + onAuthStateChange 구독 + signOut 기능 제공.
 */
export function useAuthSubscription(): UseAuthSubscriptionReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const clientRef = useRef(getSupabaseClient())

  useEffect(() => {
    const client = clientRef.current

    const getInitialSession = async () => {
      const { data: { user: verifiedUser } } = await client.auth.getUser()
      if (verifiedUser) {
        const { data: { session: currentSession } } = await client.auth.getSession()
        if (currentSession) {
          setSession(mapSupabaseSession(currentSession))
          setUser(mapSupabaseUser(verifiedUser))
        }
      }
      setIsLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession) {
          setSession(mapSupabaseSession(newSession))
          setUser(mapSupabaseUser(newSession.user))
        } else {
          setSession(null)
          setUser(null)
        }
        setIsLoading(false)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await clientRef.current.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  return { user, session, isLoading, signOut: handleSignOut }
}
