'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useAuthSubscription } from '@/application/hooks/use-auth-subscription'
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
  const authState = useAuthSubscription()

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
