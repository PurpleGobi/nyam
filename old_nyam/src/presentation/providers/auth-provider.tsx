"use client"

import { createContext, useContext } from "react"
import { useAuth } from "@/application/hooks/use-auth"
import type { User as AuthUser } from "@supabase/supabase-js"

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  signInWithProvider: (provider: "google" | "kakao" | "apple") => Promise<void>
  signInWithNaver: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}
