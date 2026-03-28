'use client'

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { getSupabaseClient } from '@/shared/di/container'
import { mapSupabaseUser, mapSupabaseSession } from '@/shared/di/auth-mappers'
import type { AuthUser, AuthSession } from '@/domain/entities/auth'

interface AuthContextValue {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const handleSignOut = async () => {
    await clientRef.current.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
