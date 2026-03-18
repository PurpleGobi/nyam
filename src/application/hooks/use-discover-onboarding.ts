"use client"

import { useCallback, useState } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import { useAuth } from "@/application/hooks/use-auth"

export interface OnboardingSelections {
  genres: string[]
  areas: string[]
  scenes: string[]
}

interface DiscoverPreferences {
  onboardingCompleted: boolean
  seedGenres: string[]
  seedAreas: string[]
  seedScenes: string[]
}

interface UseDiscoverOnboardingReturn {
  /** null = loading, true = show onboarding, false = skip */
  needsOnboarding: boolean | null
  /** User's record count (for cold start weight decisions) */
  recordCount: number | null
  /** Seed data from existing records (for users with records but first discover visit) */
  seedFromRecords: OnboardingSelections | null
  /** Save onboarding selections and mark as completed */
  completeOnboarding: (selections: OnboardingSelections) => Promise<void>
  /** Skip onboarding */
  skipOnboarding: () => Promise<void>
  /** Whether save is in progress */
  isSaving: boolean
}

export function useDiscoverOnboarding(): UseDiscoverOnboardingReturn {
  const { user } = useAuth()
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)

  // Fetch preferences + record count in parallel
  const { data: prefs } = useSWR<DiscoverPreferences | null>(
    user ? `discover-prefs-${user.id}` : null,
    async () => {
      if (!user) return null
      const { data } = await supabase
        .from("discover_preferences")
        .select("onboarding_completed, seed_genres, seed_areas, seed_scenes")
        .eq("user_id", user.id)
        .maybeSingle()

      if (!data) return null
      return {
        onboardingCompleted: data.onboarding_completed as boolean,
        seedGenres: (data.seed_genres as string[]) ?? [],
        seedAreas: (data.seed_areas as string[]) ?? [],
        seedScenes: (data.seed_scenes as string[]) ?? [],
      }
    },
    { revalidateOnFocus: false },
  )

  const { data: recordCount } = useSWR<number>(
    user ? `discover-record-count-${user.id}` : null,
    async () => {
      if (!user) return 0
      const { count } = await supabase
        .from("records")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("record_type", "restaurant")
      return count ?? 0
    },
    { revalidateOnFocus: false },
  )

  // For users with records: extract seed data from style DNA
  const { data: seedFromRecords } = useSWR<OnboardingSelections | null>(
    user && recordCount != null && recordCount > 0 ? `discover-seed-${user.id}` : null,
    async () => {
      if (!user) return null
      const [genresResult, areasResult, scenesResult] = await Promise.all([
        supabase
          .from("style_dna_restaurant_genres")
          .select("genre")
          .eq("user_id", user.id)
          .order("record_count", { ascending: false })
          .limit(3),
        supabase
          .from("style_dna_restaurant_areas")
          .select("area")
          .eq("user_id", user.id)
          .order("record_count", { ascending: false })
          .limit(3),
        supabase
          .from("style_dna_restaurant_scenes")
          .select("scene")
          .eq("user_id", user.id)
          .order("record_count", { ascending: false })
          .limit(3),
      ])

      const genres = (genresResult.data ?? []).map((d) => d.genre as string)
      const areas = (areasResult.data ?? []).map((d) => d.area as string)
      const scenes = (scenesResult.data ?? []).map((d) => d.scene as string)

      if (genres.length === 0 && areas.length === 0 && scenes.length === 0) return null
      return { genres, areas, scenes }
    },
    { revalidateOnFocus: false },
  )

  // Determine if onboarding is needed
  const needsOnboarding = (() => {
    if (!user) return null
    if (prefs === undefined || recordCount === undefined) return null // still loading
    if (prefs?.onboardingCompleted) return false
    if (recordCount != null && recordCount > 0) return false // has records, skip onboarding
    return true // 0 records, never completed onboarding
  })()

  const savePreferences = useCallback(async (
    selections: OnboardingSelections | null,
    completed: boolean,
  ) => {
    if (!user) return
    setIsSaving(true)
    try {
      await supabase
        .from("discover_preferences")
        .upsert({
          user_id: user.id,
          mode: "auto",
          onboarding_completed: completed,
          seed_genres: selections?.genres ?? [],
          seed_areas: selections?.areas ?? [],
          seed_scenes: selections?.scenes ?? [],
          auto_areas: selections?.areas ?? [],
          auto_scenes: selections?.scenes ?? [],
          updated_at: new Date().toISOString(),
        })

      await mutate(`discover-prefs-${user.id}`)
    } finally {
      setIsSaving(false)
    }
  }, [user, supabase])

  const completeOnboarding = useCallback(async (selections: OnboardingSelections) => {
    await savePreferences(selections, true)
  }, [savePreferences])

  const skipOnboarding = useCallback(async () => {
    await savePreferences(null, true)
  }, [savePreferences])

  return {
    needsOnboarding,
    recordCount: recordCount ?? null,
    seedFromRecords: seedFromRecords ?? null,
    completeOnboarding,
    skipOnboarding,
    isSaving,
  }
}
