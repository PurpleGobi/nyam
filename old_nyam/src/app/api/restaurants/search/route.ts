import { NextRequest, NextResponse } from "next/server"
import { searchRestaurantsByKeyword } from "@/infrastructure/api/kakao-local"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get("q")
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!query) {
    return NextResponse.json({ error: "query (q) is required" }, { status: 400 })
  }

  const places = await searchRestaurantsByKeyword(
    query,
    lat ? Number(lat) : undefined,
    lng ? Number(lng) : undefined,
  )

  return NextResponse.json({ places })
}
