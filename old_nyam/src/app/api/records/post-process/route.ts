import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { calculateNyamLevel, collectXpBonuses, calculateConsecutiveDays } from "@/shared/utils/xp"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { recordId } = await request.json() as { recordId: string }

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  const { data: record } = await supabase
    .from("records")
    .select("*, record_taste_profiles(*)")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  const tasteProfiles = record.record_taste_profiles as Array<Record<string, unknown>> | null
  const tasteProfile = tasteProfiles?.[0]

  // Update Taste DNA based on record type
  if (record.record_type === "restaurant" || record.record_type === "cooking") {
    const dnaTable = record.record_type === "restaurant"
      ? "taste_dna_restaurant"
      : "taste_dna_cooking"

    if (tasteProfile) {
      const { data: currentDna } = await admin
        .from(dnaTable)
        .select("*")
        .eq("user_id", user.id)
        .single()

      const sampleCount = (currentDna?.sample_count ?? 0) + 1
      const alpha = 1 / sampleCount

      const axes = ["spicy", "sweet", "salty", "sour", "umami", "rich"] as const
      const updateData: Record<string, unknown> = { sample_count: sampleCount }

      for (const axis of axes) {
        const currentValue = (currentDna?.[`flavor_${axis}`] as number) ?? 50
        const newValue = (tasteProfile[axis] as number) ?? 50
        const ratingWeight = (record.rating_overall as number ?? 50) / 100
        updateData[`flavor_${axis}`] = currentValue + alpha * (newValue * ratingWeight - currentValue)
      }

      await admin.from(dnaTable).upsert({
        user_id: user.id,
        ...updateData,
      }, { onConflict: "user_id" })
    }
  }

  if (record.record_type === "wine" && tasteProfile) {
    const { data: currentDna } = await admin
      .from("taste_dna_wine")
      .select("*")
      .eq("user_id", user.id)
      .single()

    const sampleCount = (currentDna?.sample_count ?? 0) + 1
    const alpha = 1 / sampleCount

    const axes = ["acidity", "body", "tannin", "sweetness", "balance", "finish", "aroma"] as const
    const updateData: Record<string, unknown> = { sample_count: sampleCount }

    for (const axis of axes) {
      const currentValue = (currentDna?.[`pref_${axis}`] as number) ?? 50
      const newValue = (tasteProfile[`wine_${axis}`] as number) ?? 50
      const ratingWeight = (record.rating_overall as number ?? 50) / 100
      updateData[`pref_${axis}`] = currentValue + alpha * (newValue * ratingWeight - currentValue)
    }

    await admin.from("taste_dna_wine").upsert({
      user_id: user.id,
      ...updateData,
    }, { onConflict: "user_id" })
  }

  // Update Style DNA - genre
  if (record.genre) {
    const styleDnaGenreTable = {
      restaurant: "style_dna_restaurant_genres",
      wine: "style_dna_wine_varieties",
      cooking: "style_dna_cooking_genres",
    }[record.record_type as string]

    const genreColumn = record.record_type === "wine" ? "variety" : "genre"

    if (styleDnaGenreTable) {
      const { data: existing } = await admin
        .from(styleDnaGenreTable)
        .select("*")
        .eq("user_id", user.id)
        .eq(genreColumn, record.genre)
        .single()

      if (existing) {
        await admin.from(styleDnaGenreTable).update({
          record_count: (existing.record_count ?? 0) + 1,
          last_record_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq(genreColumn, record.genre)
      } else {
        await admin.from(styleDnaGenreTable).insert({
          user_id: user.id,
          [genreColumn]: record.genre,
          record_count: 1,
          first_record_at: new Date().toISOString(),
          last_record_at: new Date().toISOString(),
        })
      }
    }
  }

  // Update Style DNA - area (restaurant only)
  if (record.record_type === "restaurant" && record.restaurant_id) {
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("region")
      .eq("id", record.restaurant_id)
      .single()

    if (restaurant?.region) {
      const { data: existing } = await admin
        .from("style_dna_restaurant_areas")
        .select("*")
        .eq("user_id", user.id)
        .eq("area", restaurant.region)
        .single()

      if (existing) {
        await admin.from("style_dna_restaurant_areas").update({
          record_count: (existing.record_count ?? 0) + 1,
          last_record_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq("area", restaurant.region)
      } else {
        await admin.from("style_dna_restaurant_areas").insert({
          user_id: user.id,
          area: restaurant.region,
          record_count: 1,
          first_record_at: new Date().toISOString(),
          last_record_at: new Date().toISOString(),
        })
      }
    }
  }

  // Update Style DNA - scene
  if (record.scene) {
    const styleDnaSceneTable = {
      restaurant: "style_dna_restaurant_scenes",
      wine: "style_dna_wine_scenes",
      cooking: "style_dna_cooking_scenes",
    }[record.record_type as string]

    if (styleDnaSceneTable) {
      const { data: existing } = await admin
        .from(styleDnaSceneTable)
        .select("*")
        .eq("user_id", user.id)
        .eq("scene", record.scene)
        .single()

      if (existing) {
        await admin.from(styleDnaSceneTable).update({
          record_count: (existing.record_count ?? 0) + 1,
          last_record_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq("scene", record.scene)
      } else {
        await admin.from(styleDnaSceneTable).insert({
          user_id: user.id,
          scene: record.scene,
          record_count: 1,
          first_record_at: new Date().toISOString(),
          last_record_at: new Date().toISOString(),
        })
      }
    }
  }

  // Mark AI analysis complete — ready for Phase 2 review
  await admin.from("records").update({
    phase_status: 2,
  }).eq("id", recordId)

  // Update user_stats with Phase 1 XP + bonuses
  let xpEarned = 5 // Phase 1 base XP

  // Photo count for bonus check
  const { count: photoCount } = await admin
    .from("record_photos")
    .select("*", { count: "exact", head: true })
    .eq("record_id", recordId)

  // Consecutive days
  const { data: recentRecords } = await admin
    .from("records")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30)

  // New genre check
  const { count: genreCount } = await admin
    .from("records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("genre", record.genre)

  const xpBonuses = collectXpBonuses({
    isNewGenre: (genreCount ?? 0) <= 1,
    consecutiveDays: calculateConsecutiveDays(
      recentRecords?.map((r) => r.created_at as string) ?? [],
    ),
    photoTypeCount: photoCount ?? 0,
  })
  xpEarned += xpBonuses.reduce((sum, b) => sum + b.points, 0)

  // Read current stats
  const { data: stats } = await admin
    .from("user_stats")
    .select("points, total_records")
    .eq("user_id", user.id)
    .single()

  const currentPoints = (stats?.points as number) ?? 0
  const newPoints = currentPoints + xpEarned

  await admin.from("user_stats").upsert({
    user_id: user.id,
    points: newPoints,
    nyam_level: calculateNyamLevel(newPoints),
    total_records: ((stats?.total_records as number) ?? 0) + 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  // Record phase completion
  await admin.from("phase_completions").insert({
    record_id: recordId,
    user_id: user.id,
    phase: 1,
    xp_earned: xpEarned,
  })

  return NextResponse.json({ success: true })
}
