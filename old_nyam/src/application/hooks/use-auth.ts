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

  const signInWithNaver = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
    if (!clientId) throw new Error("Naver Client ID not configured")
    const state = crypto.randomUUID()
    sessionStorage.setItem("naver_oauth_state", state)
    const redirectUri = `${window.location.origin}/auth/naver/callback`
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    })
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?${params}`
  }, [])

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
