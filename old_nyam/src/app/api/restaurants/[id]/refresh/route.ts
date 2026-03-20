import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/infrastructure/supabase/server"
import { createAdminClient } from "@/infrastructure/supabase/admin"
import { searchRestaurantsByKeyword } from "@/infrastructure/api/kakao-local"
import { extractArea } from "@/shared/constants/areas"

const STALE_TTL_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single()

  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Already confirmed closed
  if (restaurant.is_closed) {
    return NextResponse.json({ fresh: true, isClosed: true })
  }

  // Stale check: skip if synced within 14 days
  const syncedAt = restaurant.synced_at ? new Date(restaurant.synced_at as string).getTime() : 0
  if (Date.now() - syncedAt < STALE_TTL_MS) {
    return NextResponse.json({ fresh: true, isClosed: false })
  }

  // Cannot refresh non-Kakao restaurants
  if (!restaurant.external_id || restaurant.source !== "kakao") {
    return NextResponse.json({ fresh: true, isClosed: false })
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
      // Not found in search results → mark as closed
      await admin.from("restaurants").update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      }).eq("id", id)
      return NextResponse.json({ fresh: true, isClosed: true })
    }

    // Update with fresh data
    await admin.from("restaurants").update({
      name: matched.name,
      address: matched.address,
      phone: matched.phone || (restaurant.phone as string | null),
      latitude: matched.latitude,
      longitude: matched.longitude,
      region: extractArea(matched.addressName) ?? (restaurant.region as string | null),
      synced_at: new Date().toISOString(),
      is_closed: false,
      closed_at: null,
    }).eq("id", id)

    return NextResponse.json({ fresh: true, isClosed: false, updated: true })
  } catch {
    // API failure — keep existing data (don't update synced_at → retry next time)
    return NextResponse.json({ fresh: false, error: "Kakao API failed" })
  }
}
