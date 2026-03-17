import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { scene, location } = await request.json() as {
    scene?: string
    location?: { lat: number; lng: number }
  }

  // Get user's taste DNA for recommendation
  const { data: tasteDna } = await supabase
    .from("taste_dna_restaurant")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!tasteDna || tasteDna.sample_count < 5) {
    return NextResponse.json({
      success: false,
      error: "5개 이상의 기록이 필요합니다",
      minRecords: 5,
    })
  }

  // For now, return a placeholder recommendation
  return NextResponse.json({
    success: true,
    recommendations: [],
    message: "AI 추천 기능은 준비 중입니다",
    tasteDna: {
      spicy: tasteDna.flavor_spicy,
      sweet: tasteDna.flavor_sweet,
      salty: tasteDna.flavor_salty,
      sour: tasteDna.flavor_sour,
      umami: tasteDna.flavor_umami,
      rich: tasteDna.flavor_rich,
    },
    filters: { scene, location },
  })
}
