'use client'

import { useState, useEffect } from 'react'
import type { User } from '@/domain/entities/user'
import { getSupabaseClient } from '@/shared/di/container'

export function useProfile(userId: string | null) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseClient()
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setUser(data as unknown as User)
        setIsLoading(false)
      })
  }, [userId])

  return { user, isLoading }
}
