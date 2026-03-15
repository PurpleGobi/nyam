import { NextRequest, NextResponse } from "next/server"

import type { FilterState } from "@/types"
import { searchRestaurants } from "@/lib/tavily"
import { parseRestaurantsFromResults } from "@/lib/parse-restaurants"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<FilterState>

    const filters: FilterState = {
      areas: body.areas ?? [],
      partySize: body.partySize ?? "",
      cuisines: body.cuisines ?? [],
      occasions: body.occasions ?? [],
      priceRange: body.priceRange ?? [],
      moods: body.moods ?? [],
      options: {
        parking: body.options?.parking ?? false,
        reservation: body.options?.reservation ?? false,
        noWaiting: body.options?.noWaiting ?? false,
      },
    }

    const { results, answers } = await searchRestaurants(filters)

    const restaurants = parseRestaurantsFromResults(results, answers, {
      areas: filters.areas,
      cuisines: filters.cuisines,
    })

    return NextResponse.json({
      restaurants,
      total: restaurants.length,
      query: filters,
    })
  } catch (error) {
    console.error("[recommend] Search failed:", error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Internal server error"
    const status = message.includes("rate") || message.includes("429") ? 429 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
