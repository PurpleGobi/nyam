import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
      const { data: currentDna } = await supabase
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

      await supabase.from(dnaTable).upsert({
        user_id: user.id,
        ...updateData,
      }, { onConflict: "user_id" })
    }
  }

  if (record.record_type === "wine" && tasteProfile) {
    const { data: currentDna } = await supabase
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

    await supabase.from("taste_dna_wine").upsert({
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
      const { data: existing } = await supabase
        .from(styleDnaGenreTable)
        .select("*")
        .eq("user_id", user.id)
        .eq(genreColumn, record.genre)
        .single()

      if (existing) {
        await supabase.from(styleDnaGenreTable).update({
          record_count: (existing.record_count ?? 0) + 1,
          last_record_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq(genreColumn, record.genre)
      } else {
        await supabase.from(styleDnaGenreTable).insert({
          user_id: user.id,
          [genreColumn]: record.genre,
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
      const { data: existing } = await supabase
        .from(styleDnaSceneTable)
        .select("*")
        .eq("user_id", user.id)
        .eq("scene", record.scene)
        .single()

      if (existing) {
        await supabase.from(styleDnaSceneTable).update({
          record_count: (existing.record_count ?? 0) + 1,
          last_record_at: new Date().toISOString(),
        }).eq("user_id", user.id).eq("scene", record.scene)
      } else {
        await supabase.from(styleDnaSceneTable).insert({
          user_id: user.id,
          scene: record.scene,
          record_count: 1,
          first_record_at: new Date().toISOString(),
          last_record_at: new Date().toISOString(),
        })
      }
    }
  }

  // Update user_stats
  try {
    await supabase.rpc("increment_user_stats", { p_user_id: user.id })
  } catch {
    // Fallback if RPC doesn't exist: manual update
    await supabase.from("user_stats").upsert({
      user_id: user.id,
      total_records: 1,
    }, { onConflict: "user_id" })
  }

  return NextResponse.json({ success: true })
}
