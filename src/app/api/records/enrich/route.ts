import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { searchRestaurantsByKeyword } from "@/infrastructure/api/kakao-local"
import { extractArea } from "@/shared/constants/areas"
import { FOOD_CATEGORIES } from "@/shared/constants/categories"

const STALE_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

function mapCategoryToGenre(categoryName: string): string | null {
  const lower = categoryName.toLowerCase()
  const mapping: Array<{ keywords: string[]; genre: string }> = [
    { keywords: ["한식"], genre: "korean" },
    { keywords: ["중식", "중국"], genre: "chinese" },
    { keywords: ["일식", "일본"], genre: "japanese" },
    { keywords: ["양식", "이탈리"], genre: "western" },
    { keywords: ["치킨"], genre: "chicken" },
    { keywords: ["피자"], genre: "pizza" },
    { keywords: ["버거", "햄버거"], genre: "burger" },
    { keywords: ["분식"], genre: "snack" },
    { keywords: ["족발", "보쌈"], genre: "jokbal" },
    { keywords: ["찌개", "탕", "국밥"], genre: "stew" },
    { keywords: ["돈까스", "돈카츠"], genre: "katsu" },
    { keywords: ["고기", "구이", "삼겹", "갈비"], genre: "bbq" },
    { keywords: ["해산물", "횟집", "수산"], genre: "seafood" },
    { keywords: ["아시안", "베트남", "태국"], genre: "asian" },
    { keywords: ["카페", "디저트", "베이커리"], genre: "cafe" },
    { keywords: ["샐러드"], genre: "salad" },
  ]
  const validGenres = new Set<string>(FOOD_CATEGORIES.map((c) => c.value))
  for (const { keywords, genre } of mapping) {
    if (keywords.some((k) => lower.includes(k)) && validGenres.has(genre)) {
      return genre
    }
  }
  return null
}

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
    .select("*")
    .eq("id", recordId)
    .eq("user_id", user.id)
    .single()

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }

  // Only restaurant type needs Kakao enrichment
  if (record.record_type !== "restaurant") {
    return NextResponse.json({ success: true, skipped: true })
  }

  if (!record.restaurant_id) {
    return NextResponse.json({ success: true, skipped: true, reason: "no restaurant linked" })
  }

  const admin = createAdminClient()

  // Get restaurant data
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", record.restaurant_id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ success: true, skipped: true, reason: "restaurant not found" })
  }

  if (!restaurant.external_id || restaurant.source !== "kakao") {
    return NextResponse.json({ success: true, skipped: true, reason: "no kakao external_id" })
  }

  // Stale check: skip if synced within 14 days (Lazy Refresh policy)
  const syncedAt = restaurant.synced_at ? new Date(restaurant.synced_at as string).getTime() : 0
  if (Date.now() - syncedAt < STALE_TTL_MS && syncedAt > 0) {
    return NextResponse.json({ success: true, skipped: true, reason: "restaurant data is fresh" })
  }

  // Kakao keyword search → external_id matching
  try {
    const places = await searchRestaurantsByKeyword(
      restaurant.name as string,
      restaurant.latitude as number | undefined,
      restaurant.longitude as number | undefined,
    )
    const matched = places.find((p) => p.externalId === restaurant.external_id)

    if (!matched) {
      // Not found in Kakao search — may be closed. Mark as closed.
      await admin.from("restaurants").update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      }).eq("id", restaurant.id)
      return NextResponse.json({ success: true, skipped: true, reason: "kakao match not found, marked closed" })
    }

    // Update restaurant with fresh Kakao data
    const region = extractArea(matched.addressName) ?? (restaurant.region as string | null)
    const genreKey = mapCategoryToGenre(matched.categoryName)

    await admin.from("restaurants").update({
      address: matched.address,
      phone: matched.phone || (restaurant.phone as string | null),
      region,
      synced_at: new Date().toISOString(),
      is_closed: false,
      closed_at: null,
    }).eq("id", restaurant.id)

    // Update record genre if empty
    if (!record.genre && genreKey) {
      await admin.from("records").update({ genre: genreKey }).eq("id", recordId)
    }

    return NextResponse.json({ success: true, updated: true })
  } catch {
    // Kakao API failure — keep existing data, don't update synced_at so retry happens next time
    return NextResponse.json({ success: true, skipped: true, reason: "kakao API failed" })
  }
}
