"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/infrastructure/supabase/client"
import type { User as AuthUser } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signInWithProvider = useCallback(
    async (provider: "google" | "kakao" | "apple") => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    },
    [supabase],
  )

  const signInWithNaver = useCallback(async () => {
    // Naver uses custom OAuth flow through Supabase
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao", // placeholder - Naver requires custom OIDC setup
      options: {
        redirectTo: `${window.location.origin}/auth/naver/callback`,
      },
    })
    if (error) throw error
  }, [supabase])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase])

  return {
    user,
    loading,
    signInWithProvider,
    signInWithNaver,
    signOut,
    isAuthenticated: !!user,
  }
}
