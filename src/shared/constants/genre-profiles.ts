import type { TasteProfileAxis } from "@/domain/entities/discover"

/**
 * Default taste profiles by genre.
 * Used when a restaurant has no internal record_taste_profiles.
 * Values are approximate genre averages (0-100 scale).
 */
export const GENRE_DEFAULT_PROFILES: Record<string, TasteProfileAxis> = {
  korean: { spicy: 60, sweet: 40, salty: 55, sour: 30, umami: 60, rich: 50 },
  chinese: { spicy: 45, sweet: 35, salty: 55, sour: 25, umami: 65, rich: 60 },
  japanese: { spicy: 15, sweet: 30, salty: 50, sour: 25, umami: 65, rich: 45 },
  western: { spicy: 20, sweet: 35, salty: 45, sour: 30, umami: 55, rich: 60 },
  chicken: { spicy: 50, sweet: 35, salty: 55, sour: 15, umami: 45, rich: 55 },
  pizza: { spicy: 25, sweet: 30, salty: 55, sour: 25, umami: 55, rich: 60 },
  burger: { spicy: 20, sweet: 30, salty: 50, sour: 20, umami: 55, rich: 65 },
  snack: { spicy: 45, sweet: 35, salty: 50, sour: 20, umami: 45, rich: 40 },
  jokbal: { spicy: 30, sweet: 25, salty: 50, sour: 15, umami: 60, rich: 55 },
  stew: { spicy: 55, sweet: 30, salty: 55, sour: 25, umami: 65, rich: 50 },
  katsu: { spicy: 10, sweet: 25, salty: 45, sour: 20, umami: 50, rich: 55 },
  bbq: { spicy: 30, sweet: 35, salty: 50, sour: 20, umami: 65, rich: 60 },
  seafood: { spicy: 25, sweet: 20, salty: 50, sour: 30, umami: 65, rich: 45 },
  asian: { spicy: 50, sweet: 40, salty: 50, sour: 35, umami: 55, rich: 45 },
  cafe: { spicy: 5, sweet: 65, salty: 15, sour: 25, umami: 20, rich: 45 },
  salad: { spicy: 10, sweet: 30, salty: 25, sour: 40, umami: 20, rich: 15 },
  lunchbox: { spicy: 30, sweet: 30, salty: 45, sour: 20, umami: 45, rich: 40 },
} as const

/**
 * Get taste profile for a genre. Returns default mid-range profile if genre not found.
 */
export function getGenreProfile(genre: string): TasteProfileAxis {
  return GENRE_DEFAULT_PROFILES[genre] ?? { spicy: 40, sweet: 40, salty: 40, sour: 30, umami: 45, rich: 45 }
}
