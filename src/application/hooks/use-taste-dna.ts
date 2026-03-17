"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"

export interface TasteDnaRestaurant {
  flavorSpicy: number
  flavorSweet: number
  flavorSalty: number
  flavorSour: number
  flavorUmami: number
  flavorRich: number
  tasteTypeCode: string | null
  tasteTypeName: string | null
  sampleCount: number
}

export interface TasteDnaWine {
  prefAcidity: number
  prefBody: number
  prefTannin: number
  prefSweetness: number
  prefBalance: number
  prefFinish: number
  prefAroma: number
  dnaSummary: string | null
  sampleCount: number
}

export function useTasteDna(userId: string | null) {
  const supabase = createClient()

  const { data: restaurant } = useSWR<TasteDnaRestaurant | null>(
    userId ? `taste-dna-restaurant-${userId}` : null,
    async () => {
      if (!userId) return null
      const { data } = await supabase
        .from("taste_dna_restaurant")
        .select("*")
        .eq("user_id", userId)
        .single()
      if (!data) return null
      return {
        flavorSpicy: data.flavor_spicy,
        flavorSweet: data.flavor_sweet,
        flavorSalty: data.flavor_salty,
        flavorSour: data.flavor_sour,
        flavorUmami: data.flavor_umami,
        flavorRich: data.flavor_rich,
        tasteTypeCode: data.taste_type_code,
        tasteTypeName: data.taste_type_name,
        sampleCount: data.sample_count,
      }
    },
  )

  const { data: wine } = useSWR<TasteDnaWine | null>(
    userId ? `taste-dna-wine-${userId}` : null,
    async () => {
      if (!userId) return null
      const { data } = await supabase
        .from("taste_dna_wine")
        .select("*")
        .eq("user_id", userId)
        .single()
      if (!data) return null
      return {
        prefAcidity: data.pref_acidity,
        prefBody: data.pref_body,
        prefTannin: data.pref_tannin,
        prefSweetness: data.pref_sweetness,
        prefBalance: data.pref_balance,
        prefFinish: data.pref_finish,
        prefAroma: data.pref_aroma,
        dnaSummary: data.dna_summary,
        sampleCount: data.sample_count,
      }
    },
  )

  return { restaurant: restaurant ?? null, wine: wine ?? null }
}
