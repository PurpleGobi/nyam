import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { searchAndCacheRestaurants } from '@/infrastructure/api/restaurant-search-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('query') ?? undefined
  const region = searchParams.get('region') ?? undefined
  const cuisineCategory = searchParams.get('category') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '15', 10)

  try {
    const { restaurantIds, total, hasMore } = await searchAndCacheRestaurants({
      query,
      region: region === '전체' ? undefined : region,
      cuisineCategory,
      page,
      limit,
    })

    return NextResponse.json({ restaurantIds, total, hasMore })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    console.error('Restaurant search error:', message)

    // Return empty results instead of error for missing API keys
    if (message.includes('not configured')) {
      return NextResponse.json({ restaurantIds: [], total: 0, hasMore: false })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
