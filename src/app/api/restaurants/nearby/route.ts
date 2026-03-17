import { NextRequest, NextResponse } from "next/server"
import { searchNearbyRestaurants } from "@/infrastructure/api/kakao-local"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const radius = searchParams.get("radius")

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 })
  }

  const places = await searchNearbyRestaurants(
    Number(lat),
    Number(lng),
    radius ? Number(radius) : undefined,
  )

  return NextResponse.json({ places })
}
