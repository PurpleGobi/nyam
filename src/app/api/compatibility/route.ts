import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

interface FlavorVector {
  spicy: number
  sweet: number
  salty: number
  sour: number
  umami: number
  rich: number
}

/**
 * Calculates cosine similarity between two flavor vectors.
 * Returns a value between 0 and 1.
 */
function cosineSimilarity(a: FlavorVector, b: FlavorVector): number {
  const keys: (keyof FlavorVector)[] = ["spicy", "sweet", "salty", "sour", "umami", "rich"]

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (const key of keys) {
    dotProduct += a[key] * b[key]
    magnitudeA += a[key] * a[key]
    magnitudeB += b[key] * b[key]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) return 0

  return dotProduct / (magnitudeA * magnitudeB)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { targetUserId } = await request.json() as { targetUserId?: string }

  if (!targetUserId) {
    return NextResponse.json(
      { success: false, error: "targetUserId is required" },
      { status: 400 },
    )
  }

  if (targetUserId === user.id) {
    return NextResponse.json(
      { success: false, error: "Cannot compare with yourself" },
      { status: 400 },
    )
  }

  // Fetch both users' taste DNA
  const { data: myDna } = await supabase
    .from("taste_dna_restaurant")
    .select("flavor_spicy, flavor_sweet, flavor_salty, flavor_sour, flavor_umami, flavor_rich")
    .eq("user_id", user.id)
    .single()

  const { data: targetDna } = await supabase
    .from("taste_dna_restaurant")
    .select("flavor_spicy, flavor_sweet, flavor_salty, flavor_sour, flavor_umami, flavor_rich")
    .eq("user_id", targetUserId)
    .single()

  if (!myDna) {
    return NextResponse.json({
      success: false,
      error: "Your taste DNA is not available yet. Record more meals first.",
    })
  }

  if (!targetDna) {
    return NextResponse.json({
      success: false,
      error: "Target user's taste DNA is not available.",
    })
  }

  const myVector: FlavorVector = {
    spicy: myDna.flavor_spicy,
    sweet: myDna.flavor_sweet,
    salty: myDna.flavor_salty,
    sour: myDna.flavor_sour,
    umami: myDna.flavor_umami,
    rich: myDna.flavor_rich,
  }

  const targetVector: FlavorVector = {
    spicy: targetDna.flavor_spicy,
    sweet: targetDna.flavor_sweet,
    salty: targetDna.flavor_salty,
    sour: targetDna.flavor_sour,
    umami: targetDna.flavor_umami,
    rich: targetDna.flavor_rich,
  }

  const flavorSimilarity = cosineSimilarity(myVector, targetVector)
  const score = Math.round(flavorSimilarity * 100)

  return NextResponse.json({
    success: true,
    score,
    breakdown: {
      flavorSimilarity: Math.round(flavorSimilarity * 100),
    },
  })
}
