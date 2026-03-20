"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"

export interface StyleDnaEntry {
  recordCount: number
  avgRating: number | null
  recencyScore: number
  consistencyScore: number
  firstRecordAt: string | null
  lastRecordAt: string | null
}

export interface StyleDnaGenre extends StyleDnaEntry {
  genre: string
  subGenreCount: number
}

export interface StyleDnaArea extends StyleDnaEntry {
  area: string
  uniqueRestaurants: number
}

export interface StyleDnaScene extends StyleDnaEntry {
  scene: string
  uniqueRestaurants: number
}

export interface StyleDnaWineVariety extends StyleDnaEntry {
  variety: string
}

export interface StyleDnaWineRegion extends StyleDnaEntry {
  region: string
}

export interface StyleDnaWineType extends StyleDnaEntry {
  type: string
}

export interface StyleDnaCookingGenre extends StyleDnaEntry {
  genre: string
}

export interface StyleDnaCookingScene extends StyleDnaEntry {
  scene: string
}

export interface RestaurantStyleDna {
  genres: StyleDnaGenre[]
  areas: StyleDnaArea[]
  scenes: StyleDnaScene[]
}

export interface WineStyleDna {
  varieties: StyleDnaWineVariety[]
  regions: StyleDnaWineRegion[]
  types: StyleDnaWineType[]
  scenes: StyleDnaScene[]
}

export interface CookingStyleDna {
  genres: StyleDnaCookingGenre[]
  scenes: StyleDnaCookingScene[]
}

function mapBaseEntry(data: Record<string, unknown>): StyleDnaEntry {
  return {
    recordCount: data.record_count as number,
    avgRating: data.avg_rating as number | null,
    recencyScore: data.recency_score as number,
    consistencyScore: data.consistency_score as number,
    firstRecordAt: data.first_record_at as string | null,
    lastRecordAt: data.last_record_at as string | null,
  }
}

export function useStyleDna(userId: string | null) {
  const supabase = createClient()

  const { data: restaurant } = useSWR<RestaurantStyleDna | null>(
    userId ? `style-dna-restaurant/${userId}` : null,
    async () => {
      if (!userId) return null

      const [genresResult, areasResult, scenesResult] = await Promise.all([
        supabase
          .from("style_dna_restaurant_genres")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_restaurant_areas")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_restaurant_scenes")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
      ])

      return {
        genres: (genresResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          genre: d.genre as string,
          subGenreCount: d.sub_genre_count as number,
        })),
        areas: (areasResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          area: d.area as string,
          uniqueRestaurants: d.unique_restaurants as number,
        })),
        scenes: (scenesResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          scene: d.scene as string,
          uniqueRestaurants: d.unique_restaurants as number,
        })),
      }
    },
  )

  const { data: wine } = useSWR<WineStyleDna | null>(
    userId ? `style-dna-wine/${userId}` : null,
    async () => {
      if (!userId) return null

      const [varietiesResult, regionsResult, typesResult, scenesResult] = await Promise.all([
        supabase
          .from("style_dna_wine_varieties")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_wine_regions")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_wine_types")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_wine_scenes")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
      ])

      return {
        varieties: (varietiesResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          variety: d.variety as string,
        })),
        regions: (regionsResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          region: d.region as string,
        })),
        types: (typesResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          type: d.type as string,
        })),
        scenes: (scenesResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          scene: d.scene as string,
          uniqueRestaurants: d.unique_restaurants as number,
        })),
      }
    },
  )

  const { data: cooking } = useSWR<CookingStyleDna | null>(
    userId ? `style-dna-cooking/${userId}` : null,
    async () => {
      if (!userId) return null

      const [genresResult, scenesResult] = await Promise.all([
        supabase
          .from("style_dna_cooking_genres")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
        supabase
          .from("style_dna_cooking_scenes")
          .select("*")
          .eq("user_id", userId)
          .order("record_count", { ascending: false }),
      ])

      return {
        genres: (genresResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          genre: d.genre as string,
        })),
        scenes: (scenesResult.data ?? []).map((d) => ({
          ...mapBaseEntry(d),
          scene: d.scene as string,
        })),
      }
    },
  )

  return {
    restaurant: restaurant ?? null,
    wine: wine ?? null,
    cooking: cooking ?? null,
  }
}
