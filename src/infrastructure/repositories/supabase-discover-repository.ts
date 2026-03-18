import type { SupabaseClient } from "@supabase/supabase-js"
import type { DiscoverFeedbackInput } from "@/domain/entities/discover"
import type { DiscoverRepository, InternalCandidate } from "@/domain/repositories/discover-repository"

export class SupabaseDiscoverRepository implements DiscoverRepository {
  constructor(private supabase: SupabaseClient) {}

  async getInternalCandidates(
    externalIds: string[],
  ): Promise<InternalCandidate[]> {
    if (externalIds.length === 0) return []

    // Fetch restaurants matching kakao external_ids
    const { data: restaurants } = await this.supabase
      .from("restaurants")
      .select("id, external_id")
      .in("external_id", externalIds)

    if (!restaurants?.length) return []

    const restaurantMap = new Map(restaurants.map((r) => [r.id, r.external_id as string]))
    const restaurantIds = restaurants.map((r) => r.id as string)

    // Fetch public records for these restaurants
    const { data: records } = await this.supabase
      .from("records")
      .select("id, restaurant_id, rating_overall, genre, flavor_tags, texture_tags, atmosphere_tags")
      .in("restaurant_id", restaurantIds)
      .eq("visibility", "public")
      .eq("record_type", "restaurant")

    const recordIds = (records ?? []).map((r) => r.id as string)

    // Fetch taste profiles for these restaurants' records
    const { data: tasteProfiles } = recordIds.length > 0
      ? await this.supabase
          .from("record_taste_profiles")
          .select("record_id, spicy, sweet, salty, sour, umami, rich")
          .in("record_id", recordIds)
      : { data: [] as Array<Record<string, unknown>> }

    // Aggregate per restaurant
    const aggregated = new Map<string, {
      ratings: number[]
      genres: string[]
      flavorTags: string[]
      textureTags: string[]
      atmosphereTags: string[]
      tasteProfiles: Array<{
        spicy: number; sweet: number; salty: number
        sour: number; umami: number; rich: number
      }>
    }>()

    for (const record of records ?? []) {
      const restaurantId = record.restaurant_id as string
      if (!aggregated.has(restaurantId)) {
        aggregated.set(restaurantId, {
          ratings: [],
          genres: [],
          flavorTags: [],
          textureTags: [],
          atmosphereTags: [],
          tasteProfiles: [],
        })
      }
      const agg = aggregated.get(restaurantId)!
      if (record.rating_overall != null) agg.ratings.push(record.rating_overall as number)
      if (record.genre) agg.genres.push(record.genre as string)
      agg.flavorTags.push(...((record.flavor_tags as string[]) ?? []))
      agg.textureTags.push(...((record.texture_tags as string[]) ?? []))
      agg.atmosphereTags.push(...((record.atmosphere_tags as string[]) ?? []))
    }

    // Map taste profiles to restaurants
    const recordToRestaurant = new Map<string, string>()
    for (const record of records ?? []) {
      recordToRestaurant.set(record.id as string ?? "", record.restaurant_id as string)
    }

    for (const tp of tasteProfiles ?? []) {
      const restaurantId = recordToRestaurant.get(tp.record_id as string)
      if (restaurantId && aggregated.has(restaurantId)) {
        aggregated.get(restaurantId)!.tasteProfiles.push({
          spicy: tp.spicy as number,
          sweet: tp.sweet as number,
          salty: tp.salty as number,
          sour: tp.sour as number,
          umami: tp.umami as number,
          rich: tp.rich as number,
        })
      }
    }

    const results: InternalCandidate[] = []
    for (const [restaurantId, agg] of aggregated) {
      const externalId = restaurantMap.get(restaurantId)
      if (!externalId) continue

      const avgRating = agg.ratings.length > 0
        ? Math.round(agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length)
        : null

      // Average taste profiles
      let tasteProfile = null
      if (agg.tasteProfiles.length > 0) {
        const avg = (axis: keyof typeof agg.tasteProfiles[0]) =>
          Math.round(agg.tasteProfiles.reduce((sum, tp) => sum + tp[axis], 0) / agg.tasteProfiles.length)
        tasteProfile = {
          spicy: avg("spicy"), sweet: avg("sweet"), salty: avg("salty"),
          sour: avg("sour"), umami: avg("umami"), rich: avg("rich"),
        }
      }

      // Most common genre
      const genreCounts = new Map<string, number>()
      for (const g of agg.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1)
      const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      results.push({
        externalId,
        avgRating,
        recordCount: agg.ratings.length,
        tasteProfile,
        flavorTags: [...new Set(agg.flavorTags)],
        textureTags: [...new Set(agg.textureTags)],
        atmosphereTags: [...new Set(agg.atmosphereTags)],
        genre: topGenre,
      })
    }

    return results
  }

  async getUserVisitedRestaurants(userId: string, externalIds: string[]): Promise<Set<string>> {
    if (externalIds.length === 0) return new Set()

    const { data: restaurants } = await this.supabase
      .from("restaurants")
      .select("id, external_id")
      .in("external_id", externalIds)

    if (!restaurants?.length) return new Set()

    const restaurantIds = restaurants.map((r) => r.id as string)
    const idToExternal = new Map(restaurants.map((r) => [r.id as string, r.external_id as string]))

    const { data: records } = await this.supabase
      .from("records")
      .select("restaurant_id")
      .eq("user_id", userId)
      .in("restaurant_id", restaurantIds)

    const visited = new Set<string>()
    for (const record of records ?? []) {
      const extId = idToExternal.get(record.restaurant_id as string)
      if (extId) visited.add(extId)
    }
    return visited
  }

  async getUserRecordCount(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from("records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("record_type", "restaurant")

    return count ?? 0
  }

  async saveFeedback(userId: string, input: DiscoverFeedbackInput): Promise<void> {
    const { error } = await this.supabase
      .from("discover_feedback")
      .insert({
        user_id: userId,
        restaurant_name: input.restaurantName,
        kakao_id: input.kakaoId,
        feedback: input.feedback,
        reason: input.reason ?? null,
        query_context: input.queryContext ?? null,
      })

    if (error) throw new Error(`Failed to save feedback: ${error.message}`)
  }

  async getBlacklistedRestaurants(userId: string): Promise<Set<string>> {
    // Restaurants with 3+ bad feedback from this user
    const { data } = await this.supabase
      .from("discover_feedback")
      .select("kakao_id")
      .eq("user_id", userId)
      .eq("feedback", "bad")
      .not("kakao_id", "is", null)

    if (!data?.length) return new Set()

    const counts = new Map<string, number>()
    for (const row of data) {
      const id = row.kakao_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    const blacklisted = new Set<string>()
    for (const [id, count] of counts) {
      if (count >= 3) blacklisted.add(id)
    }
    return blacklisted
  }
}
